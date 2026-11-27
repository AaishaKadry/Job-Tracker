from datetime import date, datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models import (
    ApplicationStatus,
    ApplicationStatusHistory,
    Company,
    Interview,
    JobApplication,
    Reminder,
    User,
)

ACTIVE_STATUSES = (
    ApplicationStatus.WISHLIST.value,
    ApplicationStatus.APPLIED.value,
    ApplicationStatus.ASSESSMENT.value,
    ApplicationStatus.INTERVIEW.value,
)


def _month_range(today: date) -> tuple[date, date, list[str]]:
    current_month = date(today.year, today.month, 1)
    months = []
    year, month = current_month.year, current_month.month
    for _ in range(11):
        month -= 1
        if month == 0:
            year -= 1
            month = 12
    for _ in range(12):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    next_year = current_month.year + (1 if current_month.month == 12 else 0)
    next_month = date(next_year, current_month.month % 12 + 1, 1)
    return date(int(months[0][:4]), int(months[0][5:]), 1), next_month, months


def _conversion_metric(
    reached_applied: int, reached_outcome: int
) -> dict[str, int | float | None]:
    rate = (
        round(reached_outcome * 100 / reached_applied, 2)
        if reached_applied
        else None
    )
    return {
        "applications_reached_applied": reached_applied,
        "applications_reached_outcome": reached_outcome,
        "rate_percent": rate,
    }


