# JobTrack Software Requirements Specification

## 1. Purpose

This document describes the initial product requirements for JobTrack, a web
application that helps an individual job seeker organize job applications,
interviews, and follow-up tasks. It is the shared reference for product scope,
design, implementation, and testing.

## 2. Product overview

JobTrack is a private, account-based application. A registered user can record
each opportunity, monitor its progress through a defined status lifecycle, and
review useful activity and conversion summaries.

### 2.1 Target users

- Students and fresh graduates managing their first job search.
- Working professionals managing several active applications.

### 2.2 Goals

- Make it easy to capture an opportunity and keep its details in one place.
- Make the current state and next actions for each application clear.
- Help users follow up on time and prepare for interviews.
- Provide understandable summaries without requiring a spreadsheet.
- Keep each user's data private and separated from other users' data.

### 2.3 Out of scope for the initial product

JobTrack does not submit applications, scrape job sites, send messages to
employers, or make hiring recommendations. It is a tracking tool, not a job
board or recruiting system.

## 3. Users and permissions

The initial release has one user role: an authenticated account owner.

- A visitor can register, log in, or recover from an authentication error.
- An authenticated user can create, view, change, and delete only their own
  records.
- There is no administrative or shared-team access in the MVP.

## 4. Application status lifecycle

Each application has exactly one current status:

1. **Wishlist** — an opportunity the user may apply for.
2. **Applied** — an application has been submitted.
3. **Assessment** — the user is completing an assessment or screening task.
4. **Interview** — an interview process is underway or scheduled.
5. **Offer** — an offer has been received.
6. **Rejected** — the employer has declined the application.
7. **Withdrawn** — the user has withdrawn from consideration.

The user may move an application between statuses when correcting or updating
its progress. Each status change records a timestamp and the resulting status so
that activity and conversion analytics can be based on lifecycle history.

## 5. Functional requirements

Requirements marked **MVP** are required for the first usable release. **Later**
requirements are valuable but are not part of the MVP unless explicitly
promoted into scope.

### 5.1 Account and authentication

- **FR-AUTH-01 (MVP):** A visitor can register with an email address and
  password. The system rejects malformed email addresses, missing fields, and
  passwords that do not meet the published minimum policy.
- **FR-AUTH-02 (MVP):** The system prevents duplicate accounts for the same
  normalized email address and reports the conflict without exposing another
  user's information.
- **FR-AUTH-03 (MVP):** A registered user can log in with valid credentials.
- **FR-AUTH-04 (MVP):** A user can log out, after which the current session is
  no longer accepted.
- **FR-AUTH-05 (MVP):** Passwords are stored only as salted, slow password
  hashes; plaintext passwords are never stored or logged.
- **FR-AUTH-06 (MVP):** Protected pages and API operations require an active
  authenticated session.
- **FR-AUTH-07 (MVP):** Requests for one user's records cannot read, change, or
  delete another user's records, including by guessing record identifiers.
- **FR-AUTH-08 (Later):** A user can request a password reset through a
  verified email workflow.

### 5.2 Job application management

- **FR-JOB-01 (MVP):** An authenticated user can create an application with a
  company name, job title, and current status.
- **FR-JOB-02 (MVP):** An application can also store location, salary range,
  job URL, application date, and notes. These fields may be blank when the
  information is not known or relevant.
- **FR-JOB-03 (MVP):** A user can view an application list and open a detail
  view for an individual application.
- **FR-JOB-04 (MVP):** A user can edit an application they own.
- **FR-JOB-05 (MVP):** A user can delete an application they own after
  confirming the action. The interface makes clear that deletion is
  irreversible in the MVP.
- **FR-JOB-06 (MVP):** The application list can be sorted by application date
  and most recently updated. Empty lists have a useful empty state.
- **FR-JOB-07 (MVP):** Invalid URLs, negative salary values, invalid date
  values, and missing required fields are rejected with actionable validation
  messages.
- **FR-JOB-08 (Later):** Users can search, filter, and export their
  applications.

### 5.3 Status and Kanban board

- **FR-STATUS-01 (MVP):** Each application has one of the seven statuses
  defined in Section 4.
