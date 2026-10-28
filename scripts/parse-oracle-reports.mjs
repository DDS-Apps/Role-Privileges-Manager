import fs from "fs";

const csvPath =
  "C:/Users/{DS}WaleedAlahdal/Downloads/Available Oracle Reports.csv";
const text = fs.readFileSync(csvPath, "utf8");

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

const rows = parseCSV(text);
const data = rows.slice(1).filter((r) => r[0]?.trim());

const mapTitle = { Finance: "Finance", SCM: "SCM", HCM: "HR" };

function formatRole(r) {
  const sub = (r[1] || "").trim();
  const name = (r[2] || "").trim();
  const desc = (r[3] || "").trim();
  const owner = (r[4] || "").trim();
  const output = (r[5] || "").trim();
  const parts = [];
  if (sub) parts.push(`[${sub}]`);
  parts.push(name);
  let line = parts.join(" ");
  if (desc) line += ` — ${desc}`;
  if (owner) line += ` (Owner: ${owner})`;
  if (output) line += ` | Outputs: ${output.replace(/\s+/g, " ").slice(0, 200)}${output.length > 200 ? "…" : ""}`;
  return line;
}

const byModule = {};
for (const r of data) {
  const title = r[0].trim();
  const module = mapTitle[title] || title;
  if (!byModule[module]) {
    byModule[module] = { subAreas: new Map(), reports: [] };
  }
  const sub = (r[1] || "").trim() || "General";
  byModule[module].subAreas.set(sub, (byModule[module].subAreas.get(sub) || 0) + 1);
  byModule[module].reports.push({
    subArea: sub,
    reportName: (r[2] || "").trim(),
    description: (r[3] || "").trim(),
    owner: (r[4] || "").trim(),
    output: (r[5] || "").trim(),
    roleLabel: formatRole(r),
  });
}

const out = {
  totalReports: data.length,
  modules: Object.entries(byModule).map(([module, v]) => ({
    module,
    functionName: "Reports",
    reportCount: v.reports.length,
    subAreaCount: v.subAreas.size,
    subAreas: [...v.subAreas.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count })),
    reports: v.reports,
  })),
};

fs.writeFileSync(
  "c:/Cursor/Role-Privileges-Manager/scripts/oracle-reports-preview.json",
  JSON.stringify(out, null, 2),
);
console.log(
  "Wrote preview JSON:",
  out.modules.map((m) => `${m.module}:${m.reportCount}`).join(", "),
  "total",
  out.totalReports,
);
