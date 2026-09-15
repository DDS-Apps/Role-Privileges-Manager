import * as XLSX from "xlsx";
import type { UserRoleImportError } from "@shared/schema";

export interface CompanyImportRow {
  id: string;
  name: string;
}

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

function normalizeCompanyCode(raw: string): string {
  const val = raw.trim();
  if (!val) return "";
  try {
    const n = Number(val);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return String(Math.trunc(n)).padStart(3, "0");
    }
  } catch {
    // keep string
  }
  if (/^\d+$/.test(val.replace(/\.0$/, ""))) {
    return val.replace(/\.0$/, "").padStart(3, "0");
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

export function parseCompaniesExcel(buffer: Buffer): {
  rows: CompanyImportRow[];
  errors: UserRoleImportError[];
} {
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

  const rows: CompanyImportRow[] = [];
  const errors: UserRoleImportError[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2;
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      mapped[normalizeHeader(key)] = value;
    }

    const codeRaw = pickColumn(mapped, ["company_code", "companycode"]);
    const name = pickColumn(mapped, ["company_name", "companyname", "name"]);

    if (!codeRaw && !name) continue;

    const id = normalizeCompanyCode(codeRaw);
    if (!id) {
      errors.push({ row: rowNum, message: "Missing Company Code" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: `Missing Company name for code ${id}` });
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);

    rows.push({ id, name });
  }

  return { rows, errors };
}
