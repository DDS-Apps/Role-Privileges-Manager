/**
 * Idempotent HR catalog updates (OD move + Employee Relation roles).
 * Usage: node scripts/patch-hr-catalog-od-er.mjs [path/to/data.json]
 */
import fs from "fs";
import path from "path";

const dataPath = path.resolve(
  process.argv[2] || path.join(process.cwd(), "data.json"),
);

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
let changed = 0;

const workforceRole =
  "7. View and manage workforce structures such as jobs, positions, and departments.";
const workforceRoleOld =
  "5. View and manage workforce structures such as jobs, positions, and departments.";

for (const p of data.privileges) {
  if (p.id === "P_HR_5__VIEW_AND_MANAGE_W_01") {
    if (p.function !== "Organizational Development (OD)") {
      p.function = "Organizational Development (OD)";
      changed++;
    }
    if (p.role !== workforceRole) {
      p.role = workforceRole;
      changed++;
    }
    if (p.roleAr !== "7. عرض الهياكل التنظيمية والوظائف والمناصب والأقسام وإدارتها.") {
      p.roleAr = "7. عرض الهياكل التنظيمية والوظائف والمناصب والأقسام وإدارتها.";
      changed++;
    }
  }
  if (p.id === "P_HR_7__MANAGE_EMPLOYEE_B_01") {
    const next =
      "7. Manage employee benefits e.g., annual ticket, etc.";
    if (p.role !== next) {
      p.role = next;
      changed++;
    }
  }
}

const newPrivileges = [
  {
    id: "P_HR_8__MEDICAL_INSURANCE_01",
    module: "HR",
    function: "Employee Relation",
    role: "8. Medical Insurance.",
    roleAr: "8. التأمين الطبي.",
  },
  {
    id: "P_HR_9__GOVERNMENT_RELATIONS_01",
    module: "HR",
    function: "Employee Relation",
    role: "9. Government Relations.",
    roleAr: "9. العلاقات الحكومية.",
  },
];

for (const np of newPrivileges) {
  if (!data.privileges.some((p) => p.id === np.id)) {
    data.privileges.push(np);
    changed++;
  }
}

if (changed === 0) {
  console.log("HR catalog patch: already up to date.", dataPath);
} else {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
  console.log("HR catalog patch: applied", changed, "change(s) to", dataPath);
}
