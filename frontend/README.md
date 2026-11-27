# JobTrack Frontend

The frontend is a React + TypeScript single-page application built with Vite
and Tailwind CSS v4. React Router handles in-app navigation. The UI foundation
uses local, typed components in the shadcn/ui composition style; these
components are owned by this project and can be extended in small steps.

The application includes a responsive shell, reusable UI primitives,
API-backed application management, and a real dashboard/analytics view.
Dashboard metrics, charts, interviews, reminders, and activity are loaded from
the FastAPI API; the UI does not use mock records or hardcoded statistics.

## Requirements and setup

- Node.js 20.19+ or 22.12+ (a current Node.js LTS release)
- npm
- PowerShell on Windows

From the repository root:

```powershell
Set-Location .\frontend
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Set `VITE_API_BASE_URL` in `frontend\.env` if the backend is not at
`http://127.0.0.1:8000`. Vite variables prefixed with `VITE_` are included in
browser code; never place secrets or database credentials there.

## Start the frontend

From the `frontend` directory:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open the URL Vite prints (normally <http://127.0.0.1:5173>). Vite watches
source files and uses Hot Module Replacement to update the page during
development.

## Verify the app

```powershell
npm.cmd run build
npm.cmd run lint
```

The production bundle is written to `dist/`.

## Project structure

- `src/App.tsx`: application routes and the shared layout boundary.
- `src/components/layout/`: responsive sidebar, top bar, shell, and page
  header.
- `src/components/ui/`: reusable buttons, cards, badges, form fields, and
  table primitives.
- `src/components/feedback/`: consistent empty, loading, and error states.
- `src/pages/`: dashboard, analytics, application pages, and remaining feature
  placeholders.
- `src/components/dashboard/`: reusable dashboard statistic, chart, and summary
  list components.
- `src/hooks/useDashboardData.ts`: one cancellable dashboard-summary request
  shared by the dashboard and analytics pages.
- `src/lib/api/dashboard.ts`: typed response contract for dashboard and
  analytics data.
- `src/config/navigation.ts`: one navigation definition used by the sidebar.
- `src/lib/api/client.ts`: typed `fetch` wrapper and shared API error type.
- `src/index.css`: Tailwind v4 import and semantic design tokens.
- `components.json`: shadcn/ui-compatible project style and component aliases.

## Routing and pages

The sidebar links to Dashboard, Applications, Kanban Board, Companies,
Interviews, Reminders, Analytics, and Settings. Dashboard and Analytics call
`GET /api/analytics/dashboard`; application listing and detail routes use their
corresponding API endpoints. Kanban, company, interview, reminder, and settings
pages remain scoped placeholders until their feature milestones.

## API client

Import `apiClient` from `src/lib/api/client.ts` when a feature is ready to use
the backend:

```typescript
import { apiClient } from './lib/api/client'

interface ApiResponse<T> {
  data: T
}

const response = await apiClient.get<ApiResponse<Company[]>>('/api/companies')
```

The client uses the environment-provided base URL, sends browser credentials
for the planned cookie-based session flow, serializes JSON request bodies, and
throws `ApiError` with a stable code, HTTP status, message, and optional
validation details. Network failures are surfaced as `NETWORK_ERROR`.
Callers should catch `ApiError` and render the shared error state or
field-specific validation messages; the client never converts failures into
success-shaped data.

## Dashboard and charts

The dashboard requests one aggregate response rather than making separate
requests for each card or chart. Recharts renders the twelve-month
application-date trend and status distribution inside responsive containers.
The underlying chart values are also included as screen-reader text. Conversion
metrics use the counts returned by the API; a `null` rate is shown as "Not
enough data" when there are no applications that reached Applied.

## UI foundation

Components are intentionally small and typed. `Button` supports semantic
variants and sizes; `Card`, `Badge`, form controls, and table primitives share
the design tokens from `src/index.css`. `cn()` combines conditional classes
and resolves Tailwind class conflicts. `FormField` connects labels, hints,
and validation messages to native form controls.
