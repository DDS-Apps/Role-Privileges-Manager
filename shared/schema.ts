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
// ROLE TEMPLATES
// ============================================
export interface RoleTemplate {
  role: string;
  privilegeIds: string[];
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
// DELEGATIONS
// ============================================
export type DelegationScope = "company-wide" | "employee-specific";

export interface Delegation {
  id: string;
  managerId: string;
  delegateId: string;
  companyId: string;
  scope: DelegationScope;
  targetEmployeeId?: string; // Only for employee-specific
  startDate?: string;
  endDate?: string;
  revokedAt?: string;
}

// ============================================
// REQUESTS (Approval Workflow)
// ============================================
export type RequestStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Applied";

export interface PrivilegeRequest {
  id: string;
  companyId: string;
  targetEmployeeId: string;
  createdBy: string;
  status: RequestStatus;
  beforePrivileges: string[];
  afterPrivileges: string[];
  approverComment?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AUDIT LOG
// ============================================
export type AuditActionType = 
  | "delegation_created"
  | "delegation_revoked"
  | "request_submitted"
  | "request_approved"
  | "request_rejected"
  | "assignments_applied";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
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
  roleTemplates: RoleTemplate[];
  assignments: Assignment[];
  delegations: Delegation[];
  requests: PrivilegeRequest[];
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
export const createDelegationSchema = z.object({
  delegateId: z.string(),
  companyId: z.string(),
  scope: z.enum(["company-wide", "employee-specific"]),
  targetEmployeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateDelegationRequest = z.infer<typeof createDelegationSchema>;

export const createRequestSchema = z.object({
  companyId: z.string(),
  targetEmployeeId: z.string(),
  afterPrivileges: z.array(z.string()),
  status: z.enum(["Draft", "Submitted"]),
});
export type CreateRequestBody = z.infer<typeof createRequestSchema>;

export const approveRejectSchema = z.object({
  comment: z.string().optional(),
});
export type ApproveRejectBody = z.infer<typeof approveRejectSchema>;
