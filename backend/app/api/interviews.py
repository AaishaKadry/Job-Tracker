from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db_session
from app.models import User
from app.schemas import ApiResponse, InterviewCreate, InterviewRead, InterviewUpdate
from app.services import resources

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=ApiResponse[InterviewRead],
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    payload: InterviewCreate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.create_interview(session, user, payload)}


@router.get("", response_model=ApiResponse[list[InterviewRead]])
def list_interviews(
    application_id: UUID | None = Query(default=None),
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.list_interviews(session, user, application_id)}


@router.put("/{interview_id}", response_model=ApiResponse[InterviewRead])
def update_interview(
    interview_id: UUID,
    payload: InterviewUpdate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "data": resources.update_interview(session, user, interview_id, payload)
    }


@router.delete(
    "/{interview_id}", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK
)
def delete_interview(
    interview_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    resources.delete_interview(session, user, interview_id)
    return {"data": {"id": interview_id, "deleted": True}}
