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

function resolveCompanyFromName(name: string, companies: Company[]): string | null {
  const val = name.trim();
  if (!val) return null;

  const lower = val.toLowerCase();
  for (const company of companies) {
    if (company.id.toLowerCase() === lower) return company.id;
    if (company.name.toLowerCase() === lower) return company.id;
  }

  const stripped = val.replace(/^\d+\s+/, "").trim().toLowerCase();
  for (const company of companies) {
    const companyName = company.name.trim().toLowerCase();
    if (companyName === stripped) return company.id;
    if (stripped && (stripped.includes(companyName) || companyName.includes(stripped))) {
      return company.id;
    }
  }

  return null;
}

function resolveKnownCompanyCode(
  rawCode: string,
  companyCodeSet: Set<string>,
  companies: Company[],
): string | null {
  const resolved = resolveCompanyId(rawCode, companyCodeSet);
  if (companyCodeSet.has(resolved)) return resolved;
  const trimmed = rawCode.trim();
  if (companies.some((c) => c.id === trimmed || c.id === resolved)) return resolved;
  return null;
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
    const nameEn = pickColumn(mapped, [
      "display_name_english",
      "display_nameenglish",
      "display_name_en",
      "display_name",
      "name",
      "employee_name",
    ]);
    const nameAr = pickColumn(mapped, [
      "display_name_arabic",
      "display_namearabic",
      "display_name_ar",
    ]);
    const legalCompanyCode = pickColumn(mapped, ["company_code", "legal_company_code"]);
    const companyNameEn = pickColumn(mapped, ["company_name_english", "company_nameenglish", "company_name"]);
    const companyNameAr = pickColumn(mapped, ["company_name_arabic", "company_namearabic"]);
    const email = pickColumn(mapped, ["email", "email_address", "work_email"]).toLowerCase();
    const titleEn = pickColumn(mapped, ["title_english", "titleenglish", "title", "job_title", "position"]);
    const titleAr = pickColumn(mapped, ["title_arabic", "titlearabic"]);
    const departmentEn = pickColumn(mapped, [
      "department_english",
      "departmentenglish",
      "department",
    ]);
    const departmentAr = pickColumn(mapped, ["department_arabic", "departmentarabic"]);
    const managerId = normalizeUsername(
      pickColumn(mapped, ["manager_username", "manager_id", "manager_user_name"]),
    );
    const managerEmail = pickColumn(mapped, ["manageremail", "manager_email"]).toLowerCase();
    const isManagerRaw = pickColumn(mapped, ["is_manager", "manager"]);

    if (!employeeId && !nameEn && !nameAr && !legalCompanyCode && !companyNameEn && !companyNameAr) {
      continue;
    }

    if (!employeeId) {
      recordError(rowNum, "Missing USERNAME / employee ID", {
        displayNameEn: nameEn || undefined,
        displayNameAr: nameAr || undefined,
        companyCode: legalCompanyCode || undefined,
        companyNameEn: companyNameEn || undefined,
        companyNameAr: companyNameAr || undefined,
        email: email || undefined,
      });
      continue;
    }
    if (seen.has(employeeId)) continue;
    seen.add(employeeId);

    let legalCompanyId: string | null = null;
    let unknownCompany: string | null = null;

    if (legalCompanyCode) {
      legalCompanyId = resolveKnownCompanyCode(legalCompanyCode, companyCodeSet, companies);
      if (!legalCompanyId) unknownCompany = legalCompanyCode;
    }

    if (!legalCompanyId && (companyNameEn || companyNameAr)) {
      legalCompanyId =
        resolveCompanyFromName(companyNameEn, companies) ??
        resolveCompanyFromName(companyNameAr, companies);
      if (!legalCompanyId) {
        unknownCompany = companyNameEn || companyNameAr;
      }
    }

    if (!legalCompanyId) {
      legalCompanyId = employeeById.get(employeeId)?.legalCompanyId ?? null;
    }

    if (!legalCompanyId) {
      const reason = unknownCompany
        ? `Unknown company — EN: "${companyNameEn || ""}", AR: "${companyNameAr || ""}"`
        : "Missing Company_Code / Company_Name (could not resolve company)";
      recordError(rowNum, reason, {
        username: employeeId,
        displayNameEn: nameEn || undefined,
        displayNameAr: nameAr || undefined,
        companyCode: legalCompanyCode || undefined,
        companyNameEn: companyNameEn || undefined,
        companyNameAr: companyNameAr || undefined,
        email: email || undefined,
      });
      continue;
    }

    rows.push({
      employeeId,
      name: nameEn || nameAr || employeeId,
      nameAr: nameAr || undefined,
      legalCompanyId,
      companyName: companyNameEn || companyNameAr || undefined,
      companyNameAr: companyNameAr || undefined,
      email: email || undefined,
      title: titleEn || undefined,
      titleAr: titleAr || undefined,
      department: departmentEn || undefined,
      departmentAr: departmentAr || undefined,
      managerId: managerId || undefined,
      managerEmail: managerEmail || undefined,
      isManager: parseBool(isManagerRaw),
    });
  }

  return { rows, errors, errorDetails, skipped: errorDetails.length };
}
