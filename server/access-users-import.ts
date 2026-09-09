import * as XLSX from "xlsx";
import type { AuthType, UserRoleImportError } from "@shared/schema";

export interface AccessUserImportRow {
  email: string;
  name: string;
  userId: string;
  username?: string;
  companyCode: string | null;
  companyName?: string;
  contactRole: string | null;
  isAdmin: boolean;
  authType: AuthType;
  managedModules: string[];
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
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

function parseModules(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ParseAccessUsersResult {
  rows: AccessUserImportRow[];
  errors: UserRoleImportError[];
}

export function parseAccessUsersExcel(buffer: Buffer): ParseAccessUsersResult {
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

  const rows: AccessUserImportRow[] = [];
  const errors: UserRoleImportError[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2;
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      mapped[normalizeHeader(key)] = value;
    }

    const email = pickColumn(mapped, ["email", "email_address"]).toLowerCase();
    const name = pickColumn(mapped, ["name", "display_name"]);
    const userId = pickColumn(mapped, ["user_id", "username", "user_name", "sap_id"]);
    const username = pickColumn(mapped, ["login_username", "local_username", "login"]);
    const companyCode = pickColumn(mapped, ["company_code", "companycode"]) || null;
    const companyName = pickColumn(mapped, ["company_name"]);
    const contactRole = pickColumn(mapped, ["contact_role", "role", "gm_role"]) || null;
    const isAdmin = parseBool(pickColumn(mapped, ["is_admin", "admin"]));
    const authRaw = pickColumn(mapped, ["auth_type", "authentication"]).toLowerCase();
    const authType: AuthType = authRaw === "local" ? "local" : "sso";
    const managedModules = parseModules(
      pickColumn(mapped, ["managed_modules", "modules", "module_scope"]),
    );

    if (!email && !name) continue;

    if (!email) {
      errors.push({ row: rowNum, message: "Missing EMAIL" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: "Missing NAME" });
      continue;
    }

    rows.push({
      email,
      name,
      userId,
      username: username || undefined,
      companyCode: companyCode
        ? (() => {
            const padded = companyCode.padStart(3, "0");
            return padded;
          })()
        : null,
      companyName: companyName || undefined,
      contactRole,
      isAdmin,
      authType,
      managedModules,
    });
  }

  return { rows, errors };
}

/** Group flat rows by email for upsertPerson. */
export function groupAccessUserRows(rows: AccessUserImportRow[]): Map<string, AccessUserImportRow[]> {
  const byEmail = new Map<string, AccessUserImportRow[]>();
  for (const row of rows) {
    const list = byEmail.get(row.email) ?? [];
    list.push(row);
    byEmail.set(row.email, list);
  }
  return byEmail;
}
