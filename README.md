# Role-Privileges-Manager

Business Users Roles and Privileges Management System for the Dallah corporate group. Managers submit privilege requests (module → function → role) scoped by company context; admins and GMs approve them. State persists in JSON files with audit logging. The UI supports English and Arabic (RTL).

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5000` (or the port set by `PORT`). MVP login uses any registered contact or line-manager email with password `password` (see `server/routes.ts`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Express + Vite dev server |
| `npm run build` | Production client + server bundle |
| `npm start` | Run production build |
| `npm run check` | TypeScript check |
| `npm run db:push` | Drizzle push (Postgres scaffold only; storage is JSON today) |

## Architecture

- **Frontend:** React 18, Wouter, TanStack Query, shadcn/ui, Tailwind — `client/`
- **Backend:** Express, TypeScript — `server/`
- **Shared types/API:** `shared/schema.ts`, `shared/routes.ts`
- **Persistence (MVP):** `data.json`, `audit.json` via `server/storage.ts`

### Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/login` | Public | Session login (contacts or line managers) |
| `/` | Authenticated | Manager dashboard — employees, privileges, requests |
| `/admin` | Admin | Approve/reject requests, terminate employees |
| `/admin/contacts` | Admin | Contact CRUD |

### Main workflow

1. Manager logs in and selects a working company.
2. Manager selects an employee and submits a **privilege request** (`POST /api/requests`).
3. Request stays `pending` unless the submitter is GM of the employee’s legal company (auto-approved for internal grants only).
4. Admin or GM approves/rejects (`PATCH /api/requests/:id`) — active requests update assignments. **External grants** (employee’s legal company ≠ access company) require two GM approvals: requester’s company GM (step 1), then employee’s legal company GM (step 2).
5. All actions are recorded in `audit.json`.

Legacy direct assignment: `POST /api/assignments/apply` (still available for managers).

### Authorization

- **Manager → employee:** same `legalCompanyId` and `employee.managerId === managerId`.
- **Approval:** system admin, or GM of the target employee’s legal company (internal grants); external grants use a two-step GM chain (requester company → employee legal company). Requester cannot approve own request.
- **Module visibility:** GMs and system admins see all modules. Other contacts are scoped by `managedModules` on their contact record — assign via **Admin → Contacts** (multi-select). Bootstrap data and requests are filtered server-side for scoped viewers.

## Environment

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default `5000`) |
| `SESSION_SECRET` | Express session secret |
| `NODE_ENV` | `development` or `production` |
| `SMTP_*` | Optional Office 365 email on new requests |
| `DATABASE_URL` | Optional; Drizzle is scaffolded but not used for app data yet |

## Project layout

```
client/src/     UI pages and components
server/         Express routes, JSON storage, email
shared/         Zod schemas and API contracts
scripts/        import_privileges.py (optional catalog import)
data.json       Application data (created on first run if missing)
audit.json      Audit log
```

See [replit.md](replit.md) for domain model, Finance catalog structure, and seeded test data notes.

## Security (MVP)

- Shared demo password and in-memory sessions — not production-ready.
- API mutations require an authenticated session.
- For production: real IdP, Postgres via `IStorage`, and persistent session store.
