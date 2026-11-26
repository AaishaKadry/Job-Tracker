from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db_session
from app.models import User
from app.schemas import ApiResponse, CompanyCreate, CompanyRead, CompanyUpdate
from app.services import resources

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post(
    "",
    response_model=ApiResponse[CompanyRead],
    status_code=status.HTTP_201_CREATED,
)
def create_company(
    payload: CompanyCreate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    company = resources.create_company(session, user, payload)
    return {"data": company}


@router.get("", response_model=ApiResponse[list[CompanyRead]])
def list_companies(
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.list_companies(session, user)}


@router.get("/{company_id}", response_model=ApiResponse[CompanyRead])
def get_company(
    company_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.get_company(session, user, company_id)}


@router.put("/{company_id}", response_model=ApiResponse[CompanyRead])
def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    return {"data": resources.update_company(session, user, company_id, payload)}


@router.delete(
    "/{company_id}", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK
)
def delete_company(
    company_id: UUID,
    session: Session = Depends(get_db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    resources.delete_company(session, user, company_id)
    return {"data": {"id": company_id, "deleted": True}}
