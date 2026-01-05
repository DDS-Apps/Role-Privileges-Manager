# Business Users Roles and Privileges Management System

## Overview

This is a full-stack web application for managing business user roles, privileges, and delegations across multiple companies. The system allows managers to delegate access to other users, submit privilege change requests, and maintain an audit trail of all actions. It features an "Act as user" dropdown for MVP testing without authentication, supporting simulation of different user roles and permissions.

The application manages:
- Companies and employee membership
- Privilege assignments with module/function/role structure
- Manager delegation workflows (company-wide or employee-specific)
- Privilege change requests with approval/rejection flow
- Role templates for quick privilege assignment
- Audit logging for compliance
- Multi-language support (English/Arabic)

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

The frontend follows a single-page application pattern with the main dashboard handling all privilege management features. Components are organized in a flat structure under `client/src/components/ui/` for reusable UI primitives.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Data Storage**: JSON file-based storage (`data.json`, `audit.json`) for MVP, with Drizzle ORM configured for future PostgreSQL migration

Key API endpoints:
- `GET /api/bootstrap` - Initial data load for frontend
- `POST /api/delegations` - Create manager delegations
- `POST /api/delegations/:id/revoke` - Revoke delegations
- `POST /api/requests` - Submit privilege change requests
- `POST /api/requests/:id/approve` and `/reject` - Handle request workflow

### Data Model
The system uses these core entities:
- **Companies**: Organizations (Dallah Holding, Healthcare, Digital)
- **Employees**: Users with manager flag for access control
- **Privileges**: Module/Function/Role catalog
- **Assignments**: Employee-to-privilege mappings per company
- **Delegations**: Manager-to-user access grants (company-wide or employee-specific)
- **Requests**: Privilege change workflow items with status tracking
- **Audit Log**: Timestamped action records

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - TypeScript interfaces and Zod validation schemas
- `routes.ts` - API route definitions with request/response types

## External Dependencies

### Database
- **Drizzle ORM**: Configured for PostgreSQL via `drizzle.config.ts`
- **PostgreSQL**: Connection via `DATABASE_URL` environment variable (optional for MVP, uses JSON storage as fallback)
- **connect-pg-simple**: Session storage for future authentication

### UI Component Libraries
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, select, tabs, etc.)
- **shadcn/ui**: Pre-built component variants using Radix + Tailwind
- **Lucide React**: Icon library
- **cmdk**: Command palette component
- **embla-carousel-react**: Carousel functionality
- **vaul**: Drawer component

### Data & Validation
- **Zod**: Schema validation for API requests and form data
- **drizzle-zod**: Integration between Drizzle schemas and Zod
- **date-fns**: Date formatting utilities

### Export Features
- **xlsx**: Excel file generation for privilege exports

### Development Tools
- **Vite**: Development server with HMR
- **esbuild**: Production bundling for server
- **TypeScript**: Type checking across the stack