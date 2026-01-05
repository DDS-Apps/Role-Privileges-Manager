import {
  AppData,
  AuditEntry,
  Company,
  Employee,
  ManagerCompanyAccess,
  EmployeeCompanyMembership,
  Privilege,
  RoleTemplate,
  Assignment,
  Delegation,
  PrivilegeRequest,
  BootstrapResponse,
  CreateDelegationRequest,
  CreateRequestBody,
  AuditActionType,
} from "@shared/schema";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapResponse>;
  
  // Delegations
  createDelegation(managerId: string, data: CreateDelegationRequest): Promise<Delegation>;
  revokeDelegation(id: string, actorId: string): Promise<Delegation>;
  
  // Requests
  createRequest(actorId: string, data: CreateRequestBody): Promise<PrivilegeRequest>;
  getRequests(status?: string, companyId?: string): Promise<PrivilegeRequest[]>;
  approveRequest(id: string, actorId: string, comment?: string): Promise<PrivilegeRequest>;
  rejectRequest(id: string, actorId: string, comment?: string): Promise<PrivilegeRequest>;
  
  // Audit
  getAuditLog(): Promise<AuditEntry[]>;
  
  // Helpers
  getAssignment(companyId: string, employeeId: string): Promise<Assignment | undefined>;
  getManagerCompanies(managerId: string): Promise<string[]>;
  getDelegatedCompanies(userId: string): Promise<string[]>;
}

export class JsonStorage implements IStorage {
  private dataPath: string;
  private auditPath: string;
  private data: AppData;
  private auditLog: AuditEntry[];
  private initialized: Promise<void>;

  constructor() {
    this.dataPath = path.join(process.cwd(), "data.json");
    this.auditPath = path.join(process.cwd(), "audit.json");
    this.data = this.getDefaultData();
    this.auditLog = [];
    this.initialized = this.init();
  }

