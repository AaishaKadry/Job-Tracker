from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_database_url, get_db_session
from app.main import app
from app.models import ApplicationStatusHistory


@pytest.fixture
def transaction_connection() -> Generator[Connection, None, None]:
    try:
        database_url = get_database_url()
    except RuntimeError as error:
        pytest.skip(str(error))

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    transaction = connection.begin()
    try:
        yield connection
    finally:
        transaction.rollback()
        connection.close()
        engine.dispose()


@pytest.fixture
def client(
    transaction_connection: Connection, monkeypatch: pytest.MonkeyPatch
) -> Generator[TestClient, None, None]:
    development_user_id = uuid4()
    development_user_email = f"api-test-{development_user_id}@localhost"
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DEV_USER_ID", str(development_user_id))
    monkeypatch.setenv("DEV_USER_EMAIL", development_user_email)

    test_session_factory = sessionmaker(
        bind=transaction_connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    def override_session() -> Generator[Session, None, None]:
        with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db_session, None)


def create_company(client: TestClient, name: str = "Northstar Labs") -> UUID:
    response = client.post(
        "/api/companies",
        json={
            "name": name,
            "website": "https://northstar.example",
            "industry": "Technology",
            "location": "Seattle",
            "notes": "Test company",
        },
    )
    assert response.status_code == 201
    return UUID(response.json()["data"]["id"])


def create_application(
    client: TestClient,
    company_id: UUID,
    *,
    job_title: str = "Software Engineer",
    status: str = "applied",
) -> UUID:
    response = client.post(
        "/api/applications",
        json={
            "company_id": str(company_id),
            "job_title": job_title,
            "status": status,
            "salary_min": "90000",
            "salary_max": "120000",
            "salary_currency": "usd",
            "application_date": "2025-01-15",
        },
    )
    assert response.status_code == 201
    return UUID(response.json()["data"]["id"])


