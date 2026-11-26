from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    and_,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, foreign, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class ApplicationStatus(str, Enum):
    WISHLIST = "wishlist"
    APPLIED = "applied"
    ASSESSMENT = "assessment"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uq_users_email_normalized", text("lower(email)"), unique=True),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_timezone: Mapped[str] = mapped_column(
        String(64), nullable=False, default="UTC", server_default="UTC"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    companies: Mapped[list["Company"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    applications: Mapped[list["JobApplication"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    interviews: Mapped[list["Interview"]] = relationship(
        primaryjoin="User.id == Interview.user_id",
        foreign_keys="Interview.user_id",
        viewonly=True,
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        primaryjoin="User.id == Reminder.user_id",
        foreign_keys="Reminder.user_id",
        viewonly=True,
    )


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_companies_id_user_id"),
        UniqueConstraint("user_id", "name", name="uq_companies_user_id_name"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(2048))
    industry: Mapped[Optional[str]] = mapped_column(String(120))
    location: Mapped[Optional[str]] = mapped_column(String(200))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="companies")
    applications: Mapped[list["JobApplication"]] = relationship(
        primaryjoin=lambda: and_(
            Company.id == foreign(JobApplication.company_id),
            Company.user_id == JobApplication.user_id,
        ),
        back_populates="company",
        passive_deletes=True,
        foreign_keys=lambda: [JobApplication.company_id],
    )


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_job_applications_id_user_id"),
        ForeignKeyConstraint(
            ["company_id", "user_id"],
            ["companies.id", "companies.user_id"],
            name="fk_job_applications_company_owner",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('wishlist', 'applied', 'assessment', 'interview', "
            "'offer', 'rejected', 'withdrawn')",
            name="ck_job_applications_status",
        ),
        CheckConstraint(
            "salary_min IS NULL OR salary_min >= 0",
            name="ck_job_applications_salary_min_nonnegative",
        ),
        CheckConstraint(
            "salary_max IS NULL OR salary_max >= 0",
            name="ck_job_applications_salary_max_nonnegative",
        ),
        CheckConstraint(
            "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
            name="ck_job_applications_salary_range",
        ),
        CheckConstraint(
            "(salary_min IS NULL AND salary_max IS NULL AND salary_currency IS NULL) "
            "OR (salary_currency IS NOT NULL)",
            name="ck_job_applications_salary_currency",
        ),
        CheckConstraint(
            "salary_currency IS NULL OR char_length(salary_currency) = 3",
            name="ck_job_applications_salary_currency_length",
        ),
        Index("ix_job_applications_user_id_status", "user_id", "status"),
        Index("ix_job_applications_user_id_application_date", "user_id", "application_date"),
        Index("ix_job_applications_user_id_updated_at", "user_id", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    job_title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ApplicationStatus.WISHLIST.value,
        server_default=ApplicationStatus.WISHLIST.value,
    )
    location: Mapped[Optional[str]] = mapped_column(String(200))
    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    salary_currency: Mapped[Optional[str]] = mapped_column(String(3))
    job_url: Mapped[Optional[str]] = mapped_column(String(2048))
    application_date: Mapped[Optional[date]] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="applications")
    company: Mapped[Company] = relationship(
        primaryjoin=lambda: and_(
            Company.id == foreign(JobApplication.company_id),
            Company.user_id == JobApplication.user_id,
        ),
        back_populates="applications",
        foreign_keys=lambda: [JobApplication.company_id],
    )
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", passive_deletes=True
    )
    status_history: Mapped[list["ApplicationStatusHistory"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ApplicationStatusHistory.changed_at",
    )


class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (
        ForeignKeyConstraint(
            ["application_id", "user_id"],
            ["job_applications.id", "job_applications.user_id"],
            name="fk_interviews_application_owner",
            ondelete="CASCADE",
        ),
        Index("ix_interviews_user_id_scheduled_at", "user_id", "scheduled_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    application_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interview_type: Mapped[str] = mapped_column(String(80), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    outcome: Mapped[Optional[str]] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    application: Mapped[JobApplication] = relationship(
        back_populates="interviews", foreign_keys=[application_id]
    )


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (
        ForeignKeyConstraint(
            ["application_id", "user_id"],
            ["job_applications.id", "job_applications.user_id"],
            name="fk_reminders_application_owner",
            ondelete="CASCADE",
        ),
        Index("ix_reminders_user_id_due_at", "user_id", "due_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    application_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    application: Mapped[JobApplication] = relationship(
        back_populates="reminders", foreign_keys=[application_id]
    )


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"
    __table_args__ = (
        ForeignKeyConstraint(
            ["application_id", "user_id"],
            ["job_applications.id", "job_applications.user_id"],
            name="fk_application_status_history_application_owner",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "status IN ('wishlist', 'applied', 'assessment', 'interview', "
            "'offer', 'rejected', 'withdrawn')",
            name="ck_application_status_history_status",
        ),
        Index(
            "ix_application_status_history_user_id_changed_at",
            "user_id",
            "changed_at",
        ),
        Index(
            "ix_application_status_history_application_id_changed_at",
            "application_id",
            "changed_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    application_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )

    application: Mapped[JobApplication] = relationship(
        back_populates="status_history", foreign_keys=[application_id]
    )
