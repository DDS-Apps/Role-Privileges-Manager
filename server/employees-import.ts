import * as XLSX from "xlsx";
import type {
  Company,
  Employee,
  EmployeeRosterImportErrorDetail,
  EmployeeRosterImportRow,
  UserRoleImportError,
} from "@shared/schema";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-–—:/\\]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s.endsWith(".0") && /^\d+\.0$/.test(s)) return s.slice(0, -2);
  return s;
}

function normalizeUsername(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;
  try {
    const n = Number(val);
    if (!Number.isNaN(n) && Number.isFinite(n)) return String(Math.trunc(n));
  } catch {
    // keep string
  }
  return val.replace(/\.0$/, "");
}

function pickColumn(row: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const val = cellStr(row[alias]);
    if (val) return val;
  }
  return "";
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

function resolveCompanyId(rawCode: string, companyCodeSet: Set<string>): string {
  const companyCode = rawCode.trim();
  const padded = companyCode.padStart(3, "0");
  const unpadded = companyCode.replace(/^0+/, "") || companyCode;
  if (companyCodeSet.has(companyCode)) return companyCode;
  if (companyCodeSet.has(padded)) return padded;
  if (companyCodeSet.has(unpadded)) return unpadded;
  return companyCode;
}

function resolveKnownCompanyCode(
  rawCode: string,
  companyCodeSet: Set<string>,
): string | null {
  if (!rawCode.trim()) return null;
  const resolved = resolveCompanyId(rawCode, companyCodeSet);
  return companyCodeSet.has(resolved) ? resolved : null;
}

export interface ParseEmployeeRosterResult {
  rows: EmployeeRosterImportRow[];
  errors: UserRoleImportError[];
  errorDetails: EmployeeRosterImportErrorDetail[];
  skipped: number;
}

export function parseEmployeeRosterExcel(
  buffer: Buffer,
  companies: Company[],
  employees: Employee[] = [],
): ParseEmployeeRosterResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Workbook has no sheets" }],
      errorDetails: [],
      skipped: 0,
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
    { defval: "", raw: false },
  );
  if (rawRows.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Sheet is empty" }],
      errorDetails: [],
      skipped: 0,
    };
  }

  const companyCodeSet = new Set(companies.map((c) => c.id));
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const rows: EmployeeRosterImportRow[] = [];
  const errors: UserRoleImportError[] = [];
  const errorDetails: EmployeeRosterImportErrorDetail[] = [];
  const seen = new Set<string>();

  if (companies.length === 0) {
    errors.push({
      row: 0,
      message: "Company master list is empty — import Step 2 (Companies) before employee roster",
    });
  }

  const recordError = (
    rowNum: number,
    reason: string,
    detail: Omit<EmployeeRosterImportErrorDetail, "row" | "reason">,
  ): void => {
    errors.push({ row: rowNum, message: reason });
    errorDetails.push({ row: rowNum, reason, ...detail });
  };

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2;
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      mapped[normalizeHeader(key)] = value;
    }

    const employeeId = normalizeUsername(
      pickColumn(mapped, ["username", "user_name", "employee_id", "userid"]),
    );
    const displayName = pickColumn(mapped, [
      "display_name",
      "display_name_english",
      "display_nameenglish",
      "name",
      "employee_name",
    ]);
    const nameAr = pickColumn(mapped, [
      "display_name_arabic",
      "display_namearabic",
      "display_name_ar",
    ]);
    const companyCode = pickColumn(mapped, ["company_code", "legal_company_code"]);
    const department = pickColumn(mapped, [
      "department_name",
      "department",
      "department_english",
    ]);
    const email = pickColumn(mapped, ["email_address", "email", "work_email"]).toLowerCase();
    const title = pickColumn(mapped, ["job_title", "title", "title_english"]);
    const managerName = pickColumn(mapped, ["manager_name", "managername"]);
    const managerId = normalizeUsername(
      pickColumn(mapped, ["manager_username", "manager_id", "manager_user_name"]),
    );
    const managerEmail = pickColumn(mapped, ["manageremail", "manager_email"]).toLowerCase();
    const isManagerRaw = pickColumn(mapped, ["is_manager", "manager"]);

    if (!employeeId && !displayName && !companyCode) {
      continue;
    }

    if (!employeeId) {
      recordError(rowNum, "Missing USERNAME", {
        displayNameEn: displayName || undefined,
        companyCode: companyCode || undefined,
        email: email || undefined,
      });
      continue;
    }
    if (seen.has(employeeId)) continue;
    seen.add(employeeId);

    if (!companyCode) {
      recordError(rowNum, "Missing Company_Code", {
        username: employeeId,
        displayNameEn: displayName || undefined,
        email: email || undefined,
      });
      continue;
    }

    const legalCompanyId = resolveKnownCompanyCode(companyCode, companyCodeSet);
    if (!legalCompanyId) {
      recordError(rowNum, `Unknown Company_Code: ${companyCode}`, {
        username: employeeId,
        displayNameEn: displayName || undefined,
        companyCode,
        email: email || undefined,
      });
      continue;
    }

    const companyRecord = companies.find((c) => c.id === legalCompanyId);

    rows.push({
      employeeId,
      name: displayName || nameAr || employeeById.get(employeeId)?.name || employeeId,
      nameAr: nameAr || undefined,
      legalCompanyId,
      companyName: companyRecord?.name,
      email: email || undefined,
      title: title || undefined,
      department: department || undefined,
      managerId: managerId || undefined,
      managerEmail: managerEmail || undefined,
      managerName: managerName || undefined,
      isManager: parseBool(isManagerRaw),
    });
  }

  return { rows, errors, errorDetails, skipped: errorDetails.length };
}
