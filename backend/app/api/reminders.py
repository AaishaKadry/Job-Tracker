from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db_session
from app.models import User
from app.schemas import ApiResponse, ReminderCreate, ReminderRead, ReminderUpdate
from app.services import resources

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.post(
    "",
    response_model=ApiResponse[ReminderRead],
    status_code=status.HTTP_201_CREATED,
)
def create_reminder(
    payload: ReminderCreate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.create_reminder(session, user, payload)}


@router.get("", response_model=ApiResponse[list[ReminderRead]])
def list_reminders(
    application_id: UUID | None = Query(default=None),
    is_completed: bool | None = Query(default=None),
    overdue: bool | None = Query(default=None),
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "data": resources.list_reminders(
            session, user, application_id, is_completed, overdue
        )
    }


@router.patch("/{reminder_id}", response_model=ApiResponse[ReminderRead])
def update_reminder(
    reminder_id: UUID,
    payload: ReminderUpdate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.update_reminder(session, user, reminder_id, payload)}


@router.delete(
    "/{reminder_id}", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK
)
def delete_reminder(
    reminder_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    resources.delete_reminder(session, user, reminder_id)
    return {"data": {"id": reminder_id, "deleted": True}}
