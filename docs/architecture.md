# JobTrack Architecture

## 1. Architecture goals

JobTrack uses a conventional three-part web architecture that is easy to
reason about:

1. **React frontend** presents screens and collects user input.
2. **FastAPI backend** validates requests, applies business rules, checks
   permissions, and returns responses.
3. **PostgreSQL database** stores durable application and account data.

The frontend never connects directly to PostgreSQL. All data access goes
through the backend REST API. This gives the backend one place to enforce
validation, authentication, and ownership rules.

## 2. High-level component diagram

```text
Browser
  React + TypeScript + Vite
       | HTTPS / JSON REST requests
       v
  FastAPI application
       | SQLAlchemy 2.0
       v
  PostgreSQL

Alembic migrations update the PostgreSQL schema as the application evolves.
```

In local development, the Vite development server and FastAPI server run as
separate processes. In production, the frontend's built static assets are
served by a web server or hosting platform, while FastAPI runs as an API
service. Both use environment-specific configuration; secrets are never
embedded in the frontend bundle.

## 3. Frontend architecture

The frontend is a single-page application built with React, TypeScript, and
Vite. It should use clear responsibility boundaries without introducing a
large state-management framework before one is needed.

### 3.1 Suggested responsibilities

- **Pages and routes:** Dashboard, applications, application detail/edit,
  board, companies, reminders, analytics, login, and registration.
- **Reusable UI components:** Form fields, status labels, confirmation
  dialogs, loading/error/empty states, and common navigation.
- **Feature components:** Application form/list, board columns, interview
  editor, reminder list, and charts.
- **API client module:** One place for the API base URL, JSON requests,
  credentials, and consistent handling of HTTP errors.
- **Type definitions:** TypeScript types for API request/response shapes.
- **Authentication state:** A small shared mechanism for knowing whether the
  current browser session is authenticated. The browser asks the API for the
  current user/session state rather than treating a client-side value as proof
  of identity.

### 3.2 Frontend behavior

The UI sends a request for reads and mutations. For a mutation, it displays
success only after the backend confirms persistence. If a board move fails,
the UI reports the error and restores or reloads the server-confirmed status.
Loading, empty, validation, and server-error states are part of each relevant
screen rather than being silently ignored.

Tailwind CSS and shadcn/ui provide styling and accessible interface building
blocks. Business rules such as ownership and status-history recording remain
on the backend; the frontend may validate for convenience but cannot be the
only validator.

## 4. Backend architecture

FastAPI exposes REST endpoints and uses Pydantic request/response
schemas for boundary validation and serialization. A beginner-friendly
organization is to keep these concerns distinct:

- **API/router layer:** HTTP paths, status codes, request parsing, and response
  shapes.
- **Schema layer:** Pydantic models for input and output validation.
- **Service/business-rule layer:** Operations such as creating an application,
  changing status with a history entry, and calculating dashboard metrics.
- **Persistence/model layer:** SQLAlchemy 2.0 models and database queries.
- **Database/session configuration:** Connection setup and transaction
  lifecycle.
- **Authentication/authorization helpers:** Resolve the current account and
  ensure every resource is scoped to it.

For a small MVP, these can be ordinary Python modules in one FastAPI
application; they do not need to be separate services. Routers should not
contain duplicated ownership checks or complex analytics queries. Services
use a database session, perform the required changes together, and commit
before a success response is returned.

## 5. Database architecture

PostgreSQL is the source of truth. SQLAlchemy 2.0 maps relational tables to
Python models, and Alembic records schema changes as ordered migrations.

### 5.1 Core entities

- **User:** Unique normalized email, password hash, and account settings such
  as preferred time zone.
- **Session:** A user association, hash of a randomly generated session token,
  expiry, and creation metadata. Raw session tokens are not stored.
- **Company:** User-owned company name and optional website, industry,
  location, and notes.
- **Application:** User and company references, job title, location, optional
  salary range/currency, URL, application date, notes, and current status.
