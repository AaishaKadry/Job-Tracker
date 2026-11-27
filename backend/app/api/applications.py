from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db_session
from app.models import ApplicationStatus, User
from app.schemas import (
    ApiResponse,
    JobApplicationCreate,
    JobApplicationRead,
    JobApplicationStatusUpdate,
    JobApplicationUpdate,
    PaginatedResponse,
    Pagination,
)
from app.services import resources

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post(
    "",
    response_model=ApiResponse[JobApplicationRead],
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: JobApplicationCreate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    application = resources.create_application(session, user, payload)
    return {"data": application}


@router.get("", response_model=PaginatedResponse[JobApplicationRead])
def list_applications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    application_status: ApplicationStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=200),
    sort_by: Literal["application_date", "updated_at"] = Query(
        default="updated_at"
    ),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    applications, total = resources.list_applications(
        session,
        user,
        page,
        page_size,
        application_status,
        q,
        sort_by,
        sort_order,
    )
    return {
        "data": applications,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": resources.page_count(total, page_size),
        },
    }


@router.get("/{application_id}", response_model=ApiResponse[JobApplicationRead])
def get_application(
    application_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.get_application(session, user, application_id)}


@router.put("/{application_id}", response_model=ApiResponse[JobApplicationRead])
def update_application(
    application_id: UUID,
    payload: JobApplicationUpdate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "data": resources.update_application(session, user, application_id, payload)
    }


@router.patch("/{application_id}/status", response_model=ApiResponse[JobApplicationRead])
def update_application_status(
    application_id: UUID,
    payload: JobApplicationStatusUpdate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    application = resources.update_application_status(
        session, user, application_id, payload
    )
    return {"data": application}


@router.delete(
    "/{application_id}",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
)
def delete_application(
    application_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    resources.delete_application(session, user, application_id)
    return {"data": {"id": application_id, "deleted": True}}
