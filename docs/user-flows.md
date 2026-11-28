# JobTrack User Flows

## 1. Flow conventions

- The user is an individual job seeker using a browser.
- Protected actions require a valid account session.
- Every flow includes a visible loading, success, empty, or error state where
  applicable.
- Data shown after a successful change comes from a confirmed API response;
  the interface does not silently treat an unsaved change as complete.

## 2. Register and start tracking

1. Visitor opens the registration page.
2. Visitor enters email and password.
3. Frontend checks basic required-field and format rules and sends the request.
4. Backend normalizes the email, validates the request, checks uniqueness,
   hashes the password, creates the user, and starts an authenticated session.
5. On success, the user lands on an empty dashboard with a clear **Add
   application** action.
6. On invalid input or duplicate email, the page explains the issue without
   losing unrelated form input.

**Failure paths:** malformed email, weak password, duplicate email, network
failure, or service error. A failed registration must not create a partial
account or an authenticated session.

## 3. Log in and log out

### Log in

1. User enters email and password.
2. Backend verifies the password hash and creates a server-side session.
3. Browser receives the session cookie and opens the dashboard.
4. Invalid credentials produce a generic authentication error that does not
   reveal whether the email is registered.

### Log out

1. User selects **Log out**.
2. Backend invalidates the current session and clears the cookie.
3. Frontend returns to the login page.
4. A later request using the old session must fail.

## 4. Add an application

1. User selects **Add application** from the dashboard or applications page.
2. User enters required company name and job title, selects a status, and may
   enter location, salary range/currency, job URL, application date, and notes.
3. User may select an existing company or create company details for reuse.
4. Frontend presents validation feedback for missing or malformed values.
5. Backend verifies the session, validates ownership and input, creates the
   company if requested, creates the application, and records its initial
   status history entry in one transaction.
6. On success, the application detail/list and dashboard show the saved data.

**Failure paths:** invalid URL, salary minimum greater than maximum, invalid
date, missing required values, expired session, or server error. The form
should preserve input so the user can correct or retry.

## 5. View, edit, and delete an application

### View and edit

1. User opens the application list or board and selects an application.
2. The detail page shows its company, title, status, dates, notes, interviews,
   reminders, and activity where available.
3. User chooses **Edit**, changes fields, and saves.
4. Backend verifies application ownership, validates the update, persists it,
   and returns the saved representation.
5. On success, the UI reflects the returned values; on failure, it explains
   the error and retains the unsaved edits.

### Delete

1. User chooses **Delete**.
2. UI asks for confirmation and explains that deletion cannot be undone in the
   MVP.
3. After confirmation, backend verifies ownership and deletes the application
   according to the defined dependent-record policy.
4. UI returns to the list and refreshes counts and activity.
5. If deletion fails, the application remains visible and the UI reports the
   problem.

## 6. Move an application on the Kanban board

1. User opens the board; applications appear in columns for the seven statuses.
2. User moves a card to a new column with its drag handle, or focuses the
   keyboard-accessible drag handle, presses Space/Enter, uses an arrow key to
   choose a neighboring status, and presses Space/Enter again to drop.
3. Frontend sends the new status to the API.
4. Backend verifies ownership, validates the status, updates the application,
   and records a status history event atomically.
5. The board optimistically moves the card while the request is pending.
6. On success, the API response confirms the card's new status; applications
   loaded by the list page show that same persisted status.
7. On failure, the UI reports the problem and returns the card to its prior
   status.

## 7. Add and manage a company

1. User opens company selection while creating/editing an application, or
   opens the company area.
2. User enters company name and optional website, industry, location, and
   notes.
3. Backend creates or updates a company owned by that user.
4. The company detail page lists applications that reference it; the user can
   open an application, update the company details, or return to the directory.
5. A company can be selected for another application belonging to the same
   user.
6. If applications still reference a company, the delete action is disabled
   and explains that the company must first be detached from those
   applications. The API independently enforces this rule.

## 8. Schedule and review an interview

1. User opens the interview area and schedules an interview for one of their
   applications.
2. User enters local date/time, chooses HR, Technical, Managerial, or Other,
   and may enter notes and an outcome.
3. Backend validates the date/time and application ownership, then saves the
   interview with its associated application.
4. The interview area groups events into upcoming and past and links each one
   back to the application. Times display in the browser's local time zone.
5. After the interview, user edits its details or records an outcome, or
   deletes the event.

**Failure paths:** invalid date/time, expired session, or an application that
does not belong to the user. No event should be shown as saved until the
backend confirms it.

## 9. Create and complete a follow-up reminder

1. User opens the reminder area and chooses one of their applications, a
   follow-up date/time, and an optional note.
2. Backend verifies ownership and saves the reminder.
3. The reminder view lists it under **Upcoming** until due, then under
   **Overdue** while incomplete; times display in the browser's local time
   zone.
4. User marks it complete, reopens it, edits its due date/note, or deletes it.
5. The updated state is persisted and the reminder moves to the appropriate
   section.

Deleting an application removes its associated interviews and reminders as
cascaded dependent records. The application confirmation dialog names those
records before deletion; deleting a company never cascades to applications.

The MVP provides in-app reminders only; it does not send an email or device
notification.

## 10. Review dashboard and analytics

1. Authenticated user opens the dashboard.
2. Frontend makes one request to `GET /api/analytics/dashboard`.
3. Backend calculates counts and chart series from that user's applications,
   interviews, reminders, and status history.
4. Dashboard shows totals, active applications, future interviews, offers,
   rejections, recent applications, upcoming follow-ups, and recorded status
   activity.
5. User opens Analytics to see the same server-calculated monthly application
   trend, current status distribution, interview conversion, and offer
   conversion.
6. If there is not enough data (for example, a zero denominator), the
   interface displays a clear "Not enough data" state.

## 11. Session expiry and protected navigation

1. User navigates to a protected page without a valid session or a session
   expires.
2. Backend returns an unauthenticated response.
3. Frontend clears authenticated UI state, redirects to login, and may display
   a brief message that the session expired.
4. The user can log in again. Unsaved data should not be silently reported as
   saved.

## 12. Cross-account privacy check

1. User A creates an application.
2. User B signs in and attempts to open or mutate that application's identifier.
3. Backend scopes the lookup to User B and returns a not-found or forbidden
   response without returning User A's data.
4. Automated tests should cover read, update, delete, interview, reminder, and
   company association paths, not only the application detail page.