- **FR-STATUS-02 (MVP):** A user can update an application's status from its
  detail or edit view.
- **FR-KANBAN-01 (MVP):** A board presents applications grouped into columns
  by current status.
- **FR-KANBAN-02 (MVP):** A user can move an application to another status
  using an accessible board interaction or an equivalent status control.
- **FR-KANBAN-03 (MVP):** A successful status change is saved by the backend
  and remains after reload. A failed save is clearly reported and the displayed
  state is restored or refreshed from the server.
- **FR-STATUS-03 (MVP):** Each status change is recorded with its time and
  resulting status for activity and analytics.

### 5.4 Company management

- **FR-COMPANY-01 (MVP):** A user can associate an application with a company
  and record company name.
- **FR-COMPANY-02 (MVP):** Company records can store website, industry,
  location, and notes; these details are optional.
- **FR-COMPANY-03 (MVP):** A company can be associated with multiple
  applications belonging to the same user, avoiding repeated company details.
- **FR-COMPANY-04 (MVP):** A user's company records are private to that user.
- **FR-COMPANY-05 (MVP):** Removing a company must not silently erase its
  applications. The MVP should prevent deletion while applications reference
  the company or require the user to first reassign/remove those references.

### 5.5 Interviews

- **FR-INTERVIEW-01 (MVP):** A user can add one or more interview events to an
  application.
- **FR-INTERVIEW-02 (MVP):** An interview can store date and time, interview
  type, notes, and outcome.
- **FR-INTERVIEW-03 (MVP):** Interview date and time are displayed in the
  user's configured time zone; timestamps are stored consistently in UTC.
- **FR-INTERVIEW-04 (MVP):** A user can edit or delete an interview event
  belonging to their application.

### 5.6 Follow-up reminders

- **FR-REMINDER-01 (MVP):** A user can create a follow-up reminder with a
  date/time and optional note, associated with an application.
- **FR-REMINDER-02 (MVP):** The dashboard or reminder view separates upcoming
  reminders from overdue reminders.
- **FR-REMINDER-03 (MVP):** A user can mark a reminder complete, edit it, or
  delete it.
- **FR-REMINDER-04 (MVP):** Reminder dates are interpreted in the user's
  configured time zone and stored consistently.
- **FR-REMINDER-05 (Later):** The system sends email, push, or calendar
  notifications. The MVP provides in-app reminders only.

### 5.7 Dashboard and activity

- **FR-DASH-01 (MVP):** The dashboard shows total applications and counts for
  applications in progress, interviews scheduled, offers, and rejections.
- **FR-DASH-02 (MVP):** The dashboard shows recent application activity,
  including status changes and important updates, with the most recent items
  first.
- **FR-DASH-03 (MVP):** Dashboard counts are calculated from the user's
  records and current statuses. "In progress" means Wishlist, Applied,
  Assessment, or Interview; the other status counts are shown separately.
- **FR-DASH-04 (MVP):** The dashboard provides an understandable empty state
  and a clear path to add the first application.
- **FR-DASH-05 (MVP):** Dashboard data is refreshed after relevant changes and
  does not present an unconfirmed mutation as saved.

### 5.8 Analytics

- **FR-ANALYTICS-01 (MVP):** The user can view application counts over time,
  grouped by month, using application date.
- **FR-ANALYTICS-02 (MVP):** The user can view the distribution of current
  applications by status.
- **FR-ANALYTICS-03 (MVP):** Interview conversion rate is the percentage of
  applications that reached Interview divided by applications that reached
  Applied, based on recorded status history.
- **FR-ANALYTICS-04 (MVP):** Offer conversion rate is the percentage of
  applications that reached Offer divided by applications that reached
  Applied, based on recorded status history.
- **FR-ANALYTICS-05 (MVP):** When a conversion denominator is zero, the UI
  shows "—" or "Not enough data" rather than an invalid number.
- **FR-ANALYTICS-06 (MVP):** Analytics are scoped to the authenticated user;
  charts include labels and a non-visual text alternative for key values.
- **FR-ANALYTICS-07 (Later):** Users can select custom reporting periods,
  compare periods, or export analytics.

## 6. Non-functional requirements

