import { z } from "zod";

// ============================================
// COMPANIES
// ============================================
export interface Company {
  id: string;
  name: string;
}

// ============================================
// EMPLOYEES (also users for "act-as")
// ============================================
export interface Employee {
  id: string;
  name: string;
  title: string;
  email: string;
  isManager: boolean;
  legalCompanyId: string;  // The ONE company the employee legally belongs to
  managerId?: string;      // Which manager manages this employee (for non-managers)
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
  | "UPLOAD_CATALOG";

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
