from datetime import date, datetime
from decimal import Decimal
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    TypeAdapter,
    field_validator,
    model_validator,
)

from app.models import ApplicationStatus, EmploymentType, WorkArrangement

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    data: T


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: Pagination


class RequestSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CompanyFields(RequestSchema):
    name: str = Field(min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=2048)
    industry: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=200)
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Company name cannot be blank.")
        return value

    @field_validator("website")
    @classmethod
    def validate_website(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return str(TypeAdapter(HttpUrl).validate_python(value.strip()))


class CompanyCreate(CompanyFields):
    pass


class CompanyUpdate(CompanyFields):
    pass


class CompanyRead(CompanyFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class CompanyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class JobApplicationFields(RequestSchema):
    company_id: UUID
    job_title: str = Field(min_length=1, max_length=200)
    status: ApplicationStatus = ApplicationStatus.WISHLIST
    location: str | None = Field(default=None, max_length=200)
    salary_min: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    salary_max: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    salary_currency: str | None = Field(default=None, min_length=3, max_length=3)
    employment_type: EmploymentType | None = None
    work_arrangement: WorkArrangement | None = None
    job_url: str | None = Field(default=None, max_length=2048)
    application_date: date | None = None
    job_description: str | None = None
    recruiter_name: str | None = Field(default=None, max_length=200)
    recruiter_email: str | None = Field(default=None, max_length=320)
    notes: str | None = None

    @field_validator("job_title")
    @classmethod
    def normalize_job_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Job title cannot be blank.")
        return value

    @field_validator("salary_currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value is not None else None

    @field_validator("job_url")
    @classmethod
    def validate_job_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return str(TypeAdapter(HttpUrl).validate_python(value.strip()))

    @field_validator("recruiter_name")
    @classmethod
    def normalize_recruiter_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("recruiter_email")
    @classmethod
    def validate_recruiter_email(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if value.count("@") != 1 or any(character.isspace() for character in value):
            raise ValueError("Enter a valid recruiter email address.")
        local_part, domain = value.rsplit("@", 1)
        if not local_part or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Enter a valid recruiter email address.")
        return value

    @model_validator(mode="after")
    def validate_salary_range(self) -> "JobApplicationFields":
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min cannot exceed salary_max.")
        if (
            self.salary_currency is None
            and (self.salary_min is not None or self.salary_max is not None)
        ):
            raise ValueError("salary_currency is required when a salary is provided.")
        return self


class JobApplicationCreate(JobApplicationFields):
    pass


class JobApplicationUpdate(JobApplicationFields):
    pass


class JobApplicationStatusUpdate(RequestSchema):
    status: ApplicationStatus


class JobApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company: CompanyBrief
    job_title: str
    status: ApplicationStatus
    location: str | None
    salary_min: Decimal | None
    salary_max: Decimal | None
    salary_currency: str | None
    employment_type: EmploymentType | None
    work_arrangement: WorkArrangement | None
    job_url: str | None
    application_date: date | None
    job_description: str | None
    recruiter_name: str | None
    recruiter_email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class InterviewFields(RequestSchema):
    application_id: UUID
    scheduled_at: datetime
    interview_type: str = Field(min_length=1, max_length=80)
    notes: str | None = None
    outcome: str | None = Field(default=None, max_length=80)

    @field_validator("scheduled_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone offset.")
        return value

    @field_validator("interview_type")
    @classmethod
    def normalize_interview_type(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Interview type cannot be blank.")
        return value


class InterviewCreate(InterviewFields):
    pass


class InterviewUpdate(InterviewFields):
    pass


class InterviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    scheduled_at: datetime
    interview_type: str
    notes: str | None
    outcome: str | None
    created_at: datetime
    updated_at: datetime


class ReminderCreate(RequestSchema):
    application_id: UUID
    due_at: datetime
    note: str | None = None

    @field_validator("due_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("due_at must include a timezone offset.")
        return value


class ReminderUpdate(RequestSchema):
    due_at: datetime | None = None
    note: str | None = None
    is_completed: bool | None = None

    @field_validator("due_at")
    @classmethod
    def require_timezone_when_present(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("due_at must include a timezone offset.")
        return value

    @model_validator(mode="after")
    def require_a_change(self) -> "ReminderUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one reminder field must be provided.")
        return self


class ReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    application_id: UUID
    due_at: datetime
    note: str | None
    is_completed: bool
    created_at: datetime
    updated_at: datetime


class DashboardStats(BaseModel):
    total_applications: int
    active_applications: int
    interviews_scheduled: int
    offers_received: int
    rejections: int


class MonthlyApplicationCount(BaseModel):
    month: str
    count: int


class ApplicationStatusCount(BaseModel):
    status: ApplicationStatus
    count: int


class ConversionMetric(BaseModel):
    applications_reached_applied: int
    applications_reached_outcome: int
    rate_percent: float | None


class DashboardApplication(BaseModel):
    id: UUID
    job_title: str
    company_name: str
    status: ApplicationStatus
    application_date: date | None
    created_at: datetime


class DashboardInterview(BaseModel):
    id: UUID
    application_id: UUID
    job_title: str
    company_name: str
    scheduled_at: datetime
    interview_type: str


class DashboardFollowUp(BaseModel):
    id: UUID
    application_id: UUID
    job_title: str
    company_name: str
    due_at: datetime
    note: str | None


class DashboardActivity(BaseModel):
    id: UUID
    application_id: UUID
    job_title: str
    company_name: str
    status: ApplicationStatus
    changed_at: datetime


class DashboardRead(BaseModel):
    stats: DashboardStats
    applications_over_time: list[MonthlyApplicationCount]
    applications_by_status: list[ApplicationStatusCount]
    interview_conversion: ConversionMetric
    offer_conversion: ConversionMetric
    recent_applications: list[DashboardApplication]
    upcoming_interviews: list[DashboardInterview]
    upcoming_follow_ups: list[DashboardFollowUp]
    latest_activity: list[DashboardActivity]
