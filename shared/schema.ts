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
}

// ============================================
// MANAGER-TO-COMPANY ACCESS
// ============================================
export interface ManagerCompanyAccess {
  managerId: string;
  companyIds: string[];
}

// ============================================
// EMPLOYEE-TO-COMPANY MEMBERSHIP
// ============================================
export interface EmployeeCompanyMembership {
  employeeId: string;
  companyIds: string[];
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
// ASSIGNMENTS (employee privileges per company)
// ============================================
export interface Assignment {
  companyId: string;
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
  managerAccess: ManagerCompanyAccess[];
  employeeMembership: EmployeeCompanyMembership[];
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
  companyId: z.string(),
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