- **NFR-SEC-01:** All production traffic uses HTTPS. Authentication cookies
  use Secure, HttpOnly, and an appropriate SameSite policy; cookie-authenticated
  state-changing requests are protected against CSRF.
- **NFR-SEC-02:** Authorization is enforced on the backend for every
  user-owned resource; frontend hiding alone is not access control.
- **NFR-SEC-03:** User input is validated at the API boundary and persisted
  using parameterized ORM/database operations.
- **NFR-SEC-04:** Secrets and environment-specific configuration are supplied
  through environment variables and are not committed to source control.
- **NFR-PRIV-01:** API responses disclose only the authenticated user's
  authorized data. Password hashes and session secrets are never returned.
- **NFR-REL-01:** A successful create, edit, delete, or status transition is
  committed to the database before the API reports success.
- **NFR-REL-02:** Database constraints protect required relationships and
  prevent invalid enum/status values from being persisted.
- **NFR-PERF-01:** Under an agreed MVP test dataset of 1,000 applications for
  one user, common list and dashboard requests should complete within 1 second
  at the 95th percentile in the target deployment environment, excluding
  network latency. This is a target to validate, not a guarantee.
- **NFR-UX-01:** Core workflows are usable on desktop and mobile layouts and
  do not rely solely on color to communicate status.
- **NFR-A11Y-01:** Forms, navigation, status controls, and charts support
  keyboard operation, visible focus, meaningful labels, and screen-reader
  alternatives.
- **NFR-MAINT-01:** Frontend, API, and persistence responsibilities are
  separated; business rules are testable without depending on visual
  components.
- **NFR-MAINT-02:** Database schema changes are versioned and reproducible
  through migrations.
- **NFR-OBS-01:** Errors are logged with useful diagnostic context, but logs
  exclude passwords, session tokens, and unnecessary personal notes.

## 7. MVP scope

The MVP is a single-user-per-account, responsive application that includes:

- Registration, login, logout, protected routes, and private per-user data.
- Application create/read/update/delete and all seven statuses.
- Company records associated with applications.
- A status board with persisted status changes and status history.
- Interview events and in-app follow-up reminders.
- Dashboard counts and recent activity.
- Monthly application and status charts plus the two defined conversion rates.
- PostgreSQL persistence, SQLAlchemy models, and Alembic migrations.
- Input validation, visible error states, and automated tests for critical
  API, authorization, and workflow behavior.

## 8. Features to postpone

These features are intentionally excluded from the initial release to keep it
small enough to build, test, and understand:

- Email or push notifications, calendar synchronization, and scheduled jobs.
- Password reset and email verification until an email delivery provider is
  selected.
- OAuth/social login, multi-factor authentication, and enterprise SSO.
- Resume/document uploads and file storage.
- Job-board integrations, scraping, browser extensions, and automatic
  application submission.
- Collaboration, shared accounts, recruiter/admin roles, and organization
  management.
- Advanced search, custom tags, bulk editing, and CSV export/import.
- Custom analytics date ranges, cohort reports, and predictive insights.
- Offline mode, native mobile applications, and real-time multi-device sync.

## 9. Assumptions and open decisions

- One account represents one individual job seeker; there are no shared
  accounts in the MVP.
- Company details are user-owned records. The same real-world company may
  exist separately for different users to preserve privacy and avoid
  cross-account data sharing.
- Salary values use a currency code and optional minimum/maximum amounts; the
  UI must not imply that different currencies are directly comparable.
- Application date is a calendar date. Interview and reminder dates are
  date-times interpreted in a user-selected time zone.
- Conversion analytics use status history and cumulative "ever reached"
  semantics, so a later move from Offer to another status does not erase the
  fact that an offer was reached.
- Account deletion and data-retention policy should be agreed before public
  launch; an MVP UI for self-service account deletion is not specified here.

## 10. Acceptance criteria for MVP

The MVP is acceptable when a new user can register, log in, create and manage
applications, move them across board statuses, add company/interview/reminder
details, and see dashboard and analytics values that match the stored data.
After signing out, protected data is inaccessible; a second user cannot access
the first user's records. Changes remain after reload, validation and
permission failures are visible, and the critical flows pass automated tests.
