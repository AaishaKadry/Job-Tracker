# JobTrack Development Roadmap

## 1. Roadmap principles

- Deliver one coherent milestone at a time; each milestone should be
  reviewable, testable, and useful.
- Keep frontend, backend, and database responsibilities separate while
  avoiding premature distributed services.
- Build security and data ownership into the first protected API rather than
  trying to retrofit them after features exist.
- Add scope only after the MVP acceptance criteria work end to end.

## 2. Milestones

### Milestone 0 — Requirements and design agreement

**Outcome:** An agreed scope and architecture for the first release.

**Work:**

- Review the SRS, architecture, flows, and this roadmap.
- Resolve key product decisions such as currency handling, time zone
  preference, deletion behavior, and analytics definitions.
- Define initial API response/error conventions and supported browser targets.

**Completion criteria:**

- MVP scope and postponed features are approved.
- Open decisions that block implementation have owners and answers.

**Dependency:** None.

### Milestone 1 — Repository and development foundations

**Outcome:** A reproducible local development environment for frontend and
backend.

**Work:**

- Establish frontend and backend project structure and coding conventions.
- Add environment-based configuration and safe example configuration.
- Configure linting, formatting, and focused test commands using the selected
  project tools.
- Document how to start each process locally.

**Completion criteria:**

- A developer can install dependencies and start the frontend and backend
  using documented commands.
- No real credentials or secrets are committed.

**Dependency:** Milestone 0.

### Milestone 2 — PostgreSQL, ORM, and migrations

**Outcome:** A versioned database foundation.

**Work:**

- Configure PostgreSQL connectivity and SQLAlchemy session lifecycle.
- Add the initial User, Session, Company, Application, status-history,
  Interview, and Reminder schema as scope requires.
- Create and test Alembic migrations.
- Define transaction, foreign-key, uniqueness, and deletion policies.

**Completion criteria:**

- A new local database can be created from migrations.
- Relationships and key constraints are tested.

**Dependency:** Milestone 1.

### Milestone 3 — Registration, login, and authorization

**Outcome:** Users can securely access only their own protected data.

**Work:**

- Implement registration, password hashing, login, current-session lookup,
  logout, session expiry, secure cookie configuration, and CSRF protection.
- Add an authentication dependency for protected API routes.
- Add two-account authorization tests.

**Completion criteria:**

- Valid registration/login/logout flows work.
- Expired and invalid sessions are rejected.
- Cross-account read and mutation tests pass.

**Dependency:** Milestone 2.

### Milestone 4 — Application and company management

**Outcome:** Users can persist and maintain the core job-search records.

**Work:**

- Implement company and application API schemas, routes, business rules, and
  ownership checks.
- Add application create, list, detail, edit, and delete UI.
- Validate salary, URLs, dates, required fields, and company association.
- Add frontend loading, empty, confirmation, and error states.

**Completion criteria:**

- An authenticated user can create, view, edit, and delete their records.
- Data survives a reload and is inaccessible to another account.

**Dependency:** Milestone 3.

### Milestone 5 — Status history and Kanban board

**Outcome:** Application progress can be updated and audited.

**Work:**

- Implement status transitions and atomic history recording.
- Build the status board and accessible status-change interaction.
- Refresh or roll back UI state appropriately on API failure.

**Completion criteria:**

- All seven statuses can be represented.
- Board moves persist and create exactly one corresponding history event.
- Failed requests do not display a false saved state.

**Dependency:** Milestone 4.

### Milestone 6 — Interviews and follow-up reminders

**Outcome:** Users can track upcoming conversations and their next actions.

**Work:**

- Add interview and reminder API operations and UI.
- Implement time-zone input/display rules.
- Add upcoming, overdue, completed, edit, and delete reminder behavior.

**Completion criteria:**

- Events are scoped through their owning application and persist correctly.
- Date/time behavior is verified for relevant time zones and daylight-saving
  transitions.

**Dependency:** Milestone 4; status history from Milestone 5 can proceed in
parallel if tasks are separated.

### Milestone 7 — Dashboard and analytics

**Outcome:** Users can understand progress and outcomes.

**Work:**

- Add dashboard summary and recent activity API queries.
- Add monthly application counts and status distribution.
- Add interview and offer conversion calculations from status history.
- Add accessible chart labels and zero-data states.

**Completion criteria:**

- Results match fixture data, including repeated transitions and zero
  denominators.
- All queries are scoped to the current user.

**Dependency:** Milestones 5 and 6.

### Milestone 8 — Quality, accessibility, and release readiness

**Outcome:** The MVP is ready for a controlled deployment.

**Work:**

- Run unit, API integration, frontend, and core end-to-end tests.
- Test keyboard navigation, responsive layouts, and screen-reader labels.
- Review security settings, CORS, CSRF, session expiry, logs, and error
  responses.
- Verify production environment configuration, migrations, backups, and
  deployment instructions.
- Measure representative list and dashboard response times.

**Completion criteria:**

- MVP acceptance criteria in `requirements.md` pass.
- No known blocker remains for privacy, data integrity, or critical workflows.
- A deployment and rollback procedure is documented.

**Dependency:** Milestones 1–7.

## 3. Suggested delivery order

The dependencies above allow Milestone 6's interview/reminder work to proceed
alongside the board after core application management is stable, but avoid
parallelizing early work while the schema and authentication model are still
changing. Dashboard analytics should follow status history so conversion
definitions are implemented against reliable data.

## 4. Deferred post-MVP candidates

Prioritize these only after measuring user needs and operational costs:

1. Password reset and email verification.
2. Search, filters, pagination improvements, and CSV import/export.
3. Email/calendar reminders.
4. Resume attachments and document storage.
5. OAuth or multi-factor authentication.
6. Advanced reporting and custom date ranges.
7. Collaboration or shared workspaces.

Each candidate needs a separate scope, security/privacy review, and acceptance
criteria before implementation.

## 5. Release checklist

- [ ] Registration, login, logout, expiry, and CSRF behavior verified.
- [ ] Cross-account access tests pass for every user-owned resource.
- [ ] Database can be created and upgraded from Alembic migrations.
- [ ] Application, company, status, interview, and reminder flows persist.
- [ ] Dashboard and analytics calculations match documented definitions.
- [ ] Errors are visible to users and do not leak secrets or stack traces.
- [ ] Keyboard and responsive checks cover core journeys.
- [ ] Production secrets are configured outside the source repository.
- [ ] Backup and restore approach is tested.
- [ ] MVP acceptance criteria are reviewed and approved.
