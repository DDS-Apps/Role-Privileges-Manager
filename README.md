# Role-Privileges-Manager

Business Users Roles and Privileges Management System for the Dallah corporate group. Managers submit privilege requests (module → function → role) scoped by company context; admins and GMs approve them. State persists in JSON files with audit logging. The UI supports English and Arabic (RTL).

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5000` (or the port set by `PORT`).

**Only allow-listed contacts may sign in** (`access-users.json`). Microsoft SSO or a local username/password proves identity; the allow-list decides access and company roles. Employee `isManager` is org hierarchy only — it is not a login path.

Local bootstrap admin (after first migrate): username `spadmin` / password `password`.

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
- **Persistence (MVP):** `data.json`, `audit.json`, **`access-users.json`** (login allow-list) via `server/storage.ts` / `server/access-users.ts`

### Auth

| Path | Who | How |
|------|-----|-----|
| SSO | `authType: sso` (default) | MSAL → Entra ID token → email must exist in allow-list |
| Local | `authType: local` | Username + bcrypt password → allow-list |

After login, **managedModules** from the allow-list are applied (admins/GMs unrestricted). Multi-company access = multiple allow-list rows with the same email.

### Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/login` | Public | Microsoft SSO and/or local allow-list login |
| `/` | Authenticated | Manager dashboard — employees, privileges, requests |
| `/admin` | Admin | Approve/reject requests, terminate employees, **import ERP user roles (Excel)** |
| `/admin/contacts` | Admin | Allow-list contact CRUD |

### Main workflow

1. Manager logs in and selects a working company.
2. Manager selects an employee and submits a **privilege request** (`POST /api/requests`).
3. Request stays `pending` unless the submitter is GM of the employee’s legal company (auto-approved for internal grants only).
4. Admin or GM approves/rejects (`PATCH /api/requests/:id`) — after **final GM approval**, RPM emails **Support@dallah.com**; request becomes `approved_pending_it`.
5. ServiceDeskPlus logs a ticket and replies (subject `##RE-xxxxx##`, body contains the request title). When IT resolves the ticket, a **Resolved** email is received and RPM sets the request `active` and applies privileges.
6. All actions are recorded in `audit.json`.

**ERP user roles import (Admin → Import user roles):** upload `.xlsx` with columns `USERNAME`, `Company_Code` (or `DATA_ACCESS_COMPANY_CODE`), `Module_Name`, `Business Role Name` / `ROLE_COMMON_NAME`. Import **merges** new privileges and assignments without removing existing ones.

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
| `AZURE_AD_TENANT_ID` | Entra tenant for SSO token validation |
| `AZURE_AD_CLIENT_ID` | Entra app (client) id |
| `AZURE_AD_AUDIENCE` | Optional; defaults to client id |
| `VITE_AZURE_AD_CLIENT_ID` | Client-side MSAL client id |
| `VITE_AZURE_AD_TENANT_ID` | Client-side MSAL tenant |
| `VITE_AZURE_AD_REDIRECT_URI` | Optional; defaults to `window.location.origin` |
| `SMTP_*` | Optional Office 365 email on new requests |
| `IMAP_HOST` | IMAP host for ServiceDesk reply polling (default `outlook.office365.com`) |
| `IMAP_PORT` | IMAP port (default `993`) |
| `IMAP_USER` / `IMAP_PASS` | Defaults to `SMTP_USER` / `SMTP_PASS` |
| `IT_EMAIL_POLL_INTERVAL_MS` | Poll interval (default `60000`) |
| `IT_EMAIL_FROM_ALLOWLIST` | Comma-separated sender substrings to accept (default `support`) |
| `DATABASE_URL` | Optional; Drizzle is scaffolded but not used for app data yet |

## Project layout

```
client/src/     UI pages and components
server/         Express routes, JSON storage, email, access-users, Entra verify
shared/         Zod schemas and API contracts
scripts/        import_privileges.py (optional catalog import)
data.json       Application data (created on first run if missing)
access-users.json  Login allow-list (migrated from contacts on first run)
audit.json      Audit log
```

See [replit.md](replit.md) for domain model, Finance catalog structure, and seeded test data notes.

## Security (MVP)

- Only emails present in `access-users.json` can obtain a session (SSO or local).
- Local passwords are bcrypt-hashed; SSO users cannot use local login and vice versa.
- In-memory sessions — use a persistent store and secure cookies for production.
- API mutations require an authenticated session.
- For production: real IdP, Postgres via `IStorage`, and persistent session store.
