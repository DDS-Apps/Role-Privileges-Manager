import { sendItFulfillmentEmail } from "./email.js";
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
  ApprovalStage,
  ViewerContext,
  UserRoleImportRow,
  UserRoleImportResult,
  UserRoleImportMode,
  CatalogImportResult,
  EmployeeRosterImportRow,
  EmployeeRosterImportResult,
} from "@shared/schema";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isContactGMOfCompany } from "./viewer-context.js";
import { accessUsers } from "./access-users.js";
import {
  parseSupportTicketId,
  parseAckRequestTitle,
  isResolvedEmail,
  bodyContainsRequestId,
  ticketIdMatches,
  isAllowedSupportSender,
} from "./it-email-parser.js";

export interface IStorage {
  getBootstrapData(viewer?: ViewerContext | null): Promise<BootstrapResponse>;
  
  // Assignments (kept for internal use during approval)
  applyAssignments(
    managerId: string, 
    companyId: string, 
    employeeId: string, 
    privilegeIds: string[]
  ): Promise<Assignment>;
  
  // Catalog
  uploadCatalog(managerId: string, catalog: { module: string; function: string; role: string }[]): Promise<Privilege[]>;
  importPrivilegeCatalog(
    actorId: string,
    catalog: { module: string; function: string; role: string }[],
    mode?: "merge" | "replace",
  ): Promise<CatalogImportResult>;
  importUserRoles(actorId: string, rows: UserRoleImportRow[], mode: UserRoleImportMode): Promise<UserRoleImportResult>;
  importEmployeeRoster(actorId: string, rows: EmployeeRosterImportRow[]): Promise<EmployeeRosterImportResult>;
  
  // Audit
  getAuditLog(): Promise<AuditEntry[]>;
  
  // Helpers
  getAssignment(companyId: string, employeeId: string): Promise<Assignment | undefined>;
  getLegalEmployees(managerId: string): Promise<Employee[]>;
  getAllEmployees(): Promise<Employee[]>;
  