- **Interview:** Application reference, date/time, type, notes, and outcome.
- **Reminder:** Application reference, due date/time, note, and completion
  state.
- **ApplicationStatusHistory:** Application and user references, resulting
  status, and change timestamp. This supporting table records the initial
  status and later transitions for recent activity and conversion analytics.

An application belongs to one user and may reference a company owned by that
same user. Interview and reminder records belong to an application; access to
them is authorized through the owning application. Foreign keys and database
constraints protect relationships. Deleting an application may delete its
dependent interview, reminder, and history rows according to an explicitly
chosen cascade policy; deleting a company must not unexpectedly delete
applications.

The initial database schema uses UUID identifiers, timezone-aware timestamps,
and Alembic migrations. Applications, interviews, reminders, and status history
carry an owning user ID; composite foreign keys ensure that an application
cannot reference another user's company and that child records cannot be
attached to another user's application. User email is case-insensitively
unique, and password values are stored as hashes rather than plaintext.

The initial REST API paths are mounted under `/api` as requested for the
development milestone. They are not yet versioned; API versioning can be
introduced before a public compatibility commitment.

### 5.2 Schema and data rules

- Use generated primary keys and foreign keys for relationships.
- Store monetary minimum and maximum values as decimal/numeric amounts with a
  currency code; allow unknown values.
- Store a calendar application date as a date.
- Store interview/reminder instants in UTC and retain the user's time-zone
  preference for presentation.
- Constrain status values to the supported set and validate salary ranges
  (`minimum <= maximum`) when both are provided.
- Add indexes for common per-user list queries, status filters, and dates as
  needed; avoid speculative indexing before query patterns are measured.
- Use Alembic migrations for all schema changes; do not rely on manual
  production database edits.

## 6. REST API communication

The browser and API communicate with JSON over HTTPS. API routes are grouped
under `/api`. Resource names are plural and use HTTP methods consistently.
The implemented endpoint inventory is:

| Resource | Example operations |
|---|---|
| `/api/companies` | List, create, retrieve, update, delete companies |
| `/api/applications` | List, create, retrieve, update, delete applications |
| `/api/applications/{id}/status` | Change status and record history |
| `/api/interviews` | List/create interviews; update/delete by ID |
| `/api/reminders` | List/create reminders; update/delete by ID |
| `/api/health` | Check API availability |

Real authentication is not yet implemented. The current development API
identity is available only when `APP_ENV=development`; it must be replaced by
the server-managed session authentication described below before deployment.

Current API conventions:

- `GET` reads; `POST` creates; `PATCH` partially updates; `DELETE` removes.
- Creates return `201`; reads and updates return `200`; deletions return `200`
  with a confirmation object. Missing records and foreign-owned records both
  return `404`; validation errors return `422`; database conflicts return
  `409`.
- Return stable, documented JSON response schemas. Error responses should be
  actionable and must not expose stack traces, SQL, password hashes, or
  session tokens.
- Success bodies use a `data` property, and errors use an `error` property
  containing a stable code and message. Application lists include a
  `pagination` object.
- Paginate application listings (default 20 records, maximum 100); revisit
  pagination for other collections if their size grows.
- Frontend API calls send the session cookie using browser credentials. The
  API must configure CORS for the exact trusted frontend origin rather than
  allowing arbitrary origins with credentials.

## 7. Authentication and authorization

The planned production MVP uses a server-managed session rather than storing
an authentication token in browser local storage:

1. On registration, validate and normalize the email, hash the password using
   a maintained password-hashing library with Argon2id (or its maintained
   recommended equivalent), and store the hash.
2. On login, verify the supplied password against the stored hash.
3. Generate a cryptographically random, unguessable session token. Store only
   its hash in the Session table and send the raw token to the browser in a
   cookie.
4. Set the cookie as `HttpOnly`, `Secure` in production, and `SameSite` with
   an appropriate restrictive policy. Set an expiry and rotate or renew
   sessions only through a deliberate policy.
