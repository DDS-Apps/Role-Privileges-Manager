import {
  AppData,
  AuditEntry,
  Company,
  Employee,
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
  getLegalEmployees(managerId: string): Promise<Employee[]>;
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

    // Updated employees with legalCompanyId and managerId
    // Managers: E001 (Waleed - C01), E002 (Adnan - C02), E005 (Souhaib - C03)
    const employees: Employee[] = [
      { id: "E001", name: "Waleed Alahdal", title: "IT Lead", email: "waleed@example.com", isManager: true, legalCompanyId: "C01" },
      { id: "E002", name: "Adnan Alqahtani", title: "Operations Manager", email: "adnan@example.com", isManager: true, legalCompanyId: "C02" },
      { id: "E003", name: "Shahad Alharbi", title: "HR Specialist", email: "shahad@example.com", isManager: false, legalCompanyId: "C01", managerId: "E001" },
      { id: "E004", name: "Jameel Ashraf", title: "GM Assistant", email: "jameel@example.com", isManager: false, legalCompanyId: "C01", managerId: "E001" },
      { id: "E005", name: "Souhaib Khairallah", title: "Head of Automation", email: "souhaib@example.com", isManager: true, legalCompanyId: "C03" },
      { id: "E006", name: "Ishfaq Pathan", title: "Infrastructure", email: "ishfaq@example.com", isManager: false, legalCompanyId: "C03", managerId: "E005" },
      { id: "E007", name: "Sara Ahmed", title: "Finance Analyst", email: "sara@example.com", isManager: false, legalCompanyId: "C02", managerId: "E002" },
      { id: "E008", name: "Khalid Saleh", title: "Treasury Officer", email: "khalid@example.com", isManager: false, legalCompanyId: "C02", managerId: "E002" },
      { id: "E009", name: "Noor Hassan", title: "Accounting", email: "noor@example.com", isManager: false, legalCompanyId: "C02", managerId: "E002" },
      { id: "E010", name: "Faisal Omar", title: "Business Analyst", email: "faisal@example.com", isManager: false, legalCompanyId: "C03", managerId: "E005" },
    ];

    // Privileges catalog from Excel file - Finance, HR, SCM modules
    const privileges: Privilege[] = [
      // Finance - Accountant
      { id: "P_FIN_ACC_01", module: "Finance", function: "Accountant", role: "Create financial journal entries" },
      { id: "P_FIN_ACC_02", module: "Finance", function: "Accountant", role: "Record bills/invoices, credit notes, advances and make payments" },
      { id: "P_FIN_ACC_03", module: "Finance", function: "Accountant", role: "Reconcile supplier accounts" },
      { id: "P_FIN_ACC_04", module: "Finance", function: "Accountant", role: "Create customer invoices, credit notes, advances and make receipts" },
      { id: "P_FIN_ACC_05", module: "Finance", function: "Accountant", role: "Reconcile customer accounts" },
      { id: "P_FIN_ACC_06", module: "Finance", function: "Accountant", role: "Record, transfer, disposal and manage asset register" },
      { id: "P_FIN_ACC_07", module: "Finance", function: "Accountant", role: "Run system depreciation and impairment entries" },
      { id: "P_FIN_ACC_08", module: "Finance", function: "Accountant", role: "Analyze accounts for accuracy" },
      { id: "P_FIN_ACC_09", module: "Finance", function: "Accountant", role: "Generate financial reports" },
      { id: "P_FIN_ACC_10", module: "Finance", function: "Accountant", role: "Ensure system mapping is correct (sub-ledgers to GL)" },
      // Finance - Accounting and Reporting
      { id: "P_FIN_AR_01", module: "Finance", function: "Accounting and Reporting", role: "Review and post the entire accounting process" },
      { id: "P_FIN_AR_02", module: "Finance", function: "Accounting and Reporting", role: "Manage and configure the company chart of accounts" },
      { id: "P_FIN_AR_03", module: "Finance", function: "Accounting and Reporting", role: "Configure fiscal periods and tax codes" },
      { id: "P_FIN_AR_04", module: "Finance", function: "Accounting and Reporting", role: "Close the books (monthly, quarterly, annually)" },
      { id: "P_FIN_AR_05", module: "Finance", function: "Accounting and Reporting", role: "Prepare financial reports monthly, quarterly and annually" },
      { id: "P_FIN_AR_06", module: "Finance", function: "Accounting and Reporting", role: "Handle auditor queries" },
      { id: "P_FIN_AR_07", module: "Finance", function: "Accounting and Reporting", role: "Approve journal entries and payable invoices" },
      { id: "P_FIN_AR_08", module: "Finance", function: "Accounting and Reporting", role: "Coordinate with IT for system upgrades, integrations and troubleshooting" },
      { id: "P_FIN_AR_09", module: "Finance", function: "Accounting and Reporting", role: "Correct errors and suggest financial adjustments" },
      // Finance - Treasury Management
      { id: "P_FIN_TM_01", module: "Finance", function: "Treasury Management", role: "Maintain bank accounts and contacts" },
      { id: "P_FIN_TM_02", module: "Finance", function: "Treasury Management", role: "Optimize cash flow" },
      { id: "P_FIN_TM_03", module: "Finance", function: "Treasury Management", role: "Run cash position and forecasting reports" },
      { id: "P_FIN_TM_04", module: "Finance", function: "Treasury Management", role: "Perform bank reconciliations" },
      { id: "P_FIN_TM_05", module: "Finance", function: "Treasury Management", role: "Manage and record investments in banks" },
      // Finance - Financial Planning and Analysis
      { id: "P_FIN_FPA_01", module: "Finance", function: "Financial Planning and Analysis", role: "Analyze financial performance" },
      { id: "P_FIN_FPA_02", module: "Finance", function: "Financial Planning and Analysis", role: "Upload and monitor budgets in the system" },
      { id: "P_FIN_FPA_03", module: "Finance", function: "Financial Planning and Analysis", role: "Support management dashboards" },
      { id: "P_FIN_FPA_04", module: "Finance", function: "Financial Planning and Analysis", role: "Align system data for performance KPIs" },
      { id: "P_FIN_FPA_05", module: "Finance", function: "Financial Planning and Analysis", role: "Run reports for detailed analysis" },
      { id: "P_FIN_FPA_06", module: "Finance", function: "Financial Planning and Analysis", role: "Compare actual results with the budget" },
      { id: "P_FIN_FPA_07", module: "Finance", function: "Financial Planning and Analysis", role: "Create forecasts for expenses and spending" },
      // Finance - Financial Auditing
      { id: "P_FIN_FA_01", module: "Finance", function: "Financial Auditing", role: "Collect sample data from the finance department" },
      { id: "P_FIN_FA_02", module: "Finance", function: "Financial Auditing", role: "Review transactions to ensure approval according to policy" },
      { id: "P_FIN_FA_03", module: "Finance", function: "Financial Auditing", role: "Check that changes to financial systems are properly deployed and approved" },
      { id: "P_FIN_FA_04", module: "Finance", function: "Financial Auditing", role: "Ensure regulatory compliance setup" },
      { id: "P_FIN_FA_05", module: "Finance", function: "Financial Auditing", role: "Review roles and duties quarterly with department managers" },
      { id: "P_FIN_FA_06", module: "Finance", function: "Financial Auditing", role: "Identify and highlight risks in business processes and inform relevant owners" },
      // HR - Employee Relation
      { id: "P_HR_ER_01", module: "HR", function: "Employee Relation", role: "Access and manage worker personal, employment, and assignment information" },
      { id: "P_HR_ER_02", module: "HR", function: "Employee Relation", role: "Perform hiring, termination, promotion, and transfer transactions" },
      { id: "P_HR_ER_03", module: "HR", function: "Employee Relation", role: "Update worker documents, addresses, and contact details" },
      { id: "P_HR_ER_04", module: "HR", function: "Employee Relation", role: "Manage Employee's Absences, Schedules, Bank, GOSI and Legal Information" },
      { id: "P_HR_ER_05", module: "HR", function: "Employee Relation", role: "View and manage workforce structures such as jobs, positions, and departments" },
      { id: "P_HR_ER_06", module: "HR", function: "Employee Relation", role: "Run HR reports and queries for workforce analytics and compliance" },
      { id: "P_HR_ER_07", module: "HR", function: "Employee Relation", role: "Manage employee benefits e.g., medical insurance, annual ticket, etc." },
      // HR - Recruitment
      { id: "P_HR_REC_01", module: "HR", function: "Recruitment", role: "Manage end-to-end recruitment process" },
      { id: "P_HR_REC_02", module: "HR", function: "Recruitment", role: "Create, post, and manage job requisitions" },
      { id: "P_HR_REC_03", module: "HR", function: "Recruitment", role: "Review and shortlist candidate applications from the talent pool" },
      { id: "P_HR_REC_04", module: "HR", function: "Recruitment", role: "Schedule and manage interview processes" },
      { id: "P_HR_REC_05", module: "HR", function: "Recruitment", role: "Update candidate statuses and move them through the recruitment stages" },
      { id: "P_HR_REC_06", module: "HR", function: "Recruitment", role: "Generate recruitment-related reports and analytics for tracking hiring progress" },
      { id: "P_HR_REC_07", module: "HR", function: "Recruitment", role: "Follow up offer letter and create pending worker" },
      // HR - Performance Management
      { id: "P_HR_PM_01", module: "HR", function: "Performance Management", role: "Manage approvals, track completion status, and ensure compliance with performance policies" },
      { id: "P_HR_PM_02", module: "HR", function: "Performance Management", role: "Access performance feedback and maintain appraisal history for audit and reporting" },
      { id: "P_HR_PM_03", module: "HR", function: "Performance Management", role: "Reopen or move employees performance tasks" },
      { id: "P_HR_PM_04", module: "HR", function: "Performance Management", role: "Transfer the performance documents from manager to another manager" },
      { id: "P_HR_PM_05", module: "HR", function: "Performance Management", role: "Bulk print performance documents" },
      // HR - Learning
      { id: "P_HR_LRN_01", module: "HR", function: "Learning", role: "Create, edit, and manage courses, offerings, activities, and related learning content" },
      { id: "P_HR_LRN_02", module: "HR", function: "Learning", role: "Assign learning items to individuals or groups and track learner progress" },
      { id: "P_HR_LRN_03", module: "HR", function: "Learning", role: "Manage instructors, classrooms, and external providers for learning delivery" },
      { id: "P_HR_LRN_04", module: "HR", function: "Learning", role: "Access learning reports and analytics to monitor completions and participation" },
      { id: "P_HR_LRN_05", module: "HR", function: "Learning", role: "Maintain learning catalogs, categories, and communities" },
      // HR - Payroll
      { id: "P_HR_PAY_01", module: "HR", function: "Payroll", role: "Process payroll runs – create, calculate, and validate payrolls for assigned payroll groups" },
      { id: "P_HR_PAY_02", module: "HR", function: "Payroll", role: "Manage payroll data – enter and update employee earnings, deductions, and other payroll elements" },
      { id: "P_HR_PAY_03", module: "HR", function: "Payroll", role: "Run payroll reports – access and generate pre- and post-payroll reports for verification" },
      { id: "P_HR_PAY_04", module: "HR", function: "Payroll", role: "Resolve payroll issues – review and correct errors from payroll validations and calculations" },
      { id: "P_HR_PAY_05", module: "HR", function: "Payroll", role: "Submit payroll for payment – finalize payroll and initiate payment processing to employees" },
      // SCM - Procurement
      { id: "P_SCM_PROC_01", module: "SCM", function: "Procurement", role: "Create, edit, and manage purchase requisitions" },
      { id: "P_SCM_PROC_02", module: "SCM", function: "Procurement", role: "Convert approved requisitions into purchase orders" },
      { id: "P_SCM_PROC_03", module: "SCM", function: "Procurement", role: "Maintain supplier master data and supplier contacts" },
      { id: "P_SCM_PROC_04", module: "SCM", function: "Procurement", role: "Manage sourcing events such as RFQs, RFPs, and auctions" },
      { id: "P_SCM_PROC_05", module: "SCM", function: "Procurement", role: "Review, approve, and amend purchase orders" },
      { id: "P_SCM_PROC_06", module: "SCM", function: "Procurement", role: "Track procurement cycle times and supplier performance" },
      { id: "P_SCM_PROC_07", module: "SCM", function: "Procurement", role: "Run procurement reports and spend analysis" },
      // SCM - Inventory Management
      { id: "P_SCM_INV_01", module: "SCM", function: "Inventory Management", role: "Define and manage inventory organizations and sub-inventories" },
      { id: "P_SCM_INV_02", module: "SCM", function: "Inventory Management", role: "Perform inventory transactions (receipts, issues, transfers, adjustments)" },
      { id: "P_SCM_INV_03", module: "SCM", function: "Inventory Management", role: "Manage item master data, categories, and units of measure" },
      { id: "P_SCM_INV_04", module: "SCM", function: "Inventory Management", role: "Conduct physical inventory counts and cycle counts" },
      { id: "P_SCM_INV_05", module: "SCM", function: "Inventory Management", role: "Track inventory levels, stock valuation, and aging" },
      { id: "P_SCM_INV_06", module: "SCM", function: "Inventory Management", role: "Run inventory accuracy and stock movement reports" },
      // SCM - Receiving
      { id: "P_SCM_RCV_01", module: "SCM", function: "Receiving", role: "Receive goods against purchase orders" },
      { id: "P_SCM_RCV_02", module: "SCM", function: "Receiving", role: "Perform quantity and quality inspections" },
      { id: "P_SCM_RCV_03", module: "SCM", function: "Receiving", role: "Record delivery discrepancies and returns to suppliers" },
      { id: "P_SCM_RCV_04", module: "SCM", function: "Receiving", role: "Manage receiving documentation and approvals" },
      { id: "P_SCM_RCV_05", module: "SCM", function: "Receiving", role: "Generate receiving and inspection reports" },
      // SCM - Order Management
      { id: "P_SCM_OM_01", module: "SCM", function: "Order Management", role: "Create, manage, and process customer sales orders" },
      { id: "P_SCM_OM_02", module: "SCM", function: "Order Management", role: "Manage order pricing, discounts, and credit checks" },
      { id: "P_SCM_OM_03", module: "SCM", function: "Order Management", role: "Track order fulfillment status and backorders" },
      { id: "P_SCM_OM_04", module: "SCM", function: "Order Management", role: "Handle order changes, cancellations, and returns" },
      { id: "P_SCM_OM_05", module: "SCM", function: "Order Management", role: "Generate order management and fulfillment reports" },
      // SCM - Warehouse Management
      { id: "P_SCM_WH_01", module: "SCM", function: "Warehouse Management", role: "Manage warehouse layouts, locations, and storage rules" },
      { id: "P_SCM_WH_02", module: "SCM", function: "Warehouse Management", role: "Perform picking, packing, and shipping transactions" },
      { id: "P_SCM_WH_03", module: "SCM", function: "Warehouse Management", role: "Manage material movements within the warehouse" },
      { id: "P_SCM_WH_04", module: "SCM", function: "Warehouse Management", role: "Monitor warehouse capacity and space utilization" },
      { id: "P_SCM_WH_05", module: "SCM", function: "Warehouse Management", role: "Run warehouse productivity and efficiency reports" },
      // SCM - Logistics & Shipping
      { id: "P_SCM_LOG_01", module: "SCM", function: "Logistics & Shipping", role: "Plan and execute shipments to customers and internal locations" },
      { id: "P_SCM_LOG_02", module: "SCM", function: "Logistics & Shipping", role: "Manage carriers, freight rates, and shipping methods" },
      { id: "P_SCM_LOG_03", module: "SCM", function: "Logistics & Shipping", role: "Track shipments and delivery confirmations" },
      { id: "P_SCM_LOG_04", module: "SCM", function: "Logistics & Shipping", role: "Handle freight billing and logistics cost analysis" },
      { id: "P_SCM_LOG_05", module: "SCM", function: "Logistics & Shipping", role: "Generate logistics and transportation reports" },
      // SCM - Planning
      { id: "P_SCM_PLN_01", module: "SCM", function: "Planning", role: "Run demand planning and supply planning processes" },
      { id: "P_SCM_PLN_02", module: "SCM", function: "Planning", role: "Create and maintain forecasts for products and materials" },
      { id: "P_SCM_PLN_03", module: "SCM", function: "Planning", role: "Generate replenishment and supply plans" },
      { id: "P_SCM_PLN_04", module: "SCM", function: "Planning", role: "Analyze plan exceptions and shortages" },
      { id: "P_SCM_PLN_05", module: "SCM", function: "Planning", role: "Compare forecast vs. actual demand" },
      // SCM - Manufacturing / Production
      { id: "P_SCM_MFG_01", module: "SCM", function: "Manufacturing / Production", role: "Create and manage work orders and production schedules" },
      { id: "P_SCM_MFG_02", module: "SCM", function: "Manufacturing / Production", role: "Define bills of materials (BOM) and routings" },
      { id: "P_SCM_MFG_03", module: "SCM", function: "Manufacturing / Production", role: "Issue materials to production and record completions" },
      { id: "P_SCM_MFG_04", module: "SCM", function: "Manufacturing / Production", role: "Track production variances and efficiencies" },
      { id: "P_SCM_MFG_05", module: "SCM", function: "Manufacturing / Production", role: "Run manufacturing performance and cost reports" },
      // SCM - Quality Management
      { id: "P_SCM_QM_01", module: "SCM", function: "Quality Management", role: "Define quality standards and inspection plans" },
      { id: "P_SCM_QM_02", module: "SCM", function: "Quality Management", role: "Perform incoming, in-process, and outgoing inspections" },
      { id: "P_SCM_QM_03", module: "SCM", function: "Quality Management", role: "Record non-conformances and corrective actions" },
      { id: "P_SCM_QM_04", module: "SCM", function: "Quality Management", role: "Track supplier and production quality performance" },
      { id: "P_SCM_QM_05", module: "SCM", function: "Quality Management", role: "Generate quality and compliance reports" },
      // SCM - Cost Management
      { id: "P_SCM_CST_01", module: "SCM", function: "Cost Management", role: "Maintain item costs and cost structures" },
      { id: "P_SCM_CST_02", module: "SCM", function: "Cost Management", role: "Perform cost rollups and updates" },
      { id: "P_SCM_CST_03", module: "SCM", function: "Cost Management", role: "Analyze material, labor, and overhead variances" },
      { id: "P_SCM_CST_04", module: "SCM", function: "Cost Management", role: "Support inventory and manufacturing valuation" },
      { id: "P_SCM_CST_05", module: "SCM", function: "Cost Management", role: "Generate cost and margin analysis reports" },
    ];

    // Seeded assignments - employees can have privileges in ANY company (cross-company)
    const assignments: Assignment[] = [
      // E003 has privileges in C01 (their legal company)
      { companyId: "C01", employeeId: "E003", privilegeIds: ["P_FIN_ACC_09"] },
      // E007 has privileges in C02 (their legal company) 
      { companyId: "C02", employeeId: "E007", privilegeIds: ["P_FIN_TM_01", "P_FIN_TM_02"] },
      // E006 has privileges in C03 (their legal company)
      { companyId: "C03", employeeId: "E006", privilegeIds: ["P_FIN_FA_01", "P_FIN_FA_02"] },
      // Cross-company example: E004 (legal C01) has privileges in C02
      { companyId: "C02", employeeId: "E004", privilegeIds: ["P_FIN_AR_01"] },
    ];

    return {
      companies,
      employees,
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

  async getLegalEmployees(managerId: string): Promise<Employee[]> {
    await this.initialized;
    const manager = this.data.employees.find(e => e.id === managerId && e.isManager);
    if (!manager) return [];
    
    // Return employees who have the same legalCompanyId as the manager and are managed by this manager
    return this.data.employees.filter(e => 
      e.legalCompanyId === manager.legalCompanyId && 
      e.managerId === managerId
    );
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

    // Get manager
    const manager = this.data.employees.find(e => e.id === managerId && e.isManager);
    if (!manager) {
      throw new Error("Manager not found");
    }

    // Get target employee
    const employee = this.data.employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // LEGAL COMPANY AUTHORIZATION CHECK
    // Manager can only modify privileges for employees in their legal company
    if (employee.legalCompanyId !== manager.legalCompanyId) {
      throw new Error("Manager can only modify privileges for employees in their legal company");
    }

    // Employee must be managed by this manager
    if (employee.managerId !== managerId) {
      throw new Error("Employee is not managed by this manager");
    }

    // Validate company exists (manager can grant privileges in ANY company)
    const company = this.data.companies.find(c => c.id === companyId);
    if (!company) {
      throw new Error("Company not found");
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
    const target = this.data.employees.find(e => e.id === employeeId);

    for (const privId of added) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        managerId,
        "ADD_ROLE",
        `${manager.name} added ${priv?.module}/${priv?.function}/${priv?.role} to ${target?.name} in ${company.name}`,
        companyId,
        employeeId
      );
    }

    for (const privId of removed) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        managerId,
        "REMOVE_ROLE",
        `${manager.name} removed ${priv?.module}/${priv?.function}/${priv?.role} from ${target?.name} in ${company.name}`,
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
