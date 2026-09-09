import * as XLSX from "xlsx";

export interface CatalogImportRow {
  module: string;
  function: string;
  role: string;
}

const HEADER_VALUES = new Set(
  ["models", "functions", "privileges", "model", "function", "privilege"].map(
    (s) => s.toLowerCase(),
  ),
);

function cellStr(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHeader(value: unknown): string {
  return cellStr(value).toLowerCase().replace(/\s+/g, "_");
}

function isCatalogSheet(headers: string[]): boolean {
  const h = new Set(headers.map(normalizeHeader));
  return (
    (h.has("models") || h.has("model")) &&
    (h.has("functions") || h.has("function")) &&
    (h.has("privileges") || h.has("privilege"))
  );
}

function isUserRolesSheet(headers: string[]): boolean {
  const h = new Set(headers.map(normalizeHeader));
  return h.has("username") && (h.has("company_code") || h.has("data_access_company_code"));
}

export function detectExcelImportType(buffer: Buffer): "catalog" | "user_roles" | "unknown" {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return "unknown";
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: "",
  });
  if (rows.length === 0) return "unknown";
  const headers = Object.keys(rows[0]);
  if (isCatalogSheet(headers)) return "catalog";
  if (isUserRolesSheet(headers)) return "user_roles";
  return "unknown";
}

export function parsePrivilegeCatalogExcel(buffer: Buffer): CatalogImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
    { defval: "", raw: false },
  );

  let currentModule = "";
  let currentFunction = "";
  const catalog: CatalogImportRow[] = [];

  for (const row of rawRows) {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[normalizeHeader(key)] = cellStr(value);
    }

    const moduleVal =
      mapped.models || mapped.model || mapped.module_name || mapped.module || "";
    const functionVal =
      mapped.functions || mapped.function || mapped.business_role_name || "";
    const roleVal = mapped.privileges || mapped.privilege || mapped.role_name || "";

    if (moduleVal) currentModule = moduleVal;
    if (functionVal) currentFunction = functionVal;

    if (!currentModule || !currentFunction || !roleVal) continue;
    if (
      HEADER_VALUES.has(currentModule.toLowerCase()) ||
      HEADER_VALUES.has(currentFunction.toLowerCase()) ||
      HEADER_VALUES.has(roleVal.toLowerCase())
    ) {
      continue;
    }

    catalog.push({
      module: currentModule,
      function: currentFunction,
      role: roleVal,
    });
  }

  return catalog;
}
