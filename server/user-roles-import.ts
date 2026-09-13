import * as XLSX from "xlsx";
import type {
  Company,
  Privilege,
  UserRoleImportError,
  UserRoleImportRow,
  UserRoleImportSkippedRow,
} from "@shared/schema";
import {
  isPlaceholderBusinessRoleName,
  resolveErpRoleToCatalogFunction,
  resolveFunctionNameCandidates,
} from "./erp-role-mapping";

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
  skipped: number;
  skippedDetails: UserRoleImportSkippedRow[];
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

function resolveCompanyFromData(dataVal: string, companies: Company[]): string | null {
  const val = dataVal.trim();
  if (!val) return null;

  const nameToId = new Map<string, string>();
  for (const c of companies) {
    nameToId.set(c.name.toLowerCase().trim(), c.id);
    nameToId.set(c.id.toLowerCase(), c.id);
  }

  const lower = val.toLowerCase();
  if (nameToId.has(lower)) return nameToId.get(lower)!;

  const stripped = val.replace(/^\d+\s+/, "").trim().toLowerCase();
  if (nameToId.has(stripped)) return nameToId.get(stripped)!;

  for (const [name, id] of Array.from(nameToId.entries())) {
    if (stripped && (stripped.includes(name) || name.includes(stripped))) {
      return id;
    }
  }
  return null;
}