def test_health_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_company_crud_and_validation(client: TestClient) -> None:
    company_id = create_company(client)

    assert client.get("/api/companies").json()["data"][0]["id"] == str(company_id)
    assert client.get(f"/api/companies/{company_id}").json()["data"]["name"] == (
        "Northstar Labs"
    )

    updated = client.put(
        f"/api/companies/{company_id}",
        json={
            "name": "Northstar Systems",
            "website": "https://northstar.example",
            "industry": "Software",
            "location": "Remote",
            "notes": None,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "Northstar Systems"

    assert client.delete(f"/api/companies/{company_id}").status_code == 200
    assert client.get(f"/api/companies/{company_id}").status_code == 404
    assert client.post("/api/companies", json={"name": "  "}).status_code == 422
    assert client.post(
        "/api/companies", json={"name": "Bad URL", "website": "not-a-url"}
    ).status_code == 422


def test_application_search_filter_pagination_and_status_history(
    client: TestClient, transaction_connection
) -> None:
    company_id = create_company(client)
    first_id = create_application(client, company_id, job_title="Senior Engineer")
    create_application(
        client, company_id, job_title="Product Analyst", status="wishlist"
    )
    create_application(
        client, company_id, job_title="Backend Developer", status="rejected"
    )

    detail = client.get(f"/api/applications/{first_id}")
    assert detail.status_code == 200
    assert detail.json()["data"]["company"]["name"] == "Northstar Labs"

    first_page = client.get("/api/applications?page=1&page_size=1")
    assert first_page.status_code == 200
    assert len(first_page.json()["data"]) == 1
    assert first_page.json()["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 3,
        "pages": 3,
    }

    searched = client.get("/api/applications?q=Northstar")
    assert searched.json()["pagination"]["total"] == 3
    searched_by_title = client.get("/api/applications?q=Senior")
    assert searched_by_title.json()["data"][0]["id"] == str(first_id)
    filtered = client.get("/api/applications?status=wishlist")
    assert filtered.json()["pagination"]["total"] == 1
    assert client.delete(f"/api/companies/{company_id}").status_code == 409

    updated = client.put(
        f"/api/applications/{first_id}",
        json={
            "company_id": str(company_id),
            "job_title": "Senior Software Engineer",
            "status": "applied",
            "location": "Remote",
        },
    )
    assert updated.status_code == 200
    with Session(bind=transaction_connection) as session:
        history_before_status_change = session.scalars(
            select(ApplicationStatusHistory).where(
                ApplicationStatusHistory.application_id == first_id
            )
        ).all()
    assert len(history_before_status_change) == 1

    changed = client.patch(
        f"/api/applications/{first_id}/status", json={"status": "interview"}
    )
    assert changed.status_code == 200
    assert changed.json()["data"]["status"] == "interview"
    with Session(bind=transaction_connection) as session:
        history_after_status_change = session.scalars(
            select(ApplicationStatusHistory).where(
                ApplicationStatusHistory.application_id == first_id
            )
        ).all()
    assert [entry.status for entry in history_after_status_change] == [
        "applied",
        "interview",
    ]

    invalid_salary = client.post(
        "/api/applications",
        json={
            "company_id": str(company_id),
            "job_title": "Invalid Salary",
            "salary_min": "130000",
            "salary_max": "100000",
            "salary_currency": "USD",
        },
    )
    assert invalid_salary.status_code == 422
    assert invalid_salary.json()["error"]["code"] == "VALIDATION_ERROR"
    assert client.get("/api/applications/not-a-uuid").status_code == 422

    assert client.delete(f"/api/applications/{first_id}").status_code == 200
    assert client.get(f"/api/applications/{first_id}").status_code == 404


def test_interview_and_reminder_crud_and_date_filters(client: TestClient) -> None:
    company_id = create_company(client)
    application_id = create_application(client, company_id)

    interview_response = client.post(
        "/api/interviews",
        json={
            "application_id": str(application_id),
            "scheduled_at": "2030-04-10T09:30:00-07:00",
            "interview_type": "Technical",
            "notes": "Prepare system design",
        },
    )
    assert interview_response.status_code == 201
    interview_id = interview_response.json()["data"]["id"]
    assert client.get(
        f"/api/interviews?application_id={application_id}"
    ).json()["data"][0]["id"] == interview_id

    interview_update = client.put(
        f"/api/interviews/{interview_id}",
        json={
            "application_id": str(application_id),
            "scheduled_at": "2030-04-11T09:30:00-07:00",
            "interview_type": "Final",
            "outcome": "Pending",
        },
    )
    assert interview_update.status_code == 200
    assert interview_update.json()["data"]["interview_type"] == "Final"
    assert client.delete(f"/api/interviews/{interview_id}").status_code == 200

    future_due_at = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    reminder_response = client.post(
        "/api/reminders",
        json={
            "application_id": str(application_id),
            "due_at": future_due_at,
            "note": "Send a follow-up",
        },
    )
    assert reminder_response.status_code == 201
    reminder_id = reminder_response.json()["data"]["id"]
    upcoming = client.get("/api/reminders?overdue=false")
    assert upcoming.json()["data"][0]["id"] == reminder_id

    reminder_update = client.patch(
        f"/api/reminders/{reminder_id}", json={"is_completed": True}
    )
    assert reminder_update.status_code == 200
    assert reminder_update.json()["data"]["is_completed"] is True
    assert client.patch(f"/api/reminders/{reminder_id}", json={}).status_code == 422
    assert client.delete(f"/api/reminders/{reminder_id}").status_code == 200

    assert client.post(
        "/api/interviews",
        json={
            "application_id": str(application_id),
            "scheduled_at": "2030-04-10T09:30:00",
            "interview_type": "Technical",
        },
    ).status_code == 422


def test_user_cannot_access_another_users_records(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    company_id = create_company(client)
    application_id = create_application(client, company_id)
    interview = client.post(
        "/api/interviews",
        json={
            "application_id": str(application_id),
            "scheduled_at": "2030-04-10T09:30:00Z",
            "interview_type": "Technical",
        },
    )
    assert interview.status_code == 201
    interview_id = interview.json()["data"]["id"]
    reminder = client.post(
        "/api/reminders",
        json={
            "application_id": str(application_id),
            "due_at": "2030-04-10T09:30:00Z",
        },
    )
    assert reminder.status_code == 201
    reminder_id = reminder.json()["data"]["id"]

    other_user_id = uuid4()
    monkeypatch.setenv("DEV_USER_ID", str(other_user_id))
    monkeypatch.setenv("DEV_USER_EMAIL", f"other-{other_user_id}@localhost")
    assert client.get("/api/companies").status_code == 200
    assert client.get(f"/api/companies/{company_id}").status_code == 404
    assert client.get(f"/api/applications/{application_id}").status_code == 404
    assert client.delete(f"/api/interviews/{interview_id}").status_code == 404
    assert client.patch(
        f"/api/reminders/{reminder_id}", json={"is_completed": True}
    ).status_code == 404
    assert client.post(
        "/api/applications",
        json={"company_id": str(company_id), "job_title": "Foreign company"},
    ).status_code == 404


def test_development_identity_fails_closed_outside_development(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    response = client.get("/api/companies")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AUTHENTICATION_NOT_CONFIGURED"
