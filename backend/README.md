# JobTrack Backend

The backend is a Python API built with FastAPI. PostgreSQL access uses
SQLAlchemy 2.0, with Alembic managing schema migrations. API endpoints for
database-backed product features are not included yet.

## Requirements

- Python 3.10 or newer
- PostgreSQL
- PowerShell on Windows

## Set up the environment

From the repository root:

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `backend\.env` and set `DATABASE_URL` to your PostgreSQL connection. Use
the `postgresql+psycopg://` scheme, for example:

```text
postgresql+pg8000://jobtrack:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/jobtrack
```

Create the PostgreSQL role and database (`jobtrack` in this example) using
your PostgreSQL installation's normal administration method. Keep the actual
password in `backend\.env`; `.env` is ignored by Git. Never commit credentials.

## Start the API

From the `backend` directory:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Uvicorn imports the `app` object from `app/main.py` and runs the development
server. `--reload` restarts it when Python files change; do not use that
development option as a production process manager.

## Create or update the database schema

The initial Alembic revision is already in `migrations/versions/`. Apply it
from the `backend` directory after PostgreSQL is running and `DATABASE_URL`
is configured:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

When a later model change needs a migration, generate a new revision, review
the generated file, and then upgrade:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe schema change"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

To see the current revision:

```powershell
.\.venv\Scripts\python.exe -m alembic current
```

Alembic creates and updates tables; do not create them manually.

## Test PostgreSQL connectivity

From the `backend` directory, with PostgreSQL running, the database configured,
and the migration applied:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

The connectivity test executes `SELECT 1` through the SQLAlchemy engine.

## Test the health endpoint

With the API running, open a second PowerShell terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Expected response:

```text
status
------
ok
```

FastAPI's interactive API documentation is available at
<http://127.0.0.1:8000/docs>.