  private getDefaultData(): AppData {
    const companies: Company[] = [
      { id: "C01", name: "Dallah Holding" },
      { id: "C02", name: "Dallah Healthcare" },
      { id: "C03", name: "Dallah Digital" },
    ];

    const employees: Employee[] = [
      { id: "E001", name: "Waleed Alahdal", title: "IT Lead", email: "waleed@example.com", isManager: true },
      { id: "E002", name: "Adnan Alqahtani", title: "Operations Manager", email: "adnan@example.com", isManager: true },
      { id: "E003", name: "Shahad Alharbi", title: "HR Specialist", email: "shahad@example.com", isManager: false },
      { id: "E004", name: "Jameel Ashraf", title: "GM Assistant", email: "jameel@example.com", isManager: false },
      { id: "E005", name: "Souhaib Khairallah", title: "Head of Automation", email: "souhaib@example.com", isManager: true },
      { id: "E006", name: "Ishfaq Pathan", title: "Infrastructure", email: "ishfaq@example.com", isManager: false },
      { id: "E007", name: "Sara Ahmed", title: "Finance Analyst", email: "sara@example.com", isManager: false },
      { id: "E008", name: "Khalid Saleh", title: "Treasury Officer", email: "khalid@example.com", isManager: false },
      { id: "E009", name: "Noor Hassan", title: "Accounting", email: "noor@example.com", isManager: false },
      { id: "E010", name: "Faisal Omar", title: "Business Analyst", email: "faisal@example.com", isManager: false },
    ];

    const managerAccess: ManagerCompanyAccess[] = [
      { managerId: "E001", companyIds: ["C01", "C03"] },
      { managerId: "E002", companyIds: ["C02"] },
      { managerId: "E005", companyIds: ["C03", "C01"] },
    ];

    const employeeMembership: EmployeeCompanyMembership[] = [
      { employeeId: "E001", companyIds: ["C01", "C03"] },
      { employeeId: "E002", companyIds: ["C02"] },
      { employeeId: "E003", companyIds: ["C01"] },
      { employeeId: "E004", companyIds: ["C01", "C02"] },
      { employeeId: "E005", companyIds: ["C03", "C01"] },
      { employeeId: "E006", companyIds: ["C03"] },
      { employeeId: "E007", companyIds: ["C02", "C01"] },
      { employeeId: "E008", companyIds: ["C02"] },
      { employeeId: "E009", companyIds: ["C02", "C03"] },
      { employeeId: "E010", companyIds: ["C03", "C01"] },
    ];

    const privileges: Privilege[] = [
      { id: "P_FIN_VIEW_REP", module: "FIN", function: "View Reports", role: "Accounting & Reporting" },
      { id: "P_FIN_POST_JRNL", module: "FIN", function: "Post Journal", role: "Accounting & Reporting" },
      { id: "P_FIN_APPR_PAY", module: "FIN", function: "Approve Payment", role: "Treasury" },
      { id: "P_FIN_CREATE_PAY", module: "FIN", function: "Create Payment", role: "Treasury" },
      { id: "P_HR_VIEW_EMP", module: "HR", function: "View Employees", role: "HR" },
      { id: "P_HR_UPD_EMP", module: "HR", function: "Update Employee", role: "HR" },
      { id: "P_SCM_VIEW_SUP", module: "SCM", function: "View Suppliers", role: "Procurement" },
      { id: "P_SCM_CREATE_PO", module: "SCM", function: "Create PO", role: "Procurement" },
      { id: "P_IT_MNG_USERS", module: "IT", function: "Manage Users", role: "System Admin" },
      { id: "P_IT_RESET_PWD", module: "IT", function: "Reset Password", role: "System Admin" },
      { id: "P_GEN_VIEW_DASH", module: "GEN", function: "View Dashboard", role: "Viewer" },
      { id: "P_GEN_EXPORT", module: "GEN", function: "Export Data", role: "Viewer" },
    ];

    const roleTemplates: RoleTemplate[] = [
      { role: "Viewer", privilegeIds: ["P_GEN_VIEW_DASH", "P_GEN_EXPORT"] },
      { role: "System Admin", privilegeIds: ["P_IT_MNG_USERS", "P_IT_RESET_PWD", "P_GEN_VIEW_DASH"] },
      { role: "Treasury", privilegeIds: ["P_FIN_APPR_PAY", "P_FIN_CREATE_PAY", "P_GEN_VIEW_DASH"] },
      { role: "Accounting & Reporting", privilegeIds: ["P_FIN_VIEW_REP", "P_FIN_POST_JRNL", "P_GEN_VIEW_DASH"] },
      { role: "HR", privilegeIds: ["P_HR_VIEW_EMP", "P_HR_UPD_EMP", "P_GEN_VIEW_DASH"] },
      { role: "Procurement", privilegeIds: ["P_SCM_VIEW_SUP", "P_SCM_CREATE_PO", "P_GEN_VIEW_DASH"] },
    ];

    const assignments: Assignment[] = [
      { companyId: "C01", employeeId: "E004", privilegeIds: ["P_GEN_VIEW_DASH", "P_GEN_EXPORT"] }, // Viewer
      { companyId: "C02", employeeId: "E004", privilegeIds: ["P_FIN_VIEW_REP", "P_FIN_POST_JRNL", "P_GEN_VIEW_DASH"] }, // Accounting
      { companyId: "C02", employeeId: "E007", privilegeIds: ["P_FIN_APPR_PAY", "P_FIN_CREATE_PAY", "P_GEN_VIEW_DASH"] }, // Treasury
      { companyId: "C03", employeeId: "E009", privilegeIds: ["P_GEN_VIEW_DASH", "P_GEN_EXPORT"] }, // Viewer
      { companyId: "C01", employeeId: "E010", privilegeIds: ["P_SCM_VIEW_SUP", "P_SCM_CREATE_PO", "P_GEN_VIEW_DASH"] }, // Procurement
      { companyId: "C03", employeeId: "E006", privilegeIds: ["P_IT_MNG_USERS", "P_IT_RESET_PWD", "P_GEN_VIEW_DASH"] }, // System Admin
    ];

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const delegations: Delegation[] = [
      {
        id: "DEL001",
        managerId: "E001",
        delegateId: "E006",
        companyId: "C03",
        scope: "company-wide",
        endDate: thirtyDaysLater.toISOString(),
      },
      {
        id: "DEL002",
        managerId: "E002",
        delegateId: "E003",
        companyId: "C02",
        scope: "employee-specific",
        targetEmployeeId: "E007",
      },
    ];

    const requests: PrivilegeRequest[] = [
      {
        id: "REQ001",
        companyId: "C03",
        targetEmployeeId: "E009",
        createdBy: "E006",
        status: "Submitted",
        beforePrivileges: ["P_GEN_VIEW_DASH", "P_GEN_EXPORT"],
        afterPrivileges: ["P_FIN_VIEW_REP", "P_FIN_POST_JRNL", "P_GEN_VIEW_DASH"],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    return {
      companies,
      employees,
      managerAccess,
      employeeMembership,
      privileges,
      roleTemplates,
      assignments,
      delegations,
      requests,
    };
  }

  private getDefaultAuditLog(): AuditEntry[] {
    const now = new Date();
    return [
      {
        id: "AUD001",
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        actorUserId: "E001",
        actionType: "delegation_created",
        companyId: "C03",
        details: "Waleed delegated company-wide access for C03 to Ishfaq",
      },
      {
        id: "AUD002",
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        actorUserId: "E006",
        actionType: "request_submitted",
        companyId: "C03",
        targetEmployeeId: "E009",
        details: "Ishfaq submitted request to change Noor privileges from Viewer to Accounting & Reporting",
      },
    ];
  }

  private async init() {
    try {
      const content = await fs.readFile(this.dataPath, "utf-8");
      this.data = JSON.parse(content);
    } catch {
      this.data = this.getDefaultData();
      await this.saveData();
    }

    try {
      const auditContent = await fs.readFile(this.auditPath, "utf-8");
      this.auditLog = JSON.parse(auditContent);
    } catch {
      this.auditLog = this.getDefaultAuditLog();
      await this.saveAudit();
    }
  }

  private async saveData() {
    const tempPath = this.dataPath + ".tmp";
    await fs.writeFile(tempPath, JSON.stringify(this.data, null, 2));
    await fs.rename(tempPath, this.dataPath);
  }

  private async saveAudit() {
    const tempPath = this.auditPath + ".tmp";
    await fs.writeFile(tempPath, JSON.stringify(this.auditLog, null, 2));
    await fs.rename(tempPath, this.auditPath);
  }

  private async addAuditEntry(
    actorUserId: string,
    actionType: AuditActionType,
    details: string,
    companyId?: string,
    targetEmployeeId?: string
  ) {
    await this.initialized;
    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      actorUserId,
      actionType,
      companyId,
      targetEmployeeId,
      details,
    };
    this.auditLog.push(entry);
    await this.saveAudit();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  async getBootstrapData(): Promise<BootstrapResponse> {
    await this.initialized;
    return {
      ...this.data,
      auditLog: this.auditLog,
    };
  }

  async getManagerCompanies(managerId: string): Promise<string[]> {
    await this.initialized;
    const access = this.data.managerAccess.find(m => m.managerId === managerId);
    return access?.companyIds || [];
  }

  async getDelegatedCompanies(userId: string): Promise<string[]> {
    await this.initialized;
    const now = new Date();
    const activeDelegations = this.data.delegations.filter(d => {
      if (d.delegateId !== userId) return false;
      if (d.revokedAt) return false;
      if (d.startDate && new Date(d.startDate) > now) return false;
      if (d.endDate && new Date(d.endDate) < now) return false;
      return true;
    });
    return [...new Set(activeDelegations.map(d => d.companyId))];
  }

  async getAssignment(companyId: string, employeeId: string): Promise<Assignment | undefined> {
    await this.initialized;
    return this.data.assignments.find(
      a => a.companyId === companyId && a.employeeId === employeeId
    );
  }

  async createDelegation(managerId: string, data: CreateDelegationRequest): Promise<Delegation> {
    await this.initialized;
    const delegation: Delegation = {
      id: randomUUID(),
      managerId,
      delegateId: data.delegateId,
      companyId: data.companyId,
      scope: data.scope,
      targetEmployeeId: data.targetEmployeeId,
      startDate: data.startDate,
      endDate: data.endDate,
    };
    this.data.delegations.push(delegation);
    await this.saveData();

    const manager = this.data.employees.find(e => e.id === managerId);
    const delegate = this.data.employees.find(e => e.id === data.delegateId);
    const company = this.data.companies.find(c => c.id === data.companyId);
    await this.addAuditEntry(
      managerId,
      "delegation_created",
      `${manager?.name} delegated ${data.scope} access for ${company?.name} to ${delegate?.name}`,
      data.companyId,
      data.targetEmployeeId
    );

    return delegation;
  }

  async revokeDelegation(id: string, actorId: string): Promise<Delegation> {
    await this.initialized;
    const delegation = this.data.delegations.find(d => d.id === id);
    if (!delegation) throw new Error("Delegation not found");

    delegation.revokedAt = new Date().toISOString();
    await this.saveData();

    const actor = this.data.employees.find(e => e.id === actorId);
    const delegate = this.data.employees.find(e => e.id === delegation.delegateId);
    const company = this.data.companies.find(c => c.id === delegation.companyId);
    await this.addAuditEntry(
      actorId,
      "delegation_revoked",
      `${actor?.name} revoked delegation for ${company?.name} from ${delegate?.name}`,
      delegation.companyId
    );

    return delegation;
  }

  async createRequest(actorId: string, data: CreateRequestBody): Promise<PrivilegeRequest> {
    await this.initialized;
    const existing = await this.getAssignment(data.companyId, data.targetEmployeeId);
    const request: PrivilegeRequest = {
      id: randomUUID(),
      companyId: data.companyId,
      targetEmployeeId: data.targetEmployeeId,
      createdBy: actorId,
      status: data.status,
      beforePrivileges: existing?.privilegeIds || [],
      afterPrivileges: data.afterPrivileges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.requests.push(request);
    await this.saveData();

    if (data.status === "Submitted") {
      const actor = this.data.employees.find(e => e.id === actorId);
      const target = this.data.employees.find(e => e.id === data.targetEmployeeId);
      const company = this.data.companies.find(c => c.id === data.companyId);
      await this.addAuditEntry(
        actorId,
        "request_submitted",
        `${actor?.name} submitted privilege change request for ${target?.name} in ${company?.name}`,
        data.companyId,
        data.targetEmployeeId
      );
    }

    return request;
  }

  async getRequests(status?: string, companyId?: string): Promise<PrivilegeRequest[]> {
    await this.initialized;
    let requests = this.data.requests;
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    if (companyId) {
      requests = requests.filter(r => r.companyId === companyId);
    }
    return requests;
  }

  async approveRequest(id: string, actorId: string, comment?: string): Promise<PrivilegeRequest> {
    await this.initialized;
    const request = this.data.requests.find(r => r.id === id);
    if (!request) throw new Error("Request not found");

    request.status = "Approved";
    request.approverComment = comment;
    request.updatedAt = new Date().toISOString();

    // Apply the changes
    const existingIdx = this.data.assignments.findIndex(
      a => a.companyId === request.companyId && a.employeeId === request.targetEmployeeId
    );
    if (existingIdx >= 0) {
      this.data.assignments[existingIdx].privilegeIds = request.afterPrivileges;
    } else {
      this.data.assignments.push({
        companyId: request.companyId,
        employeeId: request.targetEmployeeId,
        privilegeIds: request.afterPrivileges,
      });
    }

    request.status = "Applied";
    await this.saveData();

    const actor = this.data.employees.find(e => e.id === actorId);
    const target = this.data.employees.find(e => e.id === request.targetEmployeeId);
    const company = this.data.companies.find(c => c.id === request.companyId);
    await this.addAuditEntry(
      actorId,
      "request_approved",
      `${actor?.name} approved privilege change for ${target?.name} in ${company?.name}`,
      request.companyId,
      request.targetEmployeeId
    );
    await this.addAuditEntry(
      actorId,
      "assignments_applied",
      `Privileges updated for ${target?.name} in ${company?.name}`,
      request.companyId,
      request.targetEmployeeId
    );

    return request;
  }

  async rejectRequest(id: string, actorId: string, comment?: string): Promise<PrivilegeRequest> {
    await this.initialized;
    const request = this.data.requests.find(r => r.id === id);
    if (!request) throw new Error("Request not found");

    request.status = "Rejected";
    request.approverComment = comment;
    request.updatedAt = new Date().toISOString();
    await this.saveData();

    const actor = this.data.employees.find(e => e.id === actorId);
    const target = this.data.employees.find(e => e.id === request.targetEmployeeId);
    const company = this.data.companies.find(c => c.id === request.companyId);
    await this.addAuditEntry(
      actorId,
      "request_rejected",
      `${actor?.name} rejected privilege change for ${target?.name} in ${company?.name}`,
      request.companyId,
      request.targetEmployeeId
    );

    return request;
  }

  async getAuditLog(): Promise<AuditEntry[]> {
    await this.initialized;
    return this.auditLog.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const storage = new JsonStorage();
