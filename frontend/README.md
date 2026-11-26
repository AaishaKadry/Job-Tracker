# JobTrack Frontend

The frontend is a React + TypeScript single-page application built with Vite
and styled with Tailwind CSS. The current page is a starter screen confirming
that the frontend is running; it does not yet call the backend.

## Requirements

- Node.js 20.19+ or 22.12+ (use a current Node.js LTS release)
- npm
- PowerShell on Windows

## Set up the frontend

From the repository root:

```powershell
cd .\frontend
npm.cmd install
Copy-Item .env.example .env
```

The `VITE_API_BASE_URL` example documents the local backend URL for future API
integration; it is not used by the starter page yet. Vite exposes variables
prefixed with `VITE_` to browser code, so never put secrets in frontend
environment variables.

## Start the development server

From the `frontend` directory:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite (normally
<http://127.0.0.1:5173>). Vite watches source files and updates the page using
Hot Module Replacement.

## Build and lint

```powershell
npm.cmd run build
npm.cmd run lint
```

The production build is written to `dist/`.
