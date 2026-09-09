import * as XLSX from "xlsx";
import type { Company, EmployeeRosterImportRow, UserRoleImportError } from "@shared/schema";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
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

export interface ParseEmployeeRosterResult {
  rows: EmployeeRosterImportRow[];
  errors: UserRoleImportError[];
}

export function parseEmployeeRosterExcel(
  buffer: Buffer,
  companies: Company[],
): ParseEmployeeRosterResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: "Workbook has no sheets" }] };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
    { defval: "", raw: false },
  );
  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "Sheet is empty" }] };
  }

  const companyCodeSet = new Set(companies.map((c) => c.id));
  const rows: EmployeeRosterImportRow[] = [];
  const errors: UserRoleImportError[] = [];
  const seen = new Set<string>();

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
    const name = pickColumn(mapped, ["display_name", "name", "employee_name"]);
    const legalCompanyCode = pickColumn(mapped, ["company_code", "legal_company_code"]);
    const email = pickColumn(mapped, ["email", "email_address", "work_email"]).toLowerCase();
    const title = pickColumn(mapped, ["title", "job_title", "position"]);
    const managerId = normalizeUsername(
      pickColumn(mapped, ["manager_username", "manager_id", "manager_user_name"]),
    );
    const isManagerRaw = pickColumn(mapped, ["is_manager", "manager"]);
    const companyName = pickColumn(mapped, ["company_name"]);

    if (!employeeId && !name && !legalCompanyCode) continue;

    if (!employeeId) {
      errors.push({ row: rowNum, message: "Missing USERNAME / employee ID" });
      continue;
    }
    if (!legalCompanyCode) {
      errors.push({ row: rowNum, message: "Missing Company_Code" });
      continue;
    }
    if (seen.has(employeeId)) continue;
    seen.add(employeeId);

    rows.push({
      employeeId,
      name: name || employeeId,
      legalCompanyId: resolveCompanyId(legalCompanyCode, companyCodeSet),
      companyName: companyName || undefined,
      email: email || undefined,
      title: title || undefined,
      managerId: managerId || undefined,
      isManager: parseBool(isManagerRaw),
    });
  }

  return { rows, errors };
}
