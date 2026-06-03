import { z } from "zod";

// ============================================
// COMPANIES
// ============================================
export interface Company {
  id: string;
  name: string;
}

// ============================================
// CONTACTS (login users — real company contacts)
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
export type RequestStatus = "pending" | "active" | "rejected";

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
  startDate: string;           // ISO date string
  endDate: string | null;      // ISO date string or null for no end
  status: RequestStatus;
  adminComments: string | null;
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
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
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
