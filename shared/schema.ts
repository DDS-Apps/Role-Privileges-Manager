import { z } from "zod";

// ============================================
// COMPANIES
// ============================================
export interface Company {
  id: string;
  name: string;
}

// ============================================
// CONTACTS (derived view — source of truth is AccessUser rows)
// ============================================
export interface ContactCompany {
  companyId: string;
  role: "GM" | "2nd" | "3rd" | "4th" | "Admin" | string;
}

export interface Contact {
  id: string;
  userId: string;       // SAP/HR number, may be empty
  name: string;
  email: string;        // lowercase, primary login identifier
  isAdmin: boolean;
  companies: ContactCompany[];
  managedModules?: string[];  // e.g. ["HR"], ["Finance"] — department head scope
  authType?: AuthType;
}

// ============================================
// ACCESS USERS (allow-list — only these may sign in)
// One row = one company access (or admin-only with null company)
// ============================================
export type AuthType = "sso" | "local";

export interface AccessUser {
  id: string;                   // row id, e.g. AU001
  personId: string;             // stable actor id across rows for same email
  email: string;                // lowercase identity key
  name: string;
  userId?: string;
  authType: AuthType;
  isAdmin: boolean;
  isActive: boolean;
  companyCode: string | null;
  companyName: string | null;
  contactRole: string | null;
  managedModules?: string[];
  username?: string;            // local only
  passwordHash?: string;        // local only — never send to client
}

export interface AccessCompany {
  companyCode: string;
  companyName: string;
  contactRole: string;
}

export interface ResolvedAccessUser {
  personId: string;
  email: string;
  name: string;
  userId: string;
  authType: AuthType;
  isAdmin: boolean;
  accesses: AccessCompany[];
  managedModules: string[] | null; // null = unrestricted (admin/GM)
  isUnrestrictedViewer: boolean;
  contact: Contact;
}

// ============================================
// EMPLOYEES (also users for "act-as")
// ============================================
export interface Employee {
  id: string;
  name: string;
  title: string;
  department?: string;
  email: string;
  isManager: boolean;
  isAdmin?: boolean;       // Admin users can approve/reject requests
  legalCompanyId: string;  // The ONE company the employee legally belongs to
  managerId?: string;      // Which manager manages this employee (for non-managers)
}

// ============================================
// REQUEST STATUS
// ============================================
export type RequestStatus = "pending" | "approved_pending_it" | "active" | "rejected";
export type RequestType = "grant" | "revoke";
export type ApprovalStage = "none" | "pending_requester_gm" | "pending_target_gm";

// Viewer context for module-scoped bootstrap filtering
export interface ViewerContext {
  actorId: string;
  isAdmin: boolean;
  isGM: boolean;
  /** null = unrestricted (GM/Admin); otherwise allowed module names */
  managedModules: string[] | null;
}

