from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db_session
from app.models import User
from app.schemas import ApiResponse, DashboardRead
from app.services import analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=ApiResponse[DashboardRead])
def get_dashboard(
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": analytics.get_dashboard(session, user)}
