import { sendRequestSubmittedEmail } from "./email.js";
import {
  AppData,
  AuditEntry,
  Company,
  Contact,
  Employee,
  Privilege,
  Assignment,
  PrivilegeRequest,
  BootstrapResponse,
  AuditActionType,
  CreateRequestInput,
  RequestStatus,
} from "@shared/schema";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapResponse>;
  
  // Assignments (kept for internal use during approval)
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
  getAllEmployees(): Promise<Employee[]>;
  
  // Request CRUD
  createRequest(input: CreateRequestInput): Promise<PrivilegeRequest>;
  getRequests(filters?: { managerId?: string; employeeId?: string; status?: RequestStatus; targetCompanyIds?: string[] }): Promise<PrivilegeRequest[]>;
  updateRequestStatus(requestId: string, status: RequestStatus, adminComments: string | null, adminId: string): Promise<PrivilegeRequest>;
  getGMsForCompany(companyId: string): Promise<Contact[]>;
  
  // Employee Termination
  terminateEmployee(employeeId: string, adminId: string): Promise<void>;

  // Contacts CRUD
  findContactByEmail(email: string): Promise<Contact | undefined>;
  getContacts(): Promise<Contact[]>;
  createContact(contact: Omit<Contact, "id">): Promise<Contact>;
  updateContact(id: string, updates: Partial<Omit<Contact, "id">>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
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
      { id: "001", name: "شركة دله البركة القابضة" },
      { id: "002", name: "شركة دله الرقمية" },
      { id: "008", name: "شركة دله جسر الشرق للإستثمار" },
      { id: "009", name: "شركة الروابي الاقليمية للفنادق والمنتجعات السياحية" },
      { id: "010", name: "شركة وكن العالمية للمجمعات السكنية المحدودة" },
      { id: "012", name: "شركة مكاسب الدولية" },
      { id: "019", name: "نشاط التشغيل والصيانة" },
      { id: "020", name: "شركة مجموعة خدمات الطعام" },
      { id: "021", name: "شركة دله للمقاولات والصيانة" },
      { id: "022", name: "شركة دله لتعليم قيادة السيارات" },
      { id: "028", name: "شركة دله عبر البلاد العربية" },
      { id: "030", name: "شركة دله العقارية" },
      { id: "045", name: "شركة دله المتقدمه للحافلات والمعدات المحدودة" },
      { id: "046", name: "شركة دله لنقل الحجاج" },
      { id: "050", name: "شركة دله التجارية" },
      { id: "052", name: "شركة دله لصيانة وتشغيل أجهزة تكييف الهواء" },
      { id: "053", name: "وكالة دارين للسفر و السياحة" },
      { id: "054", name: "شركة دله للتنمية العقارية والسياحية" },
      { id: "055", name: "الشركة السعودية للمدن السياحية" },
      { id: "058", name: "شركة الدرة الخليجية للصيانة والتشغيل المحدودة" },
      { id: "060", name: "شركة امام الحديثة للعقار" },
      { id: "061", name: "شركة دله للفنادق والمنتجعات السياحية" },
      { id: "066", name: "شركة شريك للتسويق والصيانة والتشغيل والتجارة" },
      { id: "069", name: "شركة دله حلول الأعمال" },
      { id: "077", name: "شركة ألف و سبعمائة وستون المحدودة" },
      { id: "079", name: "الشركة العربية للإعلان والخدمات العامة" },
      { id: "167", name: "دله البركة للإستثمار القابضة" },
      { id: "186", name: "شركة درة الرياض للتطوير العقاري المحدودة" },
      { id: "246", name: "شركة المناخة لتطوير المشاريع العمرانية" },
      { id: "260", name: "شركة البوادر المتميزة القابضة" },
      { id: "261", name: "شركة فواصل المتطورة لتنظيم الفعاليات والمهرجانات السياحية" },
      { id: "276", name: "شركة الرواق للمحاماة و الاستشارات القانونية" },
      { id: "300", name: "شركة الثنايا الاقليمية للتنمية العقارية" },
      { id: "301", name: "شركة القدرة المتحدة للإنشاء والتعمير المحدودة" },
      { id: "302", name: "شركة دلة المتطورة لإدارة وتدوير النفايات المحدودة" },
      { id: "303", name: "شركة دلة للنقليات" },
    ];

    // Employees with legalCompanyId and managerId
    // Managers: E001 (Mohammed Nawar - 001), E002 (Adnan - 002), E005 (Souhaib - 008)
    // Admin: E001 is also admin for MVP testing
    const employees: Employee[] = [
      { id: "E001", name: "Mohammed Nawar", title: "Manager", email: "mohammed.nawar@example.com", isManager: true, isAdmin: true, legalCompanyId: "001" },
      { id: "E002", name: "Adnan Alqahtani", title: "Operations Manager", email: "adnan@example.com", isManager: true, legalCompanyId: "002" },
      { id: "E003", name: "Shahad Alharbi", title: "HR Specialist", email: "shahad@example.com", isManager: false, legalCompanyId: "001", managerId: "E001" },
      { id: "E004", name: "Jameel Ashraf", title: "GM Assistant", email: "jameel@example.com", isManager: false, legalCompanyId: "001", managerId: "E001" },
      { id: "E005", name: "Souhaib Khairallah", title: "Head of Automation", email: "souhaib@example.com", isManager: true, legalCompanyId: "008" },
      { id: "E006", name: "Ishfaq Pathan", title: "Infrastructure", email: "ishfaq@example.com", isManager: false, legalCompanyId: "008", managerId: "E005" },
      { id: "E007", name: "Sara Ahmed", title: "Finance Analyst", email: "sara@example.com", isManager: false, legalCompanyId: "002", managerId: "E002" },
      { id: "E008", name: "Khalid Saleh", title: "Treasury Officer", email: "khalid@example.com", isManager: false, legalCompanyId: "002", managerId: "E002" },
      { id: "E009", name: "Noor Hassan", title: "Accounting", email: "noor@example.com", isManager: false, legalCompanyId: "002", managerId: "E002" },
      { id: "E010", name: "Faisal Omar", title: "Business Analyst", email: "faisal@example.com", isManager: false, legalCompanyId: "008", managerId: "E005" },
      { id: "9280", name: "Ibrahim Mohammed Shaker", title: "Accountant", email: "ibrahim.shaker@example.com", isManager: false, legalCompanyId: "001", managerId: "E001" },
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
      // E003 has privileges in 001 (their legal company)
      { companyId: "001", employeeId: "E003", privilegeIds: ["P_FIN_ACC_09"] },
      // E007 has privileges in 002 (their legal company) 
      { companyId: "002", employeeId: "E007", privilegeIds: ["P_FIN_TM_01", "P_FIN_TM_02"] },
      // E006 has privileges in 008 (their legal company)
      { companyId: "008", employeeId: "E006", privilegeIds: ["P_FIN_FA_01", "P_FIN_FA_02"] },
      // Cross-company example: E004 (legal 001) has privileges in 002
      { companyId: "002", employeeId: "E004", privilegeIds: ["P_FIN_AR_01"] },
      // Ibrahim Mohammed Shaker (9280) - Accountant, Accounting and Reporting, Treasury, Requisitioner, Buyer functions
      // In company 001 (دلة البركة القابضة)
      { companyId: "001", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_ACC_02", "P_FIN_ACC_03", "P_FIN_ACC_04", "P_FIN_ACC_05", "P_FIN_AR_01", "P_FIN_AR_02", "P_FIN_TM_01", "P_SCM_REQ_01", "P_SCM_BPA_01"] },
      // In company 002 (شركة دله الرقمية)
      { companyId: "002", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_ACC_02", "P_FIN_AR_01", "P_FIN_AR_02", "P_FIN_TM_01", "P_SCM_REQ_01", "P_SCM_BPA_01"] },
      // In company 008 (شركة دله جسر الشرق للإستثمار)
      { companyId: "008", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01", "P_FIN_TM_01"] },
      // In company 028 (شركة دله عبر البلاد العربية)
      { companyId: "028", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01"] },
      // In company 276 (شركة الرواق للمحاماة و الاستشارات القانونية)
      { companyId: "276", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01"] },
      // In company 300 (شركة الثنايا الاقليمية للتنمية العقارية)
      { companyId: "300", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01", "P_SCM_REQ_01", "P_SCM_BPA_01"] },
      // In company 301 (شركة القدرة المتحدة للإنشاء والتعمير المحدودة)
      { companyId: "301", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01"] },
      // In company 302 (شركة دلة المتطورة لإدارة وتدوير النفايات المحدودة)
      { companyId: "302", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01"] },
      // In company 303 (شركة دلة للنقليات)
      { companyId: "303", employeeId: "9280", privilegeIds: ["P_FIN_ACC_01", "P_FIN_AR_01"] },
    ];

    // Empty requests array - managers will create requests
    const requests: PrivilegeRequest[] = [];

    return {
      companies,
      employees,
      privileges,
      assignments,
      requests,
      contacts: [],
    };
  }

  private getDefaultAuditLog(): AuditEntry[] {
    return [];
  }

  private async init() {
    try {
      const content = await fs.readFile(this.dataPath, "utf-8");
      this.data = JSON.parse(content);
      let needsSave = false;
      
      // Ensure requests array exists (for backwards compatibility)
      if (!this.data.requests) {
        this.data.requests = [];
        needsSave = true;
      }
      // Ensure contacts array exists (for backwards compatibility)
      if (!this.data.contacts) {
        this.data.contacts = [];
        needsSave = true;
      }
      
      // Ensure E001 has isAdmin flag (for backwards compatibility)
      const e001 = this.data.employees.find(e => e.id === "E001");
      if (e001 && !e001.isAdmin) {
        e001.isAdmin = true;
        needsSave = true;
      }

      // Backfill revoke scheduling fields on existing requests
      for (const req of this.data.requests) {
        if (!req.requestType) {
          req.requestType = "grant";
          needsSave = true;
        }
        if (req.executedAt === undefined) {
          req.executedAt = null;
          needsSave = true;
        }
        if (req.reinstatedAt === undefined) {
          req.reinstatedAt = null;
          needsSave = true;
        }
      }
      
      if (needsSave) {
        await this.saveData();
      }
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

  private todayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  private getAssignmentPrivilegeIds(companyId: string, employeeId: string): string[] {
    const assignment = this.data.assignments.find(
      a => a.companyId === companyId && a.employeeId === employeeId,
    );
    return assignment?.privilegeIds ?? [];
  }

  private async removePrivilegesFromAssignment(
    actorId: string,
    companyId: string,
    employeeId: string,
    privilegeIds: string[],
  ): Promise<void> {
    if (privilegeIds.length === 0) return;

    const company = this.data.companies.find(c => c.id === companyId);
    const target = this.data.employees.find(e => e.id === employeeId);
    const existingIdx = this.data.assignments.findIndex(
      a => a.companyId === companyId && a.employeeId === employeeId,
    );
    if (existingIdx < 0) return;

    const before = this.data.assignments[existingIdx].privilegeIds;
    const removeSet = new Set(privilegeIds);
    const after = before.filter(id => !removeSet.has(id));
    const removed = before.filter(id => removeSet.has(id));

    this.data.assignments[existingIdx].privilegeIds = after;
    this.data.assignments = this.data.assignments.filter(a => a.privilegeIds.length > 0);

    for (const privId of removed) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        actorId,
        "REMOVE_ROLE",
        `Removed ${priv?.module}/${priv?.function}/${priv?.role} from ${target?.name} in ${company?.name}`,
        companyId,
        employeeId,
      );
    }
  }

  private async addPrivilegesToAssignment(
    actorId: string,
    companyId: string,
    employeeId: string,
    privilegeIds: string[],
  ): Promise<void> {
    if (privilegeIds.length === 0) return;

    const company = this.data.companies.find(c => c.id === companyId);
    const target = this.data.employees.find(e => e.id === employeeId);
    const existingIdx = this.data.assignments.findIndex(
      a => a.companyId === companyId && a.employeeId === employeeId,
    );

    const before = existingIdx >= 0 ? this.data.assignments[existingIdx].privilegeIds : [];
    const merged = Array.from(new Set([...before, ...privilegeIds]));
    const added = privilegeIds.filter(id => !before.includes(id));

    if (existingIdx >= 0) {
      this.data.assignments[existingIdx].privilegeIds = merged;
    } else {
      this.data.assignments.push({ companyId, employeeId, privilegeIds: merged });
    }

    for (const privId of added) {
      const priv = this.data.privileges.find(p => p.id === privId);
      await this.addAuditEntry(
        actorId,
        "ADD_ROLE",
        `Reinstated ${priv?.module}/${priv?.function}/${priv?.role} for ${target?.name} in ${company?.name}`,
        companyId,
        employeeId,
      );
    }
  }

  private applyGrantRequest(request: PrivilegeRequest): void {
    const functionPrivileges = this.data.privileges
      .filter(p => p.module === request.module && p.function === request.function)
      .map(p => p.id);

    const existingIdx = this.data.assignments.findIndex(
      a => a.companyId === request.companyId && a.employeeId === request.employeeId,
    );
    if (existingIdx >= 0) {
      const withoutFunc = this.data.assignments[existingIdx].privilegeIds.filter(
        id => !functionPrivileges.includes(id),
      );
      this.data.assignments[existingIdx].privilegeIds = [...withoutFunc, ...request.rolesSelected];
    } else {
      this.data.assignments.push({
        companyId: request.companyId,
        employeeId: request.employeeId,
        privilegeIds: request.rolesSelected,
      });
    }
    this.data.assignments = this.data.assignments.filter(a => a.privilegeIds.length > 0);
  }

  private async executeRevokeRequest(request: PrivilegeRequest, actorId: string): Promise<void> {
    const today = this.todayDateString();
    if (request.startDate > today) return;
    if (request.executedAt) return;

    await this.removePrivilegesFromAssignment(
      actorId,
      request.companyId,
      request.employeeId,
      request.rolesSelected,
    );
    request.executedAt = new Date().toISOString();
    request.updatedAt = request.executedAt;
  }

  private async processScheduledRequests(): Promise<void> {
    const today = this.todayDateString();
    let changed = false;

    for (const request of this.data.requests) {
      if (request.requestType !== "revoke" || request.status !== "active") continue;

      if (!request.executedAt && request.startDate <= today) {
        const assigned = this.getAssignmentPrivilegeIds(request.companyId, request.employeeId);
        const toRemove = request.rolesSelected.filter(id => assigned.includes(id));
        if (toRemove.length > 0) {
          await this.removePrivilegesFromAssignment(
            request.managerId,
            request.companyId,
            request.employeeId,
            toRemove,
          );
        }
        request.executedAt = new Date().toISOString();
        request.updatedAt = request.executedAt;
        changed = true;
      }

      if (
        request.executedAt &&
        request.endDate &&
        request.endDate <= today &&
        !request.reinstatedAt
      ) {
        await this.addPrivilegesToAssignment(
          request.managerId,
          request.companyId,
          request.employeeId,
          request.rolesSelected,
        );
        request.reinstatedAt = new Date().toISOString();
        request.updatedAt = request.reinstatedAt;
        changed = true;
      }
    }

    if (changed) {
      await this.saveData();
    }
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  async getBootstrapData(): Promise<BootstrapResponse> {
    await this.initialized;
    await this.processScheduledRequests();
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

  async getAllEmployees(): Promise<Employee[]> {
    await this.initialized;
    return this.data.employees;
  }

  async createRequest(input: CreateRequestInput): Promise<PrivilegeRequest> {
    await this.initialized;

    // Get manager — accept any employee (contacts are pre-authenticated as managers)
    // Also try matching via contact userId for contacts whose SAP id differs from actingUserId
    const manager = this.data.employees.find(e => e.id === input.managerId)
      || (() => {
        const contact = this.data.contacts.find(c => c.id === input.managerId);
        return contact?.userId
          ? this.data.employees.find(e => e.id === contact.userId)
          : undefined;
      })();
    if (!manager) {
      throw new Error("Manager not found");
    }

    // Get target employee
    const employee = this.data.employees.find(e => e.id === input.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Validate company exists
    const company = this.data.companies.find(c => c.id === input.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Validate privilege IDs exist and belong to the specified module/function
    for (const privId of input.rolesSelected) {
      const priv = this.data.privileges.find(p => p.id === privId);
      if (!priv) {
        throw new Error(`Invalid privilege ID: ${privId}`);
      }
      if (priv.module !== input.module || priv.function !== input.function) {
        throw new Error(`Privilege ${privId} does not belong to ${input.module}/${input.function}`);
      }
    }

    const requestType = input.requestType ?? "grant";

    if (requestType === "revoke") {
      const assigned = this.getAssignmentPrivilegeIds(input.companyId, input.employeeId);
      const notAssigned = input.rolesSelected.filter(id => !assigned.includes(id));
      if (notAssigned.length > 0) {
        throw new Error(`Cannot revoke privileges that are not currently assigned: ${notAssigned.join(", ")}`);
      }
    }

    const now = new Date().toISOString();
    const request: PrivilegeRequest = {
      id: randomUUID(),
      managerId: input.managerId,
      ...(input.managerUserId ? { managerUserId: input.managerUserId } : {}),
      managerLegalCompanyId: manager.legalCompanyId,
      employeeId: input.employeeId,
      companyId: input.companyId,
      module: input.module,
      function: input.function,
      rolesSelected: input.rolesSelected,
      requestType,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      adminComments: null,
      executedAt: null,
      reinstatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.data.requests.push(request);

    // ── Auto-approve if the submitter is a GM of the employee's legal company ──
    const employeeLegalCompanyId = employee.legalCompanyId;
    const submitterContact =
      this.data.contacts.find(c => c.userId === input.managerId) ||
      this.data.contacts.find(c => c.id === input.managerId) ||
      (input.managerUserId ? this.data.contacts.find(c => c.userId === input.managerUserId || c.id === input.managerUserId) : undefined);

    const isGMofEmployeeCompany = submitterContact?.companies.some(
      cc => cc.companyId === employeeLegalCompanyId && cc.role === "GM"
    );

    if (isGMofEmployeeCompany) {
      request.status = "active";
      request.adminComments = "Auto-approved by GM";
      request.updatedAt = new Date().toISOString();

      if (requestType === "grant") {
        this.applyGrantRequest(request);
      } else {
        await this.executeRevokeRequest(request, input.managerId);
      }
    }

    await this.saveData();
    await this.processScheduledRequests();

    // Send email notification (fire-and-forget — never blocks the response)
    const notifCompany = this.data.companies.find(c => c.id === input.companyId);
    const notifEmployee = this.data.employees.find(e => e.id === input.employeeId);
    sendRequestSubmittedEmail({
      managerName: manager.name,
      managerUserId: input.managerUserId,
      employeeName: notifEmployee?.name || input.employeeId,
      employeeId: input.employeeId,
      companyName: notifCompany?.name || input.companyId,
      module: input.module,
      functionName: input.function,
      rolesCount: input.rolesSelected.length,
      startDate: input.startDate,
      endDate: input.endDate,
      requestId: request.id,
      requestType,
    });

    const actionLabel = requestType === "revoke" ? "delete" : "grant";
    await this.addAuditEntry(
      input.managerId,
      "REQUEST_CREATED",
      `${manager.name} requested ${actionLabel} of ${input.module}/${input.function} privileges for ${employee.name} in ${company.name} (${input.rolesSelected.length} roles, effective ${input.startDate}${input.endDate ? ` to ${input.endDate}` : ""})`,
      input.companyId,
      input.employeeId
    );

    return request;
  }

  async getRequests(filters?: { managerId?: string; employeeId?: string; status?: RequestStatus; targetCompanyIds?: string[] }): Promise<PrivilegeRequest[]> {
    await this.initialized;

    let requests = [...this.data.requests];

    if (filters?.managerId) {
      const managerId = filters.managerId;
      requests = requests.filter(
        r => r.managerId === managerId || r.managerUserId === managerId,
      );
    }
    if (filters?.employeeId) {
      requests = requests.filter(r => r.employeeId === filters.employeeId);
    }
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    // Filter by target employee's legal company (for GM-scoped views)
    if (filters?.targetCompanyIds?.length) {
      const ids = filters.targetCompanyIds;
      requests = requests.filter(r => {
        const emp = this.data.employees.find(e => e.id === r.employeeId);
        return emp && ids.includes(emp.legalCompanyId);
      });
    }
    
    return requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    adminComments: string | null,
    adminId: string
  ): Promise<PrivilegeRequest> {
    await this.initialized;

    // Find request first (needed for GM authorization check)
    const requestIdx = this.data.requests.findIndex(r => r.id === requestId);
    if (requestIdx < 0) {
      throw new Error("Request not found");
    }

    const request = this.data.requests[requestIdx];
    if (request.status !== "pending") {
      throw new Error("Only pending requests can be updated");
    }

    // Authorization: system admin OR GM of the target employee's legal company
    const targetEmployee = this.data.employees.find(e => e.id === request.employeeId);
    const targetCompanyId = targetEmployee?.legalCompanyId;

    // Block: requester cannot self-approve their own request
    if (adminId === request.managerId || adminId === request.managerUserId) {
      throw new Error("The requester cannot approve or reject their own request");
    }

    const isSystemAdmin =
      this.data.employees.find(e => e.id === adminId && e.isAdmin) ||
      this.data.contacts.find(c => c.id === adminId && c.isAdmin);

    // GM of target employee's company can approve — NOT GM of requester's company
    // (unless they happen to be the same company)
    const isGMofTargetCompany = targetCompanyId && this.data.contacts.some(c =>
      c.id === adminId &&
      c.companies.some(cc => cc.companyId === targetCompanyId && cc.role === "GM")
    );

    if (!isSystemAdmin && !isGMofTargetCompany) {
      throw new Error("Only the GM of the employee's company can approve or reject this request");
    }

    const adminEmp = this.data.employees.find(e => e.id === adminId);
    const adminContact = this.data.contacts.find(c => c.id === adminId);
    const adminName = adminEmp?.name || adminContact?.name || adminId;

    // Update request
    request.status = status;
    request.adminComments = adminComments;
    request.updatedAt = new Date().toISOString();

    this.data.requests[requestIdx] = request;

    // If approved, apply the roles to assignments
    if (status === "active") {
      const requestType = request.requestType ?? "grant";
      if (requestType === "grant") {
        this.applyGrantRequest(request);
      } else {
        await this.executeRevokeRequest(request, adminId);
      }
    }

    await this.saveData();
    await this.processScheduledRequests();

    // Log audit entry
    const employee = this.data.employees.find(e => e.id === request.employeeId);
    const company = this.data.companies.find(c => c.id === request.companyId);
    
    await this.addAuditEntry(
      adminId,
      status === "active" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
      `${adminName} ${status === "active" ? "approved" : "rejected"} ${request.requestType === "revoke" ? "delete" : "grant"} request for ${request.module}/${request.function} — ${employee?.name} in ${company?.name}${adminComments ? ` - Comment: ${adminComments}` : ""}`,
      request.companyId,
      request.employeeId
    );

    return request;
  }

  async terminateEmployee(employeeId: string, adminId: string): Promise<void> {
    await this.initialized;

    // Verify admin — check employees OR contacts
    const adminEmp2 = this.data.employees.find(e => e.id === adminId && e.isAdmin);
    const adminContact2 = this.data.contacts.find(c => c.id === adminId && c.isAdmin);
    if (!adminEmp2 && !adminContact2) {
      throw new Error("Only admins can terminate employees");
    }
    const admin = adminEmp2 || { name: adminContact2?.name || adminId };

    // Find employee
    const employee = this.data.employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Remove all assignments for this employee
    const removedAssignments = this.data.assignments.filter(a => a.employeeId === employeeId);
    this.data.assignments = this.data.assignments.filter(a => a.employeeId !== employeeId);

    // Cancel all pending requests for this employee
    for (const request of this.data.requests) {
      if (request.employeeId === employeeId && request.status === "pending") {
        request.status = "rejected";
        request.adminComments = "Employee terminated";
        request.updatedAt = new Date().toISOString();
      }
    }

    await this.saveData();

    // Log audit entry
    const totalPrivileges = removedAssignments.reduce((sum, a) => sum + a.privilegeIds.length, 0);
    await this.addAuditEntry(
      adminId,
      "EMPLOYEE_TERMINATED",
      `${admin.name} terminated ${employee.name} - removed ${totalPrivileges} privileges across ${removedAssignments.length} companies`,
      undefined,
      employeeId
    );
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  async findContactByEmail(email: string): Promise<Contact | undefined> {
    await this.initialized;
    const lower = email.trim().toLowerCase();
    return this.data.contacts.find(c => c.email.toLowerCase() === lower);
  }

  async getContacts(): Promise<Contact[]> {
    await this.initialized;
    return [...this.data.contacts].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createContact(contact: Omit<Contact, "id">): Promise<Contact> {
    await this.initialized;
    const id = `C${String(this.data.contacts.length + 1).padStart(3, "0")}`;
    const newContact: Contact = { id, ...contact };
    this.data.contacts.push(newContact);
    await this.saveData();
    return newContact;
  }

  async updateContact(id: string, updates: Partial<Omit<Contact, "id">>): Promise<Contact> {
    await this.initialized;
    const idx = this.data.contacts.findIndex(c => c.id === id);
    if (idx < 0) throw new Error("Contact not found");
    this.data.contacts[idx] = { ...this.data.contacts[idx], ...updates };
    await this.saveData();
    return this.data.contacts[idx];
  }

  async deleteContact(id: string): Promise<void> {
    await this.initialized;
    const idx = this.data.contacts.findIndex(c => c.id === id);
    if (idx < 0) throw new Error("Contact not found");
    this.data.contacts.splice(idx, 1);
    await this.saveData();
  }

  async getGMsForCompany(companyId: string): Promise<Contact[]> {
    await this.initialized;
    return this.data.contacts.filter(c =>
      c.companies.some(cc => cc.companyId === companyId && cc.role === "GM")
    );
  }
}

export const storage = new JsonStorage();
