# Business Users Roles and Privileges Management System

## Overview

This is a full-stack web application for managing business user roles and privileges across multiple companies. Managers can directly add or remove privileges for employees in their accessible companies. The system features an "Act as Manager" dropdown for MVP testing without authentication.

The application manages:
- Companies and employee membership (employees can belong to multiple companies)
- Privilege assignments with module/function/role structure
- Direct privilege management (managers add/remove privileges immediately)
- CSV upload for privilege catalog
- Audit logging for compliance (ADD_ROLE, REMOVE_ROLE, UPLOAD_CATALOG)
- Multi-language support (English/Arabic with RTL)
- Excel export functionality

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Build Tool**: Vite with React plugin and path aliases (@/, @shared/, @assets/)

The frontend follows a single-page application pattern with the main dashboard handling all privilege management features.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Data Storage**: JSON file-based storage (`data.json`, `audit.json`) for MVP

Key API endpoints:
- `GET /api/bootstrap` - Initial data load for frontend
- `POST /api/assignments/apply` - Apply privilege changes (add/remove)
- `POST /api/uploadCatalog` - Upload new privilege catalog from CSV
- `GET /api/audit` - Get audit log
- `GET /api/export/employee` - Export employee privileges to Excel

### Data Model
The system uses these core entities:
- **Companies**: Organizations (Dallah Holding, Healthcare, Digital)
- **Employees**: 10 employees with manager flag for access control
- **Privileges**: Module/Function/Role catalog (FIN, HR, IT, GEN modules)
- **Manager Access**: Which companies each manager can manage
- **Employee Membership**: Which companies each employee belongs to
- **Assignments**: Employee-to-privilege mappings per company
- **Audit Log**: Timestamped action records (ADD_ROLE, REMOVE_ROLE, UPLOAD_CATALOG)

### Privilege Catalog Structure
- **FIN (Finance)**: Payments (Treasury Approver/Creator), Reporting (Accounting Viewer/Poster)
- **HR (Human Resources)**: Employee Data (HR Viewer/Editor)
- **IT (Information Technology)**: User Admin (User Manager/Password Reset)
- **GEN (General)**: Dashboard (Dashboard Viewer/Exporter)

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - TypeScript interfaces and Zod validation schemas
- `routes.ts` - API route definitions with request/response types

## Seeded Test Data

### Managers (shown in Act-as dropdown)
- E001 Waleed Alahdal (IT Lead) - manages C01, C03
- E002 Adnan Alqahtani (Operations Manager) - manages C02
- E005 Souhaib Khairallah (Head of Automation) - manages C03, C01

### Non-Manager Employees
- E003 Shahad Alharbi (HR Specialist) - C01
- E004 Jameel Ashraf (GM Assistant) - C01, C02
- E006 Ishfaq Pathan (Infrastructure) - C03
- E007 Sara Ahmed (Finance Analyst) - C02, C01
- E008 Khalid Saleh (Treasury Officer) - C02
- E009 Noor Hassan (Accounting) - C02, C03
- E010 Faisal Omar (Business Analyst) - C03, C01

## External Dependencies

### UI Component Libraries
- **Radix UI**: Full suite of accessible primitives
- **shadcn/ui**: Pre-built component variants using Radix + Tailwind
- **Lucide React**: Icon library

### Data & Validation
- **Zod**: Schema validation for API requests and form data
- **xlsx**: Excel file generation for privilege exports

### Development Tools
- **Vite**: Development server with HMR
- **esbuild**: Production bundling for server
- **TypeScript**: Type checking across the stack
