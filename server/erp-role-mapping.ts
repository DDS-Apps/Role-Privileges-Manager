/** Catalog Function names (must match Business-Role.xlsx Functions column). */
export type CatalogFunction =
  | "Accountant"
  | "Accounting and Reporting"
  | "Buyer / Purchasing Agent"
  | "Cost Accountant"
  | "Employee Relation"
  | "Financial Auditing"
  | "Financial Planning and Analysis"
  | "Inventory Clerk / Warehouse Operator"
  | "Learning"
  | "Maintenance Manager"
  | "Maintenance Technician"
  | "Order Entry Specialist"
  | "Payroll"
  | "Performance Management"
  | "Product Data Analyst"
  | "Production Operator"
  | "Receiving Clerk"
  | "Recruitment"
  | "Requisitioner"
  | "Shipping Clerk"
  | "Treasury Management";

const PLACEHOLDER_ROLE_NAMES = new Set([
  "not found",
  "n/a",
  "na",
  "none",
  "null",
  "-",
  "—",
]);

type ErpRoleRule = { pattern: RegExp; function: CatalogFunction };

/** Maps Oracle ERP role codes / display names to catalog Functions. */
const ERP_ROLE_RULES: ErpRoleRule[] = [
  { pattern: /learner|learning|db_learn/i, function: "Learning" },
  { pattern: /recruit|job_offer/i, function: "Recruitment" },
  { pattern: /payroll|\bpay_/i, function: "Payroll" },
  { pattern: /performance|goal_plan|talent(?!_report)/i, function: "Performance Management" },
  {
    pattern: /human.?resource|hr_|hcm|benefits|per_employee|line_manager|employee_self|emp_self|talent_report/i,
    function: "Employee Relation",
  },
  { pattern: /treasury|cash_manager|db_ce|\bce_/i, function: "Treasury Management" },
  { pattern: /budget|fp&a|financial.?plan/i, function: "Financial Planning and Analysis" },
  { pattern: /audit|collect/i, function: "Financial Auditing" },
  {
    pattern: /supplier|procurement|purchas|buyer|poz_|po_|sourcing/i,
    function: "Buyer / Purchasing Agent",
  },
  { pattern: /requisition/i, function: "Requisitioner" },
  { pattern: /inventory|warehouse|\binv_/i, function: "Inventory Clerk / Warehouse Operator" },
  { pattern: /shipping|\bship_/i, function: "Shipping Clerk" },
  { pattern: /receiving|\brcv_/i, function: "Receiving Clerk" },
  { pattern: /maintenance.*manager|maint.*mgr/i, function: "Maintenance Manager" },
  { pattern: /maintenance|maint_/i, function: "Maintenance Technician" },
  { pattern: /cost_account|\bcost_/i, function: "Cost Accountant" },
  { pattern: /production|mfg_|manufact/i, function: "Production Operator" },
  { pattern: /order_entry|\boe_/i, function: "Order Entry Specialist" },
  { pattern: /product.*analyst|data_analyst/i, function: "Product Data Analyst" },
  {
    pattern: /general_account|db_gl|db_fa|db_ar|db_ap|accountant|accounting|asset|receivable|payable|\bgl_/i,
    function: "Accountant",
  },
  { pattern: /accounting.*report|report.*analytics|\brpt_/i, function: "Accounting and Reporting" },
];

export function isPlaceholderBusinessRoleName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || PLACEHOLDER_ROLE_NAMES.has(normalized);
}

export function resolveErpRoleToCatalogFunction(roleText: string): CatalogFunction | null {
  const text = roleText.trim();
  if (!text || isPlaceholderBusinessRoleName(text)) return null;

  for (const rule of ERP_ROLE_RULES) {
    if (rule.pattern.test(text)) return rule.function;
  }
  return null;
}

export function resolveFunctionNameCandidates(row: Record<string, unknown>, pickColumn: (row: Record<string, unknown>, aliases: string[]) => string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isPlaceholderBusinessRoleName(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(trimmed);
  };

  // New user-roles template: only Business Role Name — ignore legacy ROLE_NAME columns
  // that may still exist in ERP exports and cause false matches (e.g. Employee Relation).
  add(pickColumn(row, ["business_role_name", "business_role"]));

  return candidates;
}
