import os
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db_session
from app.errors import ApiError
from app.models import User

DEVELOPMENT_USER_ID = UUID("00000000-0000-4000-8000-000000000001")
DEVELOPMENT_USER_EMAIL = "developer@localhost"
DISABLED_PASSWORD_HASH = "!development-only-no-login!"


def get_current_user(
    session: Session = Depends(get_db_session),
) -> User:
    if os.getenv("APP_ENV", "production").lower() != "development":
        raise ApiError(
            503,
            "AUTHENTICATION_NOT_CONFIGURED",
            "Authentication is not configured. Development identity is disabled.",
        )

    user_id = UUID(os.getenv("DEV_USER_ID", str(DEVELOPMENT_USER_ID)))
    email = os.getenv("DEV_USER_EMAIL", DEVELOPMENT_USER_EMAIL).strip().lower()
    user = session.scalar(select(User).where(User.id == user_id))
    if user is not None:
        if user.email.lower() != email:
            raise ApiError(
                500,
                "DEVELOPMENT_USER_CONFIGURATION_ERROR",
                "DEV_USER_ID is already associated with a different email.",
            )
        return user

    user = session.scalar(select(User).where(User.email == email))
    if user is not None:
        raise ApiError(
            500,
            "DEVELOPMENT_USER_CONFIGURATION_ERROR",
            "DEV_USER_EMAIL is already associated with a different user ID.",
        )

    user = User(
        id=user_id,
        email=email,
        password_hash=DISABLED_PASSWORD_HASH,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        user = session.scalar(select(User).where(User.id == user_id))
        if user is None or user.email.lower() != email:
            raise ApiError(
                409,
                "DEVELOPMENT_USER_CONFLICT",
                "Could not initialize the configured development user.",
            )
    return user