  // Request CRUD
  createRequest(input: CreateRequestInput): Promise<PrivilegeRequest>;
  getRequests(filters?: { managerId?: string; employeeId?: string; status?: RequestStatus; targetCompanyIds?: string[]; managedModules?: string[] | null }): Promise<PrivilegeRequest[]>;
  updateRequestStatus(requestId: string, status: RequestStatus, adminComments: string | null, adminId: string): Promise<PrivilegeRequest>;
  submitRequestToItFulfillment(requestId: string, actorId: string, approverName?: string): Promise<PrivilegeRequest>;
  registerItTicket(requestId: string, ticketId: string, actorId: string): Promise<PrivilegeRequest>;
  fulfillRequestByTicket(ticketId: string): Promise<PrivilegeRequest | null>;
  markRequestItResolved(requestId: string, adminId: string): Promise<PrivilegeRequest>;
  processItAckEmail(subject: string, body: string, from: string): Promise<boolean>;
  processItResolvedEmail(subject: string, body: string, from: string): Promise<boolean>;
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
        if (!req.approvalStage) {
          req.approvalStage = "none";
          needsSave = true;
        }
        if (req.supportRequestTitle === undefined) {
          req.supportRequestTitle = null;
          needsSave = true;
        }
        if (req.supportTicketId === undefined) {
          req.supportTicketId = null;
          needsSave = true;
        }
        if (req.itEmailSentAt === undefined) {
          req.itEmailSentAt = null;
          needsSave = true;
        }
        if (req.itTicketLoggedAt === undefined) {
          req.itTicketLoggedAt = null;
          needsSave = true;
        }
        if (req.itResolvedAt === undefined) {
          req.itResolvedAt = null;
          needsSave = true;
        }
      }

      for (const contact of this.data.contacts) {
        if (contact.managedModules === undefined) {
          contact.managedModules = [];
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

  private getItEmailAllowlist(): string[] {
    const raw = process.env.IT_EMAIL_FROM_ALLOWLIST || "support";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  private buildItEmailContext(
    request: PrivilegeRequest,
    approverName?: string,
  ): {
    managerName: string;
    managerUserId?: string;
    employeeName: string;
    employeeId: string;
    companyName: string;
    roles: { module: string; function: string; role: string }[];
    approverName?: string;
    approverComments?: string | null;
  } {
    const manager =
      this.data.employees.find((e) => e.id === request.managerId) ||
      this.data.employees.find((e) => e.id === request.managerUserId || "");
    const employee = this.data.employees.find((e) => e.id === request.employeeId);
    const company = this.data.companies.find((c) => c.id === request.companyId);
    const roles = request.rolesSelected
      .map((id) => this.data.privileges.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        module: p!.module,
        function: p!.function,
        role: p!.role,
      }));

    return {
      managerName: manager?.name || request.managerId,
      managerUserId: request.managerUserId,
      employeeName: employee?.name || request.employeeId,
      employeeId: request.employeeId,
      companyName: company?.name || request.companyId,
      roles,
      approverName,
      approverComments: request.adminComments,
    };
  }

  private async applyApprovedRequest(request: PrivilegeRequest, actorId: string): Promise<void> {
    const requestType = request.requestType ?? "grant";
    if (requestType === "grant") {
      this.applyGrantRequest(request);
    } else {
      await this.executeRevokeRequest(request, actorId);
    }
  }

  async submitRequestToItFulfillment(
    requestId: string,
    actorId: string,
    approverName?: string,
  ): Promise<PrivilegeRequest> {
    await this.initialized;
    const requestIdx = this.data.requests.findIndex((r) => r.id === requestId);
    if (requestIdx < 0) throw new Error("Request not found");

    const request = this.data.requests[requestIdx];
    if (request.status !== "pending" && request.status !== "approved_pending_it") {
      throw new Error("Request is not eligible for IT fulfillment");
    }

    const ctx = this.buildItEmailContext(request, approverName);
    const subject = await sendItFulfillmentEmail(request, ctx);
    const now = new Date().toISOString();

    request.status = "approved_pending_it";
    request.approvalStage = "none";
    request.supportRequestTitle = subject;
    request.itEmailSentAt = now;
    request.updatedAt = now;
    this.data.requests[requestIdx] = request;
    await this.saveData();

    const employee = this.data.employees.find((e) => e.id === request.employeeId);
    const company = this.data.companies.find((c) => c.id === request.companyId);
    await this.addAuditEntry(
      actorId,
      "IT_EMAIL_SENT",
      `IT fulfillment email sent to Support for ${request.module}/${request.function} — ${employee?.name} in ${company?.name} (subject: ${subject})`,
      request.companyId,
      request.employeeId,
    );

    return request;
  }

  async registerItTicket(
    requestId: string,
    ticketIdRaw: string,
    actorId: string,
  ): Promise<PrivilegeRequest> {
    await this.initialized;
    const ticketId = parseSupportTicketId(ticketIdRaw) || ticketIdRaw.trim();
    if (!ticketId) throw new Error("Invalid ticket ID");

    const requestIdx = this.data.requests.findIndex((r) => r.id === requestId);
    if (requestIdx < 0) throw new Error("Request not found");

    const request = this.data.requests[requestIdx];
    if (request.status !== "approved_pending_it") {
      throw new Error("Request is not awaiting IT fulfillment");
    }

    request.supportTicketId = ticketId.startsWith("RE-") ? ticketId : `RE-${ticketId.replace(/\D/g, "")}`;
    request.itTicketLoggedAt = new Date().toISOString();
    request.updatedAt = request.itTicketLoggedAt;
    this.data.requests[requestIdx] = request;
    await this.saveData();

    await this.addAuditEntry(
      actorId,
      "IT_TICKET_LOGGED",
      `ServiceDesk ticket ${request.supportTicketId} linked to request ${request.id}`,
      request.companyId,
      request.employeeId,
    );

    return request;
  }

  async fulfillRequestByTicket(ticketIdRaw: string): Promise<PrivilegeRequest | null> {
    await this.initialized;
    const ticketId = parseSupportTicketId(ticketIdRaw) || ticketIdRaw.trim();
    if (!ticketId) return null;

    const request = this.data.requests.find(
      (r) =>
        r.status === "approved_pending_it" &&
        r.supportTicketId &&
        ticketIdMatches(r.supportTicketId, ticketId),
    );
    if (!request) return null;

    return this.markRequestItResolved(request.id, "system");
  }

  async markRequestItResolved(requestId: string, adminId: string): Promise<PrivilegeRequest> {
    await this.initialized;
    const requestIdx = this.data.requests.findIndex((r) => r.id === requestId);
    if (requestIdx < 0) throw new Error("Request not found");

    const request = this.data.requests[requestIdx];
    if (request.status === "active") return request;
    if (request.status !== "approved_pending_it") {
      throw new Error("Request is not awaiting IT resolution");
    }

    const now = new Date().toISOString();
    request.status = "active";
    request.itResolvedAt = now;
    request.updatedAt = now;
    this.data.requests[requestIdx] = request;

    await this.applyApprovedRequest(request, adminId);
    await this.saveData();
    await this.processScheduledRequests();

    const employee = this.data.employees.find((e) => e.id === request.employeeId);
    const company = this.data.companies.find((c) => c.id === request.companyId);
    const requestType = request.requestType ?? "grant";
    await this.addAuditEntry(
      adminId,
      "IT_TICKET_RESOLVED",
      `IT fulfilled ${requestType === "revoke" ? "delete" : "grant"} request ${request.supportTicketId || request.id} — ${employee?.name} in ${company?.name}; privileges ${requestType === "revoke" ? "removed" : "applied"}`,
      request.companyId,
      request.employeeId,
    );

    return request;
  }

  async processItAckEmail(subject: string, body: string, from: string): Promise<boolean> {
    if (!isAllowedSupportSender(from, this.getItEmailAllowlist())) return false;

    const ticketId = parseSupportTicketId(subject) || parseSupportTicketId(body);
    if (!ticketId) return false;

    const ackTitle = parseAckRequestTitle(body);
    const pending = this.data.requests.filter((r) => r.status === "approved_pending_it");

    let request = pending.find((r) => {
      if (r.supportTicketId && ticketIdMatches(r.supportTicketId, ticketId)) return true;
      if (ackTitle && r.supportRequestTitle && ackTitle === r.supportRequestTitle) return true;
      if (r.supportRequestTitle && body.includes(r.supportRequestTitle)) return true;
      return bodyContainsRequestId(body, r.id);
    });

    if (!request) {
      const numeric = ticketId.replace(/^RE-/i, "");
      request = pending.find((r) => r.supportRequestTitle?.includes(`[${numeric}]`));
    }

    if (!request || request.supportTicketId) return false;

    await this.registerItTicket(request.id, ticketId, "system-email");
    return true;
  }

  async processItResolvedEmail(subject: string, body: string, from: string): Promise<boolean> {
    if (!isAllowedSupportSender(from, this.getItEmailAllowlist())) return false;
    if (!isResolvedEmail(body)) return false;

    const ticketId = parseSupportTicketId(subject) || parseSupportTicketId(body);
    if (!ticketId) return false;

    const fulfilled = await this.fulfillRequestByTicket(ticketId);
    return fulfilled !== null;
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

  private filterBootstrapForViewer(
    data: BootstrapResponse,
    viewer: ViewerContext,
  ): BootstrapResponse {
    if (viewer.managedModules === null) return data;

    const moduleSet = new Set(viewer.managedModules);
    const privileges = data.privileges.filter((p) => moduleSet.has(p.module));
    const allowedPrivIds = new Set(privileges.map((p) => p.id));

    const assignments = data.assignments
      .map((a) => ({
        ...a,
        privilegeIds: a.privilegeIds.filter((id) => allowedPrivIds.has(id)),
      }))
      .filter((a) => a.privilegeIds.length > 0);

    const requests = data.requests.filter((r) => moduleSet.has(r.module));

    return { ...data, privileges, assignments, requests };
  }

  private isExternalGrant(
    request: PrivilegeRequest,
    employee: Employee,
  ): boolean {
    return (
      (request.requestType ?? "grant") === "grant" &&
      employee.legalCompanyId !== request.companyId
    );
  }

  private async contacts(): Promise<Contact[]> {
    await accessUsers.ensureReady();
    return accessUsers.getAllContacts();
  }

  private canActOnRequestAtStage(
    adminId: string,
    request: PrivilegeRequest,
    stage: ApprovalStage,
    targetEmployee: Employee | undefined,
    isSystemAdmin: boolean,
    contacts: Contact[],
  ): boolean {
    if (isSystemAdmin) return true;

    if (stage === "pending_requester_gm") {
      return isContactGMOfCompany(
        contacts,
        adminId,
        request.managerLegalCompanyId,
      );
    }

    if (!targetEmployee) return false;

    return isContactGMOfCompany(
      contacts,
      adminId,
      targetEmployee.legalCompanyId,
    );
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  async getBootstrapData(viewer?: ViewerContext | null): Promise<BootstrapResponse> {
    await this.initialized;
    await this.processScheduledRequests();
    const contacts = await this.contacts();
    const base: BootstrapResponse = {
      ...this.data,
      contacts,
      auditLog: this.auditLog,
    };
    if (!viewer || viewer.managedModules === null) {
      return base;
    }
    return this.filterBootstrapForViewer(base, viewer);
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

  async importPrivilegeCatalog(
    actorId: string,
    catalog: { module: string; function: string; role: string }[],
    mode: "merge" | "replace" = "merge",
  ): Promise<CatalogImportResult> {
    await this.initialized;

    const result: CatalogImportResult = {
      type: "catalog",
      processed: 0,
      privilegesCreated: 0,
      privilegesSkipped: 0,
      mode,
      errors: [],
    };

    if (mode === "replace") {
      this.data.privileges = [];
    }

    for (const item of catalog) {
      result.processed++;
      const existing = this.data.privileges.find(
        (p) =>
          p.module.trim().toLowerCase() === item.module.trim().toLowerCase() &&
          p.function.trim().toLowerCase() === item.function.trim().toLowerCase() &&
          p.role.trim().toLowerCase() === item.role.trim().toLowerCase(),
      );
      if (existing) {
        result.privilegesSkipped++;
        continue;
      }
      this.createPrivilegeFromImport(item.module, item.function, item.role);
      result.privilegesCreated++;
    }

    if (result.privilegesCreated > 0 || mode === "replace") {
      await this.saveData();
    }

    const actor =
      this.data.employees.find((e) => e.id === actorId) ||
      (await this.contacts()).find((c) => c.id === actorId);
    const actorName = actor?.name || actorId;

    await this.addAuditEntry(
      actorId,
      "UPLOAD_CATALOG",
      `${actorName} imported privilege catalog (${mode}): ${result.privilegesCreated} new, ${result.privilegesSkipped} skipped`,
    );

    return result;
  }

  async importEmployeeRoster(
    actorId: string,
    rows: EmployeeRosterImportRow[],
  ): Promise<EmployeeRosterImportResult> {
    await this.initialized;

    const result: EmployeeRosterImportResult = {
      type: "employees",
      processed: 0,
      created: 0,
      updated: 0,
      managersLinked: 0,
      skipped: 0,
      errors: [],
    };

    const employeeIds = new Set(this.data.employees.map((e) => e.id));

    for (const row of rows) {
      result.processed++;

      if (!this.data.companies.some((c) => c.id === row.legalCompanyId)) {
        this.data.companies.push({
          id: row.legalCompanyId,
          name: row.companyName?.trim() || row.legalCompanyId,
        });
      }

      const existing = this.data.employees.find((e) => e.id === row.employeeId);
      const email =
        row.email ||
        existing?.email ||
        `${row.employeeId}@import.local`;

      if (existing) {
        existing.name = row.name;
        existing.title = row.title ?? existing.title;
        existing.email = email;
        existing.legalCompanyId = row.legalCompanyId;
        existing.isManager = row.isManager;
        if (row.managerId) {
          existing.managerId = row.managerId;
          result.managersLinked++;
        }
        result.updated++;
      } else {
        this.data.employees.push({
          id: row.employeeId,
          name: row.name,
          title: row.title ?? "",
          email,
          isManager: row.isManager,
          legalCompanyId: row.legalCompanyId,
          ...(row.managerId ? { managerId: row.managerId } : {}),
        });
        employeeIds.add(row.employeeId);
        if (row.managerId) result.managersLinked++;
        result.created++;
      }
    }

    if (result.created > 0 || result.updated > 0) {
      await this.saveData();
    }

    const actor =
      this.data.employees.find((e) => e.id === actorId) ||
      (await this.contacts()).find((c) => c.id === actorId);
    const actorName = actor?.name || actorId;

    await this.addAuditEntry(
      actorId,
      "UPLOAD_CATALOG",
      `${actorName} imported employee roster: ${result.created} created, ${result.updated} updated`,
    );

    return result;
  }

  private findPrivilegeByModuleFunction(
    module: string,
    functionName: string,
  ): Privilege | undefined {
    const mod = module.trim();
    const fn = functionName.trim();
    return this.data.privileges.find(
      (p) =>
        p.module.trim().toLowerCase() === mod.toLowerCase() &&
        p.function.trim().toLowerCase() === fn.toLowerCase(),
    );
  }

  private createPrivilegeFromImport(
    module: string,
    functionName: string,
    role: string,
  ): Privilege {
    const modKey = module.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "MOD";
    const sanRole = role
      .replace(/[^A-Za-z0-9]/g, "_")
      .toUpperCase()
      .slice(0, 20)
      .replace(/^_+|_+$/g, "") || "ROLE";

    let n = 1;
    let id = `P_${modKey}_${sanRole}_${String(n).padStart(2, "0")}`;
    while (this.data.privileges.some((p) => p.id === id)) {
      n++;
      id = `P_${modKey}_${sanRole}_${String(n).padStart(2, "0")}`;
    }

    const privilege: Privilege = {
      id,
      module: module.trim(),
      function: functionName.trim(),
      role: role.trim(),
    };
    this.data.privileges.push(privilege);
    return privilege;
  }

  async importUserRoles(
    actorId: string,
    rows: UserRoleImportRow[],
    mode: UserRoleImportMode = "merge",
  ): Promise<UserRoleImportResult> {
    await this.initialized;

    const result: UserRoleImportResult = {
      processed: 0,
      assignmentsUpdated: 0,
      privilegesCreated: 0,
      companiesCreated: 0,
      employeesCreated: 0,
      skipped: 0,
      errors: [],
    };

    const employeeIds = new Set(this.data.employees.map((e) => e.id));

    const ensureCompany = (companyId: string, name?: string): void => {
      if (this.data.companies.some((c) => c.id === companyId)) return;
      this.data.companies.push({
        id: companyId,
        name: name?.trim() || companyId,
      });
      result.companiesCreated++;
    };

    const ensureEmployee = (row: UserRoleImportRow): void => {
      if (employeeIds.has(row.employeeId)) return;

      ensureCompany(row.legalCompanyId, row.companyName);

      this.data.employees.push({
        id: row.employeeId,
        name: row.displayName?.trim() || row.employeeId,
        title: "",
        email: `${row.employeeId}@import.local`,
        isManager: false,
        legalCompanyId: row.legalCompanyId,
      });
      employeeIds.add(row.employeeId);
      result.employeesCreated++;
    };

    // replace mode: track desired privilege ids per assignment pair from file
    const replaceMap = new Map<string, Set<string>>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      ensureCompany(row.companyId);
      ensureEmployee(row);

      let privilege = this.findPrivilegeByModuleFunction(row.module, row.function);
      if (!privilege) {
        privilege = this.createPrivilegeFromImport(
          row.module,
          row.function,
          row.role,
        );
        result.privilegesCreated++;
      }

      const pairKey = `${row.companyId}:${row.employeeId}`;

      if (mode === "replace") {
        if (!replaceMap.has(pairKey)) {
          replaceMap.set(pairKey, new Set());
        }
        replaceMap.get(pairKey)!.add(privilege.id);
      } else {
        let assignment = this.data.assignments.find(
          (a) => a.companyId === row.companyId && a.employeeId === row.employeeId,
        );

        if (!assignment) {
          assignment = {
            companyId: row.companyId,
            employeeId: row.employeeId,
            privilegeIds: [],
          };
          this.data.assignments.push(assignment);
          result.assignmentsUpdated++;
        }

        if (!assignment.privilegeIds.includes(privilege.id)) {
          assignment.privilegeIds.push(privilege.id);
          result.assignmentsUpdated++;
        }
      }

      result.processed++;
    }

    if (mode === "replace") {
      for (const [pairKey, privIds] of Array.from(replaceMap.entries())) {
        const [companyId, employeeId] = pairKey.split(":");
        const existingIdx = this.data.assignments.findIndex(
          (a) => a.companyId === companyId && a.employeeId === employeeId,
        );
        const privilegeIds = Array.from(privIds);
        if (existingIdx >= 0) {
          this.data.assignments[existingIdx].privilegeIds = privilegeIds;
        } else {
          this.data.assignments.push({ companyId, employeeId, privilegeIds });
        }
        result.assignmentsUpdated++;
      }
    }

    if (
      result.processed > 0 ||
      result.privilegesCreated > 0 ||
      result.companiesCreated > 0 ||
      result.employeesCreated > 0
    ) {
      await this.saveData();
    }

    const actor =
      this.data.employees.find((e) => e.id === actorId) ||
      (await this.contacts()).find((c) => c.id === actorId);
    const actorName = actor?.name || actorId;

    await this.addAuditEntry(
      actorId,
      "UPLOAD_USER_ROLES",
      `${actorName} imported user roles (${mode}): ${result.processed} rows, ${result.companiesCreated} new companies, ${result.employeesCreated} new employees, ${result.privilegesCreated} new privileges, ${result.assignmentsUpdated} assignment updates, ${result.skipped} skipped`,
    );

    return result;
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
    const contacts = await this.contacts();

    // Get manager — accept any employee (contacts are pre-authenticated as managers)
    // Also try matching via contact userId for contacts whose SAP id differs from actingUserId
    const manager = this.data.employees.find(e => e.id === input.managerId)
      || (() => {
        const contact = contacts.find(c => c.id === input.managerId);
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
    const isExternalGrant =
      requestType === "grant" && employee.legalCompanyId !== input.companyId;
    const approvalStage: ApprovalStage = isExternalGrant
      ? "pending_requester_gm"
      : "none";

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
      approvalStage,
      adminComments: null,
      supportRequestTitle: null,
      supportTicketId: null,
      itEmailSentAt: null,
      itTicketLoggedAt: null,
      itResolvedAt: null,
      executedAt: null,
      reinstatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.data.requests.push(request);

    // ── Auto-approve if the submitter is a GM of the employee's legal company ──
    const employeeLegalCompanyId = employee.legalCompanyId;
    const submitterContact =
      contacts.find(c => c.userId === input.managerId) ||
      contacts.find(c => c.id === input.managerId) ||
      (input.managerUserId ? contacts.find(c => c.userId === input.managerUserId || c.id === input.managerUserId) : undefined);

    const isGMofEmployeeCompany = submitterContact?.companies.some(
      cc => cc.companyId === employeeLegalCompanyId && cc.role === "GM"
    );

    if (!isExternalGrant && isGMofEmployeeCompany) {
      request.adminComments = "Auto-approved by GM";
      request.updatedAt = new Date().toISOString();
      await this.saveData();

      await this.addAuditEntry(
        input.managerId,
        "REQUEST_APPROVED",
        `${manager.name} auto-approved ${requestType === "revoke" ? "delete" : "grant"} request for ${request.module}/${request.function} — ${employee.name} in ${company.name}`,
        input.companyId,
        input.employeeId,
      );

      return this.submitRequestToItFulfillment(request.id, input.managerId, manager.name);
    }

    await this.saveData();
    await this.processScheduledRequests();

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

  async getRequests(filters?: { managerId?: string; employeeId?: string; status?: RequestStatus; targetCompanyIds?: string[]; managedModules?: string[] | null }): Promise<PrivilegeRequest[]> {
    await this.initialized;

    let requests = [...this.data.requests];

    if (filters?.managedModules) {
      const moduleSet = new Set(filters.managedModules);
      requests = requests.filter((r) => moduleSet.has(r.module));
    }

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

    const stage = request.approvalStage ?? "none";

    // Block: requester cannot self-approve their own request
    if (adminId === request.managerId || adminId === request.managerUserId) {
      throw new Error("The requester cannot approve or reject their own request");
    }

    const contacts = await this.contacts();
    const isSystemAdmin =
      Boolean(this.data.employees.find(e => e.id === adminId && e.isAdmin)) ||
      Boolean(contacts.find(c => c.id === adminId && c.isAdmin));

    const targetEmployee = this.data.employees.find(e => e.id === request.employeeId);

    if (!this.canActOnRequestAtStage(adminId, request, stage, targetEmployee, Boolean(isSystemAdmin), contacts)) {
      if (stage === "pending_requester_gm") {
        throw new Error("Only the GM of the requester's company can approve or reject this request at step 1");
      }
      if (stage === "pending_target_gm") {
        throw new Error("Only the GM of the employee's company can approve or reject this request at step 2");
      }
      throw new Error("Only the GM of the employee's company can approve or reject this request");
    }

    const adminEmp = this.data.employees.find(e => e.id === adminId);
    const adminContact = contacts.find(c => c.id === adminId);
    const adminName = adminEmp?.name || adminContact?.name || adminId;
    const requestType = request.requestType ?? "grant";

    if (status === "rejected") {
      request.status = "rejected";
      request.approvalStage = "none";
      request.adminComments = adminComments;
      request.updatedAt = new Date().toISOString();
      this.data.requests[requestIdx] = request;
      await this.saveData();

      const employee = this.data.employees.find(e => e.id === request.employeeId);
      const company = this.data.companies.find(c => c.id === request.companyId);
      await this.addAuditEntry(
        adminId,
        "REQUEST_REJECTED",
        `${adminName} rejected ${requestType === "revoke" ? "delete" : "grant"} request for ${request.module}/${request.function} — ${employee?.name} in ${company?.name}${adminComments ? ` - Comment: ${adminComments}` : ""}`,
        request.companyId,
        request.employeeId,
      );
      return request;
    }

    if (stage === "pending_requester_gm") {
      request.approvalStage = "pending_target_gm";
      request.adminComments = adminComments;
      request.updatedAt = new Date().toISOString();
      this.data.requests[requestIdx] = request;
      await this.saveData();

      const employee = this.data.employees.find(e => e.id === request.employeeId);
      const company = this.data.companies.find(c => c.id === request.companyId);
      await this.addAuditEntry(
        adminId,
        "REQUEST_APPROVED_STEP1",
        `${adminName} approved step 1 (requester's company GM) for external ${requestType === "revoke" ? "delete" : "grant"} request — ${request.module}/${request.function} for ${employee?.name} in ${company?.name}${adminComments ? ` - Comment: ${adminComments}` : ""}`,
        request.companyId,
        request.employeeId,
      );
      return request;
    }

    // Final GM approval (internal single-step or external step 2) → queue IT fulfillment
    request.adminComments = adminComments;
    request.approvalStage = "none";
    request.updatedAt = new Date().toISOString();
    this.data.requests[requestIdx] = request;
    await this.saveData();

    const employee = this.data.employees.find(e => e.id === request.employeeId);
    const company = this.data.companies.find(c => c.id === request.companyId);

    await this.addAuditEntry(
      adminId,
      "REQUEST_APPROVED",
      `${adminName} approved ${requestType === "revoke" ? "delete" : "grant"} request for ${request.module}/${request.function} — ${employee?.name} in ${company?.name}${adminComments ? ` - Comment: ${adminComments}` : ""}`,
      request.companyId,
      request.employeeId,
    );

    return this.submitRequestToItFulfillment(requestId, adminId, adminName);
  }

  async terminateEmployee(employeeId: string, adminId: string): Promise<void> {
    await this.initialized;
    const contacts = await this.contacts();

    // Verify admin — check employees OR allow-list contacts
    const adminEmp2 = this.data.employees.find(e => e.id === adminId && e.isAdmin);
    const adminContact2 = contacts.find(c => c.id === adminId && c.isAdmin);
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
      if (request.employeeId === employeeId && (request.status === "pending" || request.status === "approved_pending_it")) {
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

  // ── Contacts (backed by access-users.json allow-list) ─────────────────────

  async findContactByEmail(email: string): Promise<Contact | undefined> {
    await this.initialized;
    await accessUsers.ensureReady();
    return accessUsers.findContactByEmail(email);
  }

  async getContacts(): Promise<Contact[]> {
    await this.initialized;
    return this.contacts();
  }

  async createContact(contact: Omit<Contact, "id"> & {
    authType?: "sso" | "local";
    username?: string;
    password?: string;
  }): Promise<Contact> {
    await this.initialized;
    const data = this.data;
    return accessUsers.upsertPerson({
      email: contact.email,
      name: contact.name,
      userId: contact.userId,
      authType: contact.authType || "sso",
      isAdmin: contact.isAdmin,
      managedModules: contact.managedModules,
      companies: contact.companies.map((cc) => ({
        companyId: cc.companyId,
        role: cc.role,
        companyName: data.companies.find((c) => c.id === cc.companyId)?.name || cc.companyId,
      })),
      username: contact.username,
      password: contact.password,
    });
  }

  async updateContact(
    id: string,
    updates: Partial<Omit<Contact, "id">> & {
      authType?: "sso" | "local";
      username?: string;
      password?: string;
    },
  ): Promise<Contact> {
    await this.initialized;
    const companies = updates.companies?.map((cc) => ({
      companyId: cc.companyId,
      role: cc.role,
      companyName: this.data.companies.find((c) => c.id === cc.companyId)?.name || cc.companyId,
    }));
    return accessUsers.updatePerson(id, {
      email: updates.email,
      name: updates.name,
      userId: updates.userId,
      isAdmin: updates.isAdmin,
      managedModules: updates.managedModules,
      companies,
      authType: updates.authType,
      username: updates.username,
      password: updates.password,
    });
  }

  async deleteContact(id: string): Promise<void> {
    await this.initialized;
    await accessUsers.deletePerson(id);
  }

  async getGMsForCompany(companyId: string): Promise<Contact[]> {
    await this.initialized;
    await accessUsers.ensureReady();
    return accessUsers.getGMsForCompany(companyId);
  }
}

export const storage = new JsonStorage();
