# Business Users Roles and Privileges Management System

## Overview

Full-stack web application for managing business user roles and privileges across Dallah group companies. **Session-based login** supports contacts (GM/Admin per company) and line-manager employees. The primary workflow is **privilege requests** with admin/GM approval; direct assignment and catalog upload remain available.

The application manages:

- Companies and employees (`legalCompanyId`, `managerId`)
- Contacts as login users with per-company roles (`GM`, `2nd`, `Admin`, etc.)
- Privilege catalog: module / function / role (Finance module in seed data)
- Assignments per company context (cross-company privileges allowed)
- Privilege requests: `pending` → `active` | `rejected`
- Audit logging (`ADD_ROLE`, `REMOVE_ROLE`, `UPLOAD_CATALOG`, `REQUEST_*`, `EMPLOYEE_TERMINATED`)
- CSV catalog upload, Excel export, EN/AR + RTL UI

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State**: TanStack React Query (`credentials: "include"` for session cookies)
- **UI**: shadcn/ui on Radix UI, Tailwind
- **Build**: Vite with aliases `@/`, `@shared/`, `@assets/`

**Pages:** `/login`, `/` (dashboard), `/admin`, `/admin/contacts`

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API**: REST in `server/routes.ts`; contracts in `shared/routes.ts` + Zod in `shared/schema.ts`
- **Sessions**: `express-session` with memory store (MVP)
- **Data storage**: JSON files `data.json`, `audit.json` via `JsonStorage` in `server/storage.ts`
- **Postgres/Drizzle**: Scaffolded in `server/db.ts` but not used for app reads/writes yet

**Key API endpoints (authenticated unless noted):**

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | Public; demo password |
| GET | `/api/auth/me` | Session user |
| GET | `/api/bootstrap` | Full app snapshot + audit |
| POST | `/api/requests` | Create privilege request |
| GET | `/api/requests` | List/filter requests |
| PATCH | `/api/requests/:requestId` | Approve/reject (admin/GM) |
| POST | `/api/assignments/apply` | Direct privilege change |
| POST | `/api/uploadCatalog` | Replace catalog (managers) |
| GET | `/api/audit` | Audit log |
| GET | `/api/export/employee` | Excel export |
| POST | `/api/employees/:id/terminate` | Admin |
| CRUD | `/api/contacts` | Admin only |

### Data Model

- **Company** — Organization entity
- **Employee** — One `legalCompanyId`, optional `managerId`, `isManager`, `isAdmin`
- **Contact** — Login user; `companies[]` with role per company
- **Privilege** — Catalog row
- **Assignment** — `companyId` + `employeeId` + `privilegeIds[]`
- **PrivilegeRequest** — Manager submission with dates and status

**Manager authorization** (create request / direct apply):

- `employee.legalCompanyId === manager.legalCompanyId`
- `employee.managerId === managerId`

**Approval:** system admin or GM of target employee’s legal company; no self-approval. GMs auto-approve requests for employees in their legal company on submit.

### Privilege Catalog (Finance)

Functions under the **Finance** module include Accountant, Accounting and Reporting, Treasury Management, Financial Planning and Analysis, and Financial Auditing (see seed data in `server/storage.ts`).

### Shared Code

- `shared/schema.ts` — Types and Zod schemas
- `shared/routes.ts` — API route definitions

## Authentication (MVP)

1. **Contact** — email in `contacts`; may have multiple companies; `isAdmin` for system admin.
2. **Line manager** — `employees` with `isManager: true` matched by email.

Demo password for all users: `password` (configure for production).

The dashboard maps the logged-in user to an acting manager record; there is no separate anonymous “act as” mode.

## External Dependencies

- Radix UI, shadcn/ui, Lucide React
- Zod, xlsx, nodemailer (optional SMTP)
- Vite, esbuild, TypeScript
