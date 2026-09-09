import * as XLSX from "xlsx";
import type { Company, UserRoleImportError, UserRoleImportRow } from "@shared/schema";

const MODULE_MAP: Record<string, string> = {
  HCM: "HR",
  FIN: "Finance",
  SCM: "SCM",
  ERP: "ERP",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s.endsWith(".0") && /^\d+\.0$/.test(s)) {
    return s.slice(0, -2);
  }
  return s;
}

function normalizeUsername(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;
  try {
    const n = Number(val);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return String(Math.trunc(n));
    }
  } catch {
    // keep string
  }
  return val.replace(/\.0$/, "");
}

function mapModule(raw: string): string | null {
  const key = raw.trim().toUpperCase();
  if (!key) return null;
  return MODULE_MAP[key] ?? raw.trim();
}

function pickColumn(
  row: Record<string, unknown>,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const val = cellStr(row[alias]);
    if (val) return val;
  }
  return "";
}

export interface ParseUserRolesResult {
  rows: UserRoleImportRow[];
  errors: UserRoleImportError[];
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

export function parseUserRolesExcel(
  buffer: Buffer,
  companies: Company[],
): ParseUserRolesResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: "Workbook has no sheets" }] };
  }

  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "Sheet is empty" }] };
  }

  const companyCodeSet = new Set(companies.map((c) => c.id));

  const normalizedRows = rawRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[normalizeHeader(key)] = value;
    }
    return mapped;
  });

  const rows: UserRoleImportRow[] = [];
  const errors: UserRoleImportError[] = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2; // header is row 1

    const employeeId = normalizeUsername(
      pickColumn(row, ["username", "user_name"]),
    );
    const legalCompanyCode = pickColumn(row, ["company_code"]);
    const accessCompanyCode = pickColumn(row, ["data_access_company_code"]);
    const moduleRaw = pickColumn(row, ["module_name", "module"]);
    const functionName = pickColumn(row, [
      "business_role_name",
      "role_common_name",
      "business_role",
    ]);
    const roleName = pickColumn(row, ["role_name"]);
    const displayName = pickColumn(row, ["display_name"]);
    const companyName = pickColumn(row, ["company_name"]);

    if (!employeeId && !moduleRaw && !functionName) {
      continue; // blank row
    }

    if (!employeeId) {
      errors.push({ row: rowNum, message: "Missing USERNAME" });
      continue;
    }

    if (!legalCompanyCode && !accessCompanyCode) {
      errors.push({
        row: rowNum,
        message: "Missing Company_Code and DATA_ACCESS_COMPANY_CODE",
      });
      continue;
    }

    const module = mapModule(moduleRaw);
    if (!module) {
      errors.push({ row: rowNum, message: "Missing Module_Name" });
      continue;
    }

    if (!functionName) {
      errors.push({ row: rowNum, message: "Missing Business Role Name or ROLE_COMMON_NAME" });
      continue;
    }

    const resolvedLegalCompanyId = resolveCompanyId(
      legalCompanyCode || accessCompanyCode,
      companyCodeSet,
    );
    const resolvedAccessCompanyId = resolveCompanyId(
      accessCompanyCode || legalCompanyCode,
      companyCodeSet,
    );

    rows.push({
      employeeId,
      companyId: resolvedAccessCompanyId,
      legalCompanyId: resolvedLegalCompanyId,
      companyName: companyName || undefined,
      module,
      function: functionName,
      role: roleName || functionName,
      roleName: roleName || undefined,
      displayName: displayName || undefined,
    });
  }

  return { rows, errors };
}
