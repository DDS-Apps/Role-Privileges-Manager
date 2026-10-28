import fs from "fs";

const csvPath =
  "C:/Users/{DS}WaleedAlahdal/Downloads/Available Oracle Reports.csv";
const dataPath = "c:/Cursor/Role-Privileges-Manager/data.json";
const reportsRoleArPath =
  "c:/Cursor/Role-Privileges-Manager/shared/catalog-reports-role-ar.ts";

const SUB_AREA_AR = {
  "Accounts Payables": "حسابات الدائنين",
  "Accounts Receivables": "حسابات المدينين",
  "Accounts Payable & Accounts Receivables":
    "حسابات الدائنين والمدينين",
  "Cash Management": "إدارة النقد",
  "Fixed Assets": "الأصول الثابتة",
  "General Ledger": "دفتر الأستاذ العام",
  "General Ledger & Payabls": "دفتر الأستاذ والدائنين",
  "General Ledger and payroll": "دفتر الأستاذ والرواتب",
  Purchasing: "المشتريات",
  Sales: "المبيعات",
  Inventory: "المخزون",
  "HR Core": "نواة الموارد البشرية",
  Payroll: "الرواتب",
  "   Payroll": "الرواتب",
  "HR Limited Report": "تقارير HR المحدودة",
};

function parseCSV(s) {
  const rows = [];
  let row = [];
  let f = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (q) {
      if (c === '"' && n === '"') {
        f += '"';
        i++;
      } else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(f);
      f = "";
    } else if (c === "\n" || (c === "\r" && n === "\n")) {
      if (c === "\r") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}

function subAreaLabel(sub) {
  const t = sub.trim();
  return SUB_AREA_AR[t] ?? SUB_AREA_AR[sub] ?? t;
}

function formatRoleEn(row) {
  const sub = (row[1] || "").trim();
  const name = (row[2] || "").trim();
  const desc = (row[3] || "").trim();
  const owner = (row[4] || "").trim();
  const output = (row[5] || "").trim().replace(/\s+/g, " ");
  const parts = [];
  if (sub) parts.push(`[${sub}]`);
  parts.push(name);
  let line = parts.join(" ");
  if (desc) line += ` — ${desc}`;
  if (owner) line += ` (Owner: ${owner})`;
  if (output) line += ` | Outputs: ${output}`;
  return line;
}

function formatRoleAr(row) {
  const sub = (row[1] || "").trim();
  const name = (row[2] || "").trim();
  const desc = (row[3] || "").trim();
  const owner = (row[4] || "").trim();
  const output = (row[5] || "").trim().replace(/\s+/g, " ");
  const parts = [];
  if (sub) parts.push(`[${subAreaLabel(sub)}]`);
  parts.push(name);
  let line = parts.join(" ");
  if (desc) line += ` — ${desc}`;
  if (owner) line += ` (المسؤول: ${owner})`;
  if (output) line += ` | المخرجات: ${output}`;
  return line;
}

function makeId(module, seq, reportName) {
  const mod = module === "Finance" ? "FIN" : module === "HR" ? "HR" : "SCM";
  const sn =
    reportName
      .replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 24)
      .toUpperCase() || "REPORT";
  return `P_${mod}_RPT_${String(seq).padStart(3, "0")}_${sn}`;
}

function escapeTsString(s) {
  return JSON.stringify(s);
}

const mapTitle = { Finance: "Finance", SCM: "SCM", HCM: "HR" };
const text = fs.readFileSync(csvPath, "utf8");
const rows = parseCSV(text).slice(1).filter((r) => r[0]?.trim());

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const existingIds = new Set(data.privileges.map((p) => p.id));
const already = data.privileges.some((p) => p.function === "Reports");
if (already) {
  console.error(
    "Reports privileges already exist in data.json — skip or remove first.",
  );
  process.exit(1);
}

const seqByMod = { Finance: 0, HR: 0, SCM: 0 };
const newPrivileges = [];
const reportsRoleAr = {};

for (const row of rows) {
  const module = mapTitle[row[0].trim()] || row[0].trim();
  seqByMod[module] = (seqByMod[module] || 0) + 1;
  const seq = seqByMod[module];
  const reportName = (row[2] || "").trim() || "Report";
  let id = makeId(module, seq, reportName);
  let n = 1;
  while (existingIds.has(id)) {
    id = `${makeId(module, seq, reportName)}_${n++}`;
  }
  existingIds.add(id);

  const role = formatRoleEn(row);
  const roleAr = formatRoleAr(row);
  reportsRoleAr[role] = roleAr;

  newPrivileges.push({
    id,
    module,
    function: "Reports",
    role,
    roleAr,
    functionAr: "التقارير",
  });
}

data.privileges.push(...newPrivileges);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");

const lines = [
  "/** Auto-generated from Available Oracle Reports.csv — do not edit by hand */",
  "export const REPORTS_ROLE_AR: Record<string, string> = {",
];
for (const [en, ar] of Object.entries(reportsRoleAr)) {
  lines.push(`  ${escapeTsString(en)}: ${escapeTsString(ar)},`);
}
lines.push("};", "");
fs.writeFileSync(reportsRoleArPath, lines.join("\n"));

console.log(
  "Imported",
  newPrivileges.length,
  "Reports privileges:",
  Object.entries(seqByMod)
    .filter(([, c]) => c)
    .map(([m, c]) => `${m}:${c}`)
    .join(", "),
);
console.log("Wrote", reportsRoleArPath);
