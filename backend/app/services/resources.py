from datetime import datetime, timezone
from math import ceil
from typing import Literal, TypeVar
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.errors import ApiError
from app.models import (
    ApplicationStatus,
    ApplicationStatusHistory,
    Company,
    Interview,
    JobApplication,
    Reminder,
    User,
)
from app.schemas import (
    CompanyCreate,
    CompanyUpdate,
    InterviewCreate,
    InterviewUpdate,
    JobApplicationCreate,
    JobApplicationStatusUpdate,
    JobApplicationUpdate,
    ReminderCreate,
    ReminderUpdate,
)

ModelT = TypeVar("ModelT")


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise ApiError(
            409,
            "RESOURCE_CONFLICT",
            "The requested change conflicts with existing data.",
        ) from error
    except SQLAlchemyError:
        session.rollback()
        raise


def _get_company(session: Session, company_id: UUID, user_id: UUID) -> Company:
    company = session.scalar(
        select(Company).where(Company.id == company_id, Company.user_id == user_id)
    )
    if company is None:
        raise ApiError(404, "COMPANY_NOT_FOUND", "Company not found.")
    return company


def _get_application(
    session: Session, application_id: UUID, user_id: UUID
) -> JobApplication:
    application = session.scalar(
        select(JobApplication)
        .options(selectinload(JobApplication.company))
        .where(
            JobApplication.id == application_id,
            JobApplication.user_id == user_id,
        )
    )
    if application is None:
        raise ApiError(404, "APPLICATION_NOT_FOUND", "Job application not found.")
    return application


def _get_interview(session: Session, interview_id: UUID, user_id: UUID) -> Interview:
    interview = session.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == user_id,
        )
    )
    if interview is None:
        raise ApiError(404, "INTERVIEW_NOT_FOUND", "Interview not found.")
    return interview


def _get_reminder(session: Session, reminder_id: UUID, user_id: UUID) -> Reminder:
    reminder = session.scalar(
        select(Reminder).where(
            Reminder.id == reminder_id,
            Reminder.user_id == user_id,
        )
    )
    if reminder is None:
        raise ApiError(404, "REMINDER_NOT_FOUND", "Reminder not found.")
    return reminder


def _require_application(
    session: Session, application_id: UUID, user_id: UUID
) -> JobApplication:
    application = session.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == user_id,
        )
    )
    if application is None:
        raise ApiError(404, "APPLICATION_NOT_FOUND", "Job application not found.")
    return application


def _verify_company_owner(
    session: Session, company_id: UUID, user_id: UUID
) -> None:
    _get_company(session, company_id, user_id)


def _verify_salary(
    salary_min: object | None,
    salary_max: object | None,
    salary_currency: str | None,
) -> None:
    if (salary_min is not None or salary_max is not None) and salary_currency is None:
        raise ApiError(
            422,
            "INVALID_SALARY",
            "salary_currency is required when a salary is provided.",
        )
    if (
        salary_min is not None
        and salary_max is not None
        and salary_min > salary_max
    ):
        raise ApiError(422, "INVALID_SALARY", "salary_min cannot exceed salary_max.")


def _validate_timezone(value: datetime, field_name: str) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ApiError(
            422,
            "TIMEZONE_REQUIRED",
            f"{field_name} must include a timezone offset.",
        )


def create_company(
    session: Session, user: User, payload: CompanyCreate
) -> Company:
    company = Company(user_id=user.id, **payload.model_dump())
    session.add(company)
    _commit(session)
    return company


def list_companies(session: Session, user: User) -> list[Company]:
    return list(
        session.scalars(
            select(Company)
            .where(Company.user_id == user.id)
            .order_by(Company.name.asc(), Company.id.asc())
        )
    )


def get_company(session: Session, user: User, company_id: UUID) -> Company:
    return _get_company(session, company_id, user.id)


def update_company(
    session: Session, user: User, company_id: UUID, payload: CompanyUpdate
) -> Company:
    company = _get_company(session, company_id, user.id)
    for field, value in payload.model_dump().items():
        setattr(company, field, value)
    _commit(session)
    return company


def delete_company(session: Session, user: User, company_id: UUID) -> None:
    company = _get_company(session, company_id, user.id)
    has_applications = session.scalar(
        select(JobApplication.id)
        .where(
            JobApplication.company_id == company.id,
            JobApplication.user_id == user.id,
        )
        .limit(1)
    )
    if has_applications is not None:
        raise ApiError(
            409,
            "COMPANY_IN_USE",
            "Reassign or delete this company's applications before deleting it.",
        )
    session.delete(company)
    _commit(session)


def create_application(
    session: Session, user: User, payload: JobApplicationCreate
) -> JobApplication:
    _verify_company_owner(session, payload.company_id, user.id)
    _verify_salary(payload.salary_min, payload.salary_max, payload.salary_currency)
    values = payload.model_dump()
    values["status"] = payload.status.value
    application = JobApplication(user_id=user.id, **values)
    session.add(application)
    session.flush()
    session.add(
        ApplicationStatusHistory(
            user_id=user.id,
            application_id=application.id,
            status=application.status,
        )
    )
    _commit(session)
    return _get_application(session, application.id, user.id)


