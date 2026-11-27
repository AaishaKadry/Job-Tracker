# JobTrack Backend

The backend is a FastAPI REST API. It validates JSON with Pydantic, applies
business rules in `app/services`, and stores data in PostgreSQL through
SQLAlchemy 2.0. Alembic manages schema changes.

## Requirements and setup

- Python 3.10 or newer
- PostgreSQL with the Phase 3 migration applied
- PowerShell on Windows

From the repository root:

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Set `DATABASE_URL` in `backend\.env`. This project uses the pure-Python
`pg8000` driver:

```text
DATABASE_URL=postgresql+pg8000://jobtrack:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/jobtrack
```

Do not commit `.env` or put real credentials in source files. To run the
temporary development identity, set these local-only values in `.env`:

```text
APP_ENV=development
DEV_USER_ID=00000000-0000-4000-8000-000000000001
DEV_USER_EMAIL=developer@localhost
```

The fixed development identity is deliberately disabled unless
`APP_ENV=development`. It is not authentication and must not be enabled in
production. Do not expose this development API to an untrusted network.

## Migrations

Run from the `backend` directory after PostgreSQL is available and `.env` is
configured:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

When a model change requires a migration, generate and review it before
applying:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe schema change"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

## Start the API and test it

Start Uvicorn from the `backend` directory and leave this terminal running:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another PowerShell terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/companies
```

The test suite uses the configured PostgreSQL database but rolls back its
changes at the end of each test:

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m pytest
```

FastAPI's interactive endpoint descriptions are at
<http://127.0.0.1:8000/docs>.

## API conventions

- Successful responses use a `data` envelope. Errors use an `error` object
  with a stable `code` and readable `message`.
- Creates return `201`; reads and updates return `200`.
- Deletes return `200` with the deleted resource ID and `deleted: true`.
- Missing records and records owned by another user both return `404`.
- Invalid JSON, IDs, query parameters, and business-rule values return `422`.
- Database uniqueness/relationship conflicts return `409`; unexpected
  database errors return a safe `500` message.
- All list and detail queries are scoped to the current user.

Example successful response:

```json
{
  "data": {
    "id": "8df28c73-b36f-40c3-9e41-9ab8fc458880",
    "name": "Northstar Labs"
  }
}
```

Example error:

```json
{
  "error": {
    "code": "COMPANY_NOT_FOUND",
    "message": "Company not found."
  }
}
```

## Endpoint reference and sample requests

Use the API's interactive documentation for complete request schemas. The
following examples show the route shapes and important fields. These
PowerShell examples can be run after starting the API and enabling the local
development identity.

### Health

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Response: `{"status":"ok"}`.

### Dashboard and analytics

```powershell
$dashboard = Invoke-RestMethod http://127.0.0.1:8000/api/analytics/dashboard
$dashboard.data.stats
$dashboard.data.interview_conversion
$dashboard.data.offer_conversion
```

The single response includes dashboard counts, a twelve-month application-date
series, current application counts by status, conversion metrics, recent
applications, upcoming interviews and follow-ups, and recent status-history
activity. The API calculates these from PostgreSQL and scopes every query to
the current user. Interview and offer conversion rates are the percentage of
distinct applications that reached the target stage among applications that
reached Applied, divided by the distinct number that reached Applied. When
that denominator is zero, `rate_percent` is `null`.

### Companies

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/companies` | Create |
| `GET` | `/api/companies` | List |
| `GET` | `/api/companies/{company_id}` | Retrieve |
| `PUT` | `/api/companies/{company_id}` | Replace editable fields |
| `DELETE` | `/api/companies/{company_id}` | Delete when no applications use it |

```powershell
$company = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/companies `
  -ContentType 'application/json' `
  -Body (@{
    name = 'Northstar Labs'
    website = 'https://northstar.example'
    industry = 'Technology'
    location = 'Seattle'
    notes = 'Met at the career fair'
  } | ConvertTo-Json)
$company.data.id
Invoke-RestMethod "http://127.0.0.1:8000/api/companies/$($company.data.id)"
```

### Job applications

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/applications` | Create |
| `GET` | `/api/applications` | List, filter, search, sort, and paginate |
| `GET` | `/api/applications/{application_id}` | Retrieve |
| `PUT` | `/api/applications/{application_id}` | Replace editable fields |
| `PATCH` | `/api/applications/{application_id}/status` | Change status and record history |
| `DELETE` | `/api/applications/{application_id}` | Delete with its dependent records |

```powershell
$application = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/applications `
  -ContentType 'application/json' `
  -Body (@{
    company_id = $company.data.id
    job_title = 'Software Engineer'
    status = 'applied'
    location = 'Seattle'
    salary_min = 90000
    salary_max = 120000
    salary_currency = 'USD'
    employment_type = 'full-time'
    work_arrangement = 'hybrid'
    job_url = 'https://northstar.example/jobs/123'
    application_date = '2025-01-15'
    job_description = 'Build product experiences for job seekers'
    recruiter_name = 'Jordan Recruiter'
    recruiter_email = 'jordan@example.com'
    notes = 'Applied through the company website'
  } | ConvertTo-Json)
Invoke-RestMethod "http://127.0.0.1:8000/api/applications?status=applied&page=1&page_size=20&q=Engineer&sort_by=application_date&sort_order=desc"
```

The paginated list shape is:

```json
{
  "data": [],
  "pagination": {"page": 1, "page_size": 20, "total": 0, "pages": 0}
}
```

`q` searches both company name and job title. Supported statuses are
`wishlist`, `applied`, `assessment`, `interview`, `offer`, `rejected`, and
`withdrawn`. Sort fields are `application_date` and `updated_at`; `sort_order`
is `asc` or `desc`. Optional employment types are `full-time`, `part-time`,
`contract`, `internship`, `temporary`, `apprenticeship`, and `other`.
Work arrangements are `remote`, `hybrid`, and `on-site`.

### Interviews

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/interviews` | Create |
| `GET` | `/api/interviews?application_id={id}` | List (optionally for one application) |
| `PUT` | `/api/interviews/{interview_id}` | Replace editable fields |
| `DELETE` | `/api/interviews/{interview_id}` | Delete |

Dates must include a timezone offset:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/interviews `
  -ContentType 'application/json' `
  -Body (@{
    application_id = $application.data.id
    scheduled_at = '2030-04-10T09:30:00-07:00'
    interview_type = 'Technical'
    notes = 'Prepare system design examples'
    outcome = $null
  } | ConvertTo-Json)
```

### Follow-up reminders

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/reminders` | Create |
| `GET` | `/api/reminders` | List and optionally filter |
| `PATCH` | `/api/reminders/{reminder_id}` | Change due date, note, or completion |
| `DELETE` | `/api/reminders/{reminder_id}` | Delete |

`application_id`, `is_completed`, and `overdue` are optional list filters.
An overdue reminder is due in the past and not completed.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/reminders `
  -ContentType 'application/json' `
  -Body (@{
    application_id = $application.data.id
    due_at = '2030-04-12T10:00:00-07:00'
    note = 'Ask about next steps'
  } | ConvertTo-Json)
Invoke-RestMethod 'http://127.0.0.1:8000/api/reminders?overdue=false&is_completed=false'
```
