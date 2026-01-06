import {
  AppData,
  AuditEntry,
  Company,
  Employee,
  ManagerCompanyAccess,
  EmployeeCompanyMembership,
  Privilege,
  Assignment,
  BootstrapResponse,
  AuditActionType,
} from "@shared/schema";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapResponse>;
  
  // Assignments
  applyAssignments(
    managerId: string, 
    companyId: string, 
    employeeId: string, 
    privilegeIds: string[]
  ): Promise<Assignment>;
  
  // Catalog
  uploadCatalog(managerId: string, catalog: { module: string; function: string; role: string }[]): Promise<Privilege[]>;
  
  // Audit
  getAuditLog(): Promise<AuditEntry[]>;
  
  // Helpers
  getAssignment(companyId: string, employeeId: string): Promise<Assignment | undefined>;
  getManagerCompanies(managerId: string): Promise<string[]>;
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

    // Updated privileges catalog per new requirements
    const privileges: Privilege[] = [
      // FIN - Payments
      { id: "P_FIN_PAY_TAPPR", module: "FIN", function: "Payments", role: "Treasury Approver" },
      { id: "P_FIN_PAY_TCREA", module: "FIN", function: "Payments", role: "Treasury Creator" },
      // FIN - Reporting
      { id: "P_FIN_REP_AVIEW", module: "FIN", function: "Reporting", role: "Accounting Viewer" },
      { id: "P_FIN_REP_APOST", module: "FIN", function: "Reporting", role: "Accounting Poster" },
      // HR - Employee Data
      { id: "P_HR_EMP_VIEW", module: "HR", function: "Employee Data", role: "HR Viewer" },
      { id: "P_HR_EMP_EDIT", module: "HR", function: "Employee Data", role: "HR Editor" },
      // IT - User Admin
      { id: "P_IT_USR_MNGR", module: "IT", function: "User Admin", role: "User Manager" },
      { id: "P_IT_USR_PWRST", module: "IT", function: "User Admin", role: "Password Reset" },
      // GEN - Dashboard
      { id: "P_GEN_DASH_VIEW", module: "GEN", function: "Dashboard", role: "Dashboard Viewer" },
      { id: "P_GEN_DASH_EXP", module: "GEN", function: "Dashboard", role: "Exporter" },
    ];

    // Seeded current assignments per requirements
    const assignments: Assignment[] = [
      { companyId: "C01", employeeId: "E004", privilegeIds: ["P_GEN_DASH_VIEW"] },
      { companyId: "C02", employeeId: "E004", privilegeIds: ["P_FIN_REP_AVIEW"] },
      { companyId: "C02", employeeId: "E007", privilegeIds: ["P_FIN_PAY_TCREA"] },
      { companyId: "C03", employeeId: "E006", privilegeIds: ["P_IT_USR_MNGR", "P_IT_USR_PWRST"] },
    ];

    return {
      companies,
      employees,
      managerAccess,
      employeeMembership,
      privileges,
      assignments,
    };
  }

  private getDefaultAuditLog(): AuditEntry[] {
    return [];
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
    managerUserId: string,
    actionType: AuditActionType,
    details: string,
    companyId?: string,
    targetEmployeeId?: string
  ) {
    await this.initialized;
    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      managerUserId,
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

  async getAssignment(companyId: string, employeeId: string): Promise<Assignment | undefined> {
    await this.initialized;
    return this.data.assignments.find(
      a => a.companyId === companyId && a.employeeId === employeeId
    );
  }

  async applyAssignments(
    managerId: string,
    companyId: string,
    employeeId: string,
    privilegeIds: string[]
  ): Promise<Assignment> {
    await this.initialized;

    // Validate manager has access to the company
    const managerAccess = this.data.managerAccess.find(m => m.managerId === managerId);
    if (!managerAccess || !managerAccess.companyIds.includes(companyId)) {
      throw new Error("Manager does not have access to this company");
    }

    // Validate employee belongs to the company
    const membership = this.data.employeeMembership.find(m => m.employeeId === employeeId);
    if (!membership || !membership.companyIds.includes(companyId)) {
      throw new Error("Employee does not belong to this company");
    }

    // Validate all privilege IDs exist in the catalog
    const validPrivilegeIds = this.data.privileges.map(p => p.id);
    const invalidIds = privilegeIds.filter(id => !validPrivilegeIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid privilege IDs: ${invalidIds.join(", ")}`);
    }

    // Get existing assignment
    const existing = await this.getAssignment(companyId, employeeId);
    const beforePrivileges = existing?.privilegeIds || [];

    // Determine added and removed privileges
    const added = privilegeIds.filter(p => !beforePrivileges.includes(p));
    const removed = beforePrivileges.filter(p => !privilegeIds.includes(p));

    // Update or create assignment
    const existingIdx = this.data.assignments.findIndex(
      a => a.companyId === companyId && a.employeeId === employeeId
    );
    
    const assignment: Assignment = {
      companyId,
      employeeId,
      privilegeIds,
    };

    if (existingIdx >= 0) {
      this.data.assignments[existingIdx] = assignment;
    } else {
      this.data.assignments.push(assignment);
    }

    await this.saveData();

    // Log audit entries
    const manager = this.data.employees.find(e => e.id === managerId);
    const target = this.data.employees.find(e => e.id === employeeId);
    const company = this.data.companies.find(c => c.id === companyId);

    for (const privId of added) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        managerId,
        "ADD_ROLE",
        `${manager?.name} added ${priv?.module}/${priv?.function}/${priv?.role} to ${target?.name} in ${company?.name}`,
        companyId,
        employeeId
      );
    }

    for (const privId of removed) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        managerId,
        "REMOVE_ROLE",
        `${manager?.name} removed ${priv?.module}/${priv?.function}/${priv?.role} from ${target?.name} in ${company?.name}`,
        companyId,
        employeeId
      );
    }

    return assignment;
  }

  async uploadCatalog(
    managerId: string,
    catalog: { module: string; function: string; role: string }[]
  ): Promise<Privilege[]> {
    await this.initialized;

    // Generate new privileges from catalog with unique IDs
    const newPrivileges: Privilege[] = catalog.map((item, idx) => ({
      id: `P_${item.module}_${item.function.replace(/\s+/g, '')}_${item.role.replace(/\s+/g, '')}_${idx}`.toUpperCase(),
      module: item.module,
      function: item.function,
      role: item.role,
    }));

    const newPrivilegeIds = new Set(newPrivileges.map(p => p.id));
    
    // Reconcile existing assignments - remove stale privilege IDs
    const manager = this.data.employees.find(e => e.id === managerId);
    
    for (const assignment of this.data.assignments) {
      const beforeIds = [...assignment.privilegeIds];
      const validIds = assignment.privilegeIds.filter(id => newPrivilegeIds.has(id));
      const removedIds = beforeIds.filter(id => !newPrivilegeIds.has(id));
      
      // Log removed privileges
      for (const removedId of removedIds) {
        const oldPriv = this.data.privileges.find(p => p.id === removedId);
        const target = this.data.employees.find(e => e.id === assignment.employeeId);
        const company = this.data.companies.find(c => c.id === assignment.companyId);
        await this.addAuditEntry(
          managerId,
          "REMOVE_ROLE",
          `${manager?.name} catalog upload removed ${oldPriv?.module || "unknown"}/${oldPriv?.function || "unknown"}/${oldPriv?.role || "unknown"} from ${target?.name} in ${company?.name}`,
          assignment.companyId,
          assignment.employeeId
        );
      }
      
      assignment.privilegeIds = validIds;
    }
    
    // Remove empty assignments
    this.data.assignments = this.data.assignments.filter(a => a.privilegeIds.length > 0);

    this.data.privileges = newPrivileges;
    
    await this.saveData();

    await this.addAuditEntry(
      managerId,
      "UPLOAD_CATALOG",
      `${manager?.name} uploaded new privilege catalog with ${newPrivileges.length} entries`
    );

    return newPrivileges;
  }

  async getAuditLog(): Promise<AuditEntry[]> {
    await this.initialized;
    return this.auditLog.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const storage = new JsonStorage();