def list_applications(
    session: Session,
    user: User,
    page: int,
    page_size: int,
    status: ApplicationStatus | None,
    search: str | None,
    sort_by: Literal["application_date", "updated_at"],
    sort_order: Literal["asc", "desc"],
) -> tuple[list[JobApplication], int]:
    filters = [JobApplication.user_id == user.id]
    if status is not None:
        filters.append(JobApplication.status == status.value)
    if search is not None and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                JobApplication.job_title.ilike(pattern),
                Company.name.ilike(pattern),
            )
        )

    base_query = select(JobApplication).join(
        Company,
        (Company.id == JobApplication.company_id)
        & (Company.user_id == JobApplication.user_id),
    )
    total = session.scalar(
        select(func.count()).select_from(base_query.where(*filters).subquery())
    ) or 0
    sort_column = (
        JobApplication.application_date
        if sort_by == "application_date"
        else JobApplication.updated_at
    )
    sort_expression = (
        sort_column.asc().nulls_last()
        if sort_order == "asc"
        else sort_column.desc().nulls_last()
    )
    applications = list(
        session.scalars(
            base_query.options(selectinload(JobApplication.company))
            .where(*filters)
            .order_by(sort_expression, JobApplication.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return applications, total


def get_application(
    session: Session, user: User, application_id: UUID
) -> JobApplication:
    return _get_application(session, application_id, user.id)


def update_application(
    session: Session,
    user: User,
    application_id: UUID,
    payload: JobApplicationUpdate,
) -> JobApplication:
    application = _get_application(session, application_id, user.id)
    _verify_company_owner(session, payload.company_id, user.id)
    _verify_salary(payload.salary_min, payload.salary_max, payload.salary_currency)
    values = payload.model_dump()
    values["status"] = payload.status.value
    status_changed = application.status != values["status"]
    for field, value in values.items():
        setattr(application, field, value)
    if status_changed:
        session.add(
            ApplicationStatusHistory(
                user_id=user.id,
                application_id=application.id,
                status=application.status,
            )
        )
    _commit(session)
    return _get_application(session, application.id, user.id)


def update_application_status(
    session: Session,
    user: User,
    application_id: UUID,
    payload: JobApplicationStatusUpdate,
) -> JobApplication:
    application = _get_application(session, application_id, user.id)
    new_status = payload.status.value
    if application.status != new_status:
        application.status = new_status
        session.add(
            ApplicationStatusHistory(
                user_id=user.id,
                application_id=application.id,
                status=new_status,
            )
        )
        _commit(session)
    return _get_application(session, application.id, user.id)


def delete_application(session: Session, user: User, application_id: UUID) -> None:
    application = _get_application(session, application_id, user.id)
    session.delete(application)
    _commit(session)


def create_interview(
    session: Session, user: User, payload: InterviewCreate
) -> Interview:
    _require_application(session, payload.application_id, user.id)
    _validate_timezone(payload.scheduled_at, "scheduled_at")
    interview = Interview(user_id=user.id, **payload.model_dump())
    session.add(interview)
    _commit(session)
    return interview


def list_interviews(
    session: Session, user: User, application_id: UUID | None
) -> list[Interview]:
    query = select(Interview).where(Interview.user_id == user.id)
    if application_id is not None:
        _require_application(session, application_id, user.id)
        query = query.where(Interview.application_id == application_id)
    return list(
        session.scalars(query.order_by(Interview.scheduled_at.asc(), Interview.id))
    )


def update_interview(
    session: Session,
    user: User,
    interview_id: UUID,
    payload: InterviewUpdate,
) -> Interview:
    interview = _get_interview(session, interview_id, user.id)
    _require_application(session, payload.application_id, user.id)
    _validate_timezone(payload.scheduled_at, "scheduled_at")
    for field, value in payload.model_dump().items():
        setattr(interview, field, value)
    _commit(session)
    return interview


def delete_interview(session: Session, user: User, interview_id: UUID) -> None:
    interview = _get_interview(session, interview_id, user.id)
    session.delete(interview)
    _commit(session)


def create_reminder(
    session: Session, user: User, payload: ReminderCreate
) -> Reminder:
    _require_application(session, payload.application_id, user.id)
    _validate_timezone(payload.due_at, "due_at")
    reminder = Reminder(user_id=user.id, **payload.model_dump())
    session.add(reminder)
    _commit(session)
    return reminder


def list_reminders(
    session: Session,
    user: User,
    application_id: UUID | None,
    is_completed: bool | None,
    overdue: bool | None,
) -> list[Reminder]:
    query = select(Reminder).where(Reminder.user_id == user.id)
    if application_id is not None:
        _require_application(session, application_id, user.id)
        query = query.where(Reminder.application_id == application_id)
    if is_completed is not None:
        query = query.where(Reminder.is_completed == is_completed)
    if overdue is not None:
        now = datetime.now(timezone.utc)
        if overdue:
            query = query.where(Reminder.due_at < now, Reminder.is_completed.is_(False))
        else:
            query = query.where(
                or_(Reminder.due_at >= now, Reminder.is_completed.is_(True))
            )
    return list(session.scalars(query.order_by(Reminder.due_at.asc(), Reminder.id)))


def update_reminder(
    session: Session,
    user: User,
    reminder_id: UUID,
    payload: ReminderUpdate,
) -> Reminder:
    reminder = _get_reminder(session, reminder_id, user.id)
    values = payload.model_dump(exclude_unset=True)
    if "due_at" in values:
        due_at = values["due_at"]
        if due_at is None:
            raise ApiError(422, "INVALID_REMINDER", "due_at cannot be null.")
        _validate_timezone(due_at, "due_at")
    if "is_completed" in values and values["is_completed"] is None:
        raise ApiError(422, "INVALID_REMINDER", "is_completed cannot be null.")
    for field, value in values.items():
        setattr(reminder, field, value)
    _commit(session)
    return reminder


def delete_reminder(session: Session, user: User, reminder_id: UUID) -> None:
    reminder = _get_reminder(session, reminder_id, user.id)
    session.delete(reminder)
    _commit(session)


def page_count(total: int, page_size: int) -> int:
    return ceil(total / page_size) if total else 0