5. For each protected request, hash the presented cookie token, find a
   non-expired session, and derive the user identity on the server.
6. Logout invalidates the server-side session and clears the browser cookie.

Cookie authentication requires CSRF protection for state-changing requests.
Use a well-understood CSRF token strategy (for example, a session-bound
double-submit token) and validate the request origin as an additional
defense. CORS is not a substitute for CSRF protection. Passwords and tokens
must never appear in application logs.

For this API milestone only, a temporary fixed development identity is created
when `APP_ENV=development`; the identity is disabled otherwise. This
development mechanism does not authenticate a person and is not safe for
deployment. Before production, replace it with the session flow above.

Every query or mutation involving an owned resource is scoped by the current
server-resolved user's ID. A request containing a valid but foreign application
ID must not bypass that ownership condition. The backend is the security
boundary; a hidden button or client-side route guard is not authorization.

## 8. How the components communicate

### Example: moving a card on the Kanban board

1. The user moves an application card from **Applied** to **Interview**.
2. React sends a `PATCH` request to the application's status endpoint with the
   requested new status and the browser's session cookie.
3. FastAPI validates the status and resolves the user from the session.
4. The service loads the application scoped to that user. It updates the
   current status and inserts an ApplicationStatusHistory row in the same
   database transaction.
5. SQLAlchemy issues parameterized SQL to PostgreSQL. The transaction commits
   both changes together.
6. FastAPI returns the saved application/status response.
7. React updates the board and any affected dashboard/activity data. If a
   request fails, React displays an error and does not pretend the change was
   saved.

The same flow applies to other features: the UI expresses user intent, the API
validates identity and input, the service applies the rule, the ORM persists
the result, and the API returns a documented response.

## 9. Major technical risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Cross-user data exposure | One incorrect query could disclose private job-search data. | Scope every resource query by authenticated user; test access with two accounts, including guessed IDs. |
| Cookie/session weaknesses | Session theft, CSRF, or inadequate logout can compromise accounts. | Use hashed random server-side sessions, secure cookie flags, CSRF defenses, expiry, logout invalidation, HTTPS, and dependency updates. |
| Time-zone errors | Interview and reminder times can appear at the wrong local time. | Define UTC persistence and user-zone presentation, validate daylight-saving transitions, and test across zones. |
| Misleading conversion analytics | Current status alone loses transitions, making conversion percentages inaccurate. | Record status history and specify denominator, numerator, and "ever reached" semantics. |
| Duplicate company records | Repeated manual entry can fragment a user's application history. | Make company records reusable per user and validate ownership when associating them. |
| Cascading deletion mistakes | An accidental cascade could erase more information than intended. | Define foreign-key deletion rules explicitly and test each delete path; confirm destructive UI actions. |
| Growing list/API payloads | Unbounded lists and dashboard queries may become slow as data grows. | Add pagination, measure queries, and index common filters when evidence supports it. |
| Third-party service dependency | Email, file storage, or analytics services add cost and operational complexity. | Keep these out of the MVP; introduce only when a clear product requirement exists. |

## 10. Operational and quality considerations

- Provide separate development, test, and production configuration without
  committing secrets. A `.env.example` should document variable names and safe
  placeholders when environment files are introduced.
- Run migrations as a controlled deployment step and back up production data
  before risky schema changes.
- Keep API and database errors observable to operators while returning safe,
  comprehensible errors to users.
- Test business rules and ownership at the backend, UI behavior in focused
  frontend tests, and at least the highest-value user journeys end to end.
- Review dependency updates and database backups before public launch.

## 11. Deliberate simplicity

The MVP is a modular monolith: one React application, one FastAPI service, and
one PostgreSQL database. There is no microservice layer, message broker,
distributed cache, or separate analytics warehouse. This keeps local
development and debugging understandable while leaving room to scale based on
measured needs.