def get_dashboard(session: Session, user: User) -> dict[str, object]:
    now = datetime.now(timezone.utc)
    status_counts = {
        status.value: 0
        for status in ApplicationStatus
    }
    for status_value, count in session.execute(
        select(JobApplication.status, func.count())
        .where(JobApplication.user_id == user.id)
        .group_by(JobApplication.status)
    ):
        status_counts[status_value] = count

    total_applications = sum(status_counts.values())
    active_applications = sum(status_counts[status] for status in ACTIVE_STATUSES)

    interview_count = session.scalar(
        select(func.count())
        .select_from(Interview)
        .where(
            Interview.user_id == user.id,
            Interview.scheduled_at >= now,
            Interview.outcome.is_(None),
        )
    ) or 0

    start_date, end_date, month_keys = _month_range(now.date())
    year_expression = func.extract("year", JobApplication.application_date)
    month_expression = func.extract("month", JobApplication.application_date)
    monthly_counts = {}
    for year, month, count in session.execute(
        select(year_expression, month_expression, func.count())
        .where(
            JobApplication.user_id == user.id,
            JobApplication.application_date >= start_date,
            JobApplication.application_date < end_date,
        )
        .group_by(year_expression, month_expression)
    ):
        monthly_counts[f"{int(year):04d}-{int(month):02d}"] = count

    applied_applications = (
        select(ApplicationStatusHistory.application_id)
        .where(
            ApplicationStatusHistory.user_id == user.id,
            ApplicationStatusHistory.status == ApplicationStatus.APPLIED.value,
        )
        .distinct()
        .subquery()
    )
    reached_applied = session.scalar(
        select(func.count()).select_from(applied_applications)
    ) or 0
    outcomes = {
        status: count
        for status, count in session.execute(
            select(
                ApplicationStatusHistory.status,
                func.count(func.distinct(ApplicationStatusHistory.application_id)),
            )
            .join(
                applied_applications,
                applied_applications.c.application_id
                == ApplicationStatusHistory.application_id,
            )
            .where(
                ApplicationStatusHistory.user_id == user.id,
                ApplicationStatusHistory.status.in_(
                    (
                        ApplicationStatus.INTERVIEW.value,
                        ApplicationStatus.OFFER.value,
                    )
                ),
            )
            .group_by(ApplicationStatusHistory.status)
        )
    }

    recent_applications = []
    for application, company_name in session.execute(
        select(JobApplication, Company.name)
        .join(
            Company,
            and_(
                Company.id == JobApplication.company_id,
                Company.user_id == JobApplication.user_id,
            ),
        )
        .where(JobApplication.user_id == user.id)
        .order_by(JobApplication.created_at.desc(), JobApplication.id.desc())
        .limit(5)
    ):
        recent_applications.append(
            {
                "id": application.id,
                "job_title": application.job_title,
                "company_name": company_name,
                "status": application.status,
                "application_date": application.application_date,
                "created_at": application.created_at,
            }
        )

    upcoming_interviews = []
    for interview, job_title, company_name in session.execute(
        select(Interview, JobApplication.job_title, Company.name)
        .join(
            JobApplication,
            and_(
                JobApplication.id == Interview.application_id,
                JobApplication.user_id == Interview.user_id,
            ),
        )
        .join(
            Company,
            and_(
                Company.id == JobApplication.company_id,
                Company.user_id == JobApplication.user_id,
            ),
        )
        .where(
            Interview.user_id == user.id,
            Interview.scheduled_at >= now,
            Interview.outcome.is_(None),
        )
        .order_by(Interview.scheduled_at.asc(), Interview.id.asc())
        .limit(5)
    ):
        upcoming_interviews.append(
            {
                "id": interview.id,
                "application_id": interview.application_id,
                "job_title": job_title,
                "company_name": company_name,
                "scheduled_at": interview.scheduled_at,
                "interview_type": interview.interview_type,
            }
        )

    upcoming_follow_ups = []
    for reminder, job_title, company_name in session.execute(
        select(Reminder, JobApplication.job_title, Company.name)
        .join(
            JobApplication,
            and_(
                JobApplication.id == Reminder.application_id,
                JobApplication.user_id == Reminder.user_id,
            ),
        )
        .join(
            Company,
            and_(
                Company.id == JobApplication.company_id,
                Company.user_id == JobApplication.user_id,
            ),
        )
        .where(
            Reminder.user_id == user.id,
            Reminder.due_at >= now,
            Reminder.is_completed.is_(False),
        )
        .order_by(Reminder.due_at.asc(), Reminder.id.asc())
        .limit(5)
    ):
        upcoming_follow_ups.append(
            {
                "id": reminder.id,
                "application_id": reminder.application_id,
                "job_title": job_title,
                "company_name": company_name,
                "due_at": reminder.due_at,
                "note": reminder.note,
            }
        )

    latest_activity = []
    for activity, job_title, company_name in session.execute(
        select(
            ApplicationStatusHistory,
            JobApplication.job_title,
            Company.name,
        )
        .join(
            JobApplication,
            and_(
                JobApplication.id == ApplicationStatusHistory.application_id,
                JobApplication.user_id == ApplicationStatusHistory.user_id,
            ),
        )
        .join(
            Company,
            and_(
                Company.id == JobApplication.company_id,
                Company.user_id == JobApplication.user_id,
            ),
        )
        .where(ApplicationStatusHistory.user_id == user.id)
        .order_by(
            ApplicationStatusHistory.changed_at.desc(),
            ApplicationStatusHistory.id.desc(),
        )
        .limit(8)
    ):
        latest_activity.append(
            {
                "id": activity.id,
                "application_id": activity.application_id,
                "job_title": job_title,
                "company_name": company_name,
                "status": activity.status,
                "changed_at": activity.changed_at,
            }
        )

    return {
        "stats": {
            "total_applications": total_applications,
            "active_applications": active_applications,
            "interviews_scheduled": interview_count,
            "offers_received": status_counts[ApplicationStatus.OFFER.value],
            "rejections": status_counts[ApplicationStatus.REJECTED.value],
        },
        "applications_over_time": [
            {"month": month, "count": monthly_counts.get(month, 0)}
            for month in month_keys
        ],
        "applications_by_status": [
            {"status": status.value, "count": status_counts[status.value]}
            for status in ApplicationStatus
        ],
        "interview_conversion": _conversion_metric(
            reached_applied,
            outcomes.get(ApplicationStatus.INTERVIEW.value, 0),
        ),
        "offer_conversion": _conversion_metric(
            reached_applied,
            outcomes.get(ApplicationStatus.OFFER.value, 0),
        ),
        "recent_applications": recent_applications,
        "upcoming_interviews": upcoming_interviews,
        "upcoming_follow_ups": upcoming_follow_ups,
        "latest_activity": latest_activity,
    }