// ============================================
// PRIVILEGE REQUESTS (Manager creates, Admin approves)
// ============================================
export interface PrivilegeRequest {
  id: string;
  managerId: string;
  managerUserId?: string;        // Contact's HR/employee number (userId)
  managerLegalCompanyId: string;
  employeeId: string;
  companyId: string;           // Company context for privileges
  module: string;
  function: string;
  rolesSelected: string[];     // Array of privilege IDs
  requestType: RequestType;    // grant (default) or revoke (delete privilege)
  startDate: string;           // ISO date string
  endDate: string | null;      // ISO date string or null for no end
  status: RequestStatus;
  approvalStage: ApprovalStage;
  adminComments: string | null;
  supportRequestTitle?: string | null;
  supportTicketId?: string | null;
  itEmailSentAt?: string | null;
  itTicketLoggedAt?: string | null;
  itResolvedAt?: string | null;
  executedAt: string | null;   // when revoke removal was applied
  reinstatedAt: string | null; // when roles were restored after endDate
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PRIVILEGES CATALOG
// ============================================
export interface Privilege {
  id: string;
  module: string;
  function: string;
  role: string;
}

// ============================================
// ASSIGNMENTS (employee privileges per company context)
// Employees can have privileges in ANY company, not just their legal company
// ============================================
export interface Assignment {
  companyId: string;       // Company Context - where the privileges apply
  employeeId: string;
  privilegeIds: string[];
}

// ============================================
// AUDIT LOG
// ============================================
export type AuditActionType = 
  | "ADD_ROLE"
  | "REMOVE_ROLE"
  | "UPLOAD_CATALOG"
  | "UPLOAD_USER_ROLES"
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_APPROVED_STEP1"
  | "REQUEST_REJECTED"
  | "IT_EMAIL_SENT"
  | "IT_TICKET_LOGGED"
  | "IT_TICKET_RESOLVED"
  | "EMPLOYEE_TERMINATED";

export interface AuditEntry {
  id: string;
  timestamp: string;
  managerUserId: string;
  actionType: AuditActionType;
  companyId?: string;
  targetEmployeeId?: string;
  details: string;
}

// ============================================
// FULL APP DATA STRUCTURE
// ============================================
export interface AppData {
  companies: Company[];
  employees: Employee[];
  privileges: Privilege[];
  assignments: Assignment[];
  requests: PrivilegeRequest[];
  contacts: Contact[];
}

// ============================================
// BOOTSTRAP RESPONSE (for frontend init)
// ============================================
export interface BootstrapResponse extends AppData {
  auditLog: AuditEntry[];
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================
export const applyAssignmentsSchema = z.object({
  actorId: z.string(),
  companyId: z.string(),           // Company Context for privileges
  targetEmployeeId: z.string(),
  privilegeIds: z.array(z.string()),
});
export type ApplyAssignmentsRequest = z.infer<typeof applyAssignmentsSchema>;

export const uploadCatalogSchema = z.object({
  actorId: z.string(),
  catalog: z.array(z.object({
    module: z.string(),
    function: z.string(),
    role: z.string(),
  })),
});
export type UploadCatalogRequest = z.infer<typeof uploadCatalogSchema>;

// Create privilege request schema
export const createRequestSchema = z.object({
  managerId: z.string(),
  managerUserId: z.string().optional(),
  employeeId: z.string(),
  companyId: z.string(),
  module: z.string(),
  function: z.string(),
  rolesSelected: z.array(z.string()).min(1, "At least one role must be selected"),
  requestType: z.enum(["grant", "revoke"]).default("grant"),
  startDate: z.string(),
  endDate: z.string().nullable(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// Update request (admin approve/reject)
export const updateRequestSchema = z.object({
  status: z.enum(["active", "rejected"]),
  adminComments: z.string().nullable(),
});
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

// Terminate employee schema
export const terminateEmployeeSchema = z.object({
  employeeId: z.string(),
  adminId: z.string(),
});
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

export const fulfillItTicketSchema = z.object({
  ticketId: z.string().min(1),
});
export type FulfillItTicketInput = z.infer<typeof fulfillItTicketSchema>;

// ============================================
// USER ROLES IMPORT (ERP Excel upload)
// ============================================
export type UserRoleImportMode = "merge" | "replace";

export interface UserRoleImportRow {
  employeeId: string;
  /** Company where the privilege assignment applies (own or cross-company access). */
  companyId: string;
  /** Employee's legal/home company from Company_Code. */
  legalCompanyId: string;
  companyName?: string;
  module: string;
  function: string;
  role: string;
  roleName?: string;
  displayName?: string;
}

export interface UserRoleImportError {
  row: number;
  message: string;
}

export interface UserRoleImportResult {
  processed: number;
  assignmentsUpdated: number;
  privilegesCreated: number;
  companiesCreated: number;
  employeesCreated: number;
  skipped: number;
  errors: UserRoleImportError[];
}

export const userRoleImportModeSchema = z.enum(["merge", "replace"]).default("merge");
export const catalogImportModeSchema = z.enum(["merge", "replace"]).default("merge");

export interface CatalogImportResult {
  type: "catalog";
  processed: number;
  privilegesCreated: number;
  privilegesSkipped: number;
  mode: "merge" | "replace";
  errors: UserRoleImportError[];
}

export interface EmployeeRosterImportRow {
  employeeId: string;
  name: string;
  legalCompanyId: string;
  companyName?: string;
  email?: string;
  title?: string;
  managerId?: string;
  isManager: boolean;
}

export interface EmployeeRosterImportResult {
  type: "employees";
  processed: number;
  created: number;
  updated: number;
  managersLinked: number;
  skipped: number;
  errors: UserRoleImportError[];
}

export interface AccessUserImportResult {
  type: "access_users";
  processed: number;
  personsCreated: number;
  personsUpdated: number;
  rowsCreated: number;
  skipped: number;
  errors: UserRoleImportError[];
}
