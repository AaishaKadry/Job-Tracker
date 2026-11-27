"""add application job details

Revision ID: 8d32c2e94f71
Revises: b9a00ec7155d
Create Date: 2026-11-26 15:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8d32c2e94f71"
down_revision: Union[str, None] = "b9a00ec7155d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "job_applications",
        sa.Column("employment_type", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "job_applications",
        sa.Column("work_arrangement", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "job_applications",
        sa.Column("job_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "job_applications",
        sa.Column("recruiter_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "job_applications",
        sa.Column("recruiter_email", sa.String(length=320), nullable=True),
    )
    op.create_check_constraint(
        "ck_job_applications_employment_type",
        "job_applications",
        "employment_type IS NULL OR employment_type IN "
        "('full-time', 'part-time', 'contract', 'internship', 'temporary', "
        "'apprenticeship', 'other')",
    )
    op.create_check_constraint(
        "ck_job_applications_work_arrangement",
        "job_applications",
        "work_arrangement IS NULL OR work_arrangement IN "
        "('remote', 'hybrid', 'on-site')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_job_applications_work_arrangement",
        "job_applications",
        type_="check",
    )
    op.drop_constraint(
        "ck_job_applications_employment_type",
        "job_applications",
        type_="check",
    )
    op.drop_column("job_applications", "recruiter_email")
    op.drop_column("job_applications", "recruiter_name")
    op.drop_column("job_applications", "job_description")
    op.drop_column("job_applications", "work_arrangement")
    op.drop_column("job_applications", "employment_type")
