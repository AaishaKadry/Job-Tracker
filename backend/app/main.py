import os
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api import analytics, applications, companies, interviews, reminders
from app.errors import ApiError

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger(__name__)
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="JobTrack API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)


app.include_router(companies.router)
app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(reminders.router)
app.include_router(analytics.router)


@app.exception_handler(ApiError)
async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    _: Request, error: RequestValidationError
) -> JSONResponse:
    details = [
        {
            "location": list(item["loc"]),
            "message": item["msg"],
            "type": item["type"],
        }
        for item in error.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": details,
            }
        },
    )


@app.exception_handler(HTTPException)
async def handle_http_error(_: Request, error: HTTPException) -> JSONResponse:
    message = error.detail if isinstance(error.detail, str) else "Request failed."
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": message,
            }
        },
        headers=error.headers,
    )


@app.exception_handler(SQLAlchemyError)
async def handle_database_error(_: Request, error: SQLAlchemyError) -> JSONResponse:
    logger.error(
        "Database operation failed",
        exc_info=(type(error), error, error.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database operation failed.",
            }
        },
    )


@app.get("/api/health", tags=["health"])
def get_health() -> dict[str, str]:
    return {"status": "ok"}