function splitBusinessRoleSegments(raw: string): string[] {
  return raw
    .split(/\\|\//)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Match one segment to a catalog Function (case-insensitive). */
function findCatalogFunctionMatch(
  functionName: string,
  moduleRaw: string,
  privileges: Privilege[],
): { module: string; function: string } | null {
  const fn = functionName.trim().toLowerCase();
  if (!fn) return null;

  const moduleFilter = moduleRaw ? mapModule(moduleRaw) : null;

  const matchWithModule = (requireModule: boolean): Privilege | undefined => {
    const hits = privileges.filter((p) => {
      if (p.function.trim().toLowerCase() !== fn) return false;
      if (
        requireModule &&
        moduleFilter &&
        p.module.trim().toLowerCase() !== moduleFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    return hits[0];
  };

  const hit =
    (moduleFilter ? matchWithModule(true) : undefined) ?? matchWithModule(false);
  if (!hit) return null;
  return { module: hit.module, function: hit.function };
}

/** Supports compound names like "Accounting and Reporting \\ Treasury Management". */
function findAllCatalogFunctionMatches(
  functionName: string,
  moduleRaw: string,
  privileges: Privilege[],
): { module: string; function: string }[] {
  const segments = splitBusinessRoleSegments(functionName);
  const seen = new Set<string>();
  const results: { module: string; function: string }[] = [];

  for (const segment of segments) {
    const match = findCatalogFunctionMatch(segment, moduleRaw, privileges);
    if (!match) continue;
    const key = `${match.module}:${match.function}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(match);
  }

  return results;
}

function findCatalogFunctionBySubstring(
  roleText: string,
  moduleRaw: string,
  privileges: Privilege[],
): { module: string; function: string } | null {
  const lower = roleText.trim().toLowerCase();
  if (!lower) return null;

  const uniqueFunctions = Array.from(new Set(privileges.map((p) => p.function))).sort(
    (a, b) => b.length - a.length,
  );

  for (const fn of uniqueFunctions) {
    if (lower.includes(fn.toLowerCase())) {
      return findCatalogFunctionMatch(fn, moduleRaw, privileges);
    }
  }
  return null;
}

function resolveCatalogMatchesForRow(
  row: Record<string, unknown>,
  moduleRaw: string,
  privileges: Privilege[],
): { module: string; function: string }[] {
  const candidates = resolveFunctionNameCandidates(row, pickColumn);
  const seen = new Set<string>();
  const results: { module: string; function: string }[] = [];

  const addMatches = (matches: { module: string; function: string }[]) => {
    for (const match of matches) {
      const key = `${match.module}:${match.function}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(match);
    }
  };

  for (const candidate of candidates) {
    addMatches(findAllCatalogFunctionMatches(candidate, moduleRaw, privileges));
    if (results.length > 0) return results;

    const mapped = resolveErpRoleToCatalogFunction(candidate);
    if (mapped) {
      addMatches(findAllCatalogFunctionMatches(mapped, moduleRaw, privileges));
      if (results.length > 0) return results;
    }

    const substringHit = findCatalogFunctionBySubstring(candidate, moduleRaw, privileges);
    if (substringHit) {
      addMatches([substringHit]);
      return results;
    }
  }

  return results;
}

export function parseUserRolesExcel(
  buffer: Buffer,
  companies: Company[],
  privileges: Privilege[] = [],
): ParseUserRolesResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Workbook has no sheets" }],
      skipped: 0,
      skippedDetails: [],
    };
  }

  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Sheet is empty" }],
      skipped: 0,
      skippedDetails: [],
    };
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
  const skippedDetails: UserRoleImportSkippedRow[] = [];
  let skipped = 0;

  if (privileges.length === 0) {
    errors.push({
      row: 0,
      message:
        "Privilege catalog is empty — import Step 1 (Business-Role.xlsx) before user roles",
    });
  }

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2; // header is row 1

    const employeeId = normalizeUsername(
      pickColumn(row, ["username", "user_name"]),
    );
    const legalCompanyCode = pickColumn(row, ["company_code"]);
    const accessCompanyCode = pickColumn(row, [
      "data_access_company_code",
      "data_company_code",
    ]);
    const accessTo = pickColumn(row, ["access_to"]);
    const dataVal = pickColumn(row, ["data"]);
    const moduleRaw = pickColumn(row, ["module_name", "module"]);
    const businessRoleName = pickColumn(row, ["business_role_name", "business_role"]);
    const roleName = pickColumn(row, ["role_name"]);
    const roleCommonName = pickColumn(row, ["role_common_name"]);
    const displayName = pickColumn(row, ["display_name"]);
    const companyName = pickColumn(row, ["company_name"]);
    const hasRoleHint =
      (!isPlaceholderBusinessRoleName(businessRoleName) && !!businessRoleName) ||
      !!roleName ||
      !!roleCommonName;

    if (!employeeId && !moduleRaw && !hasRoleHint) {
      continue; // blank row
    }

    if (!employeeId) {
      errors.push({ row: rowNum, message: "Missing USERNAME" });
      continue;
    }

    if (!legalCompanyCode) {
      errors.push({ row: rowNum, message: "Missing Company_Code" });
      continue;
    }

    if (!hasRoleHint) {
      errors.push({
        row: rowNum,
        message: "Missing role (Business Role Name, ROLE_NAME, or ROLE_COMMON_NAME)",
      });
      continue;
    }

    const catalogMatches = resolveCatalogMatchesForRow(row, moduleRaw, privileges);
    if (catalogMatches.length === 0) {
      skipped++;
      skippedDetails.push({
        row: rowNum,
        reason: "No matching catalog Function",
        username: employeeId,
        displayName: displayName || undefined,
        companyCode: legalCompanyCode,
        companyName: companyName || undefined,
        businessRoleName: isPlaceholderBusinessRoleName(businessRoleName)
          ? undefined
          : businessRoleName,
        roleName: roleName || undefined,
        roleCommonName: roleCommonName || undefined,
      });
      continue;
    }

    const resolvedLegalCompanyId = resolveCompanyId(legalCompanyCode, companyCodeSet);

    let resolvedAccessCompanyId: string;
    if (accessCompanyCode) {
      resolvedAccessCompanyId = resolveCompanyId(accessCompanyCode, companyCodeSet);
    } else if (!accessTo.trim() || !dataVal.trim()) {
      resolvedAccessCompanyId = resolvedLegalCompanyId;
    } else {
      resolvedAccessCompanyId =
        resolveCompanyFromData(dataVal, companies) ?? resolvedLegalCompanyId;
    }

    for (const catalogMatch of catalogMatches) {
      rows.push({
        employeeId,
        companyId: resolvedAccessCompanyId,
        legalCompanyId: resolvedLegalCompanyId,
        companyName: companyName || undefined,
        module: catalogMatch.module,
        function: catalogMatch.function,
        role: roleName || catalogMatch.function,
        roleName: roleName || undefined,
        displayName: displayName || undefined,
        sourceRow: rowNum,
      });
    }
  }

  return { rows, errors, skipped, skippedDetails };
}
