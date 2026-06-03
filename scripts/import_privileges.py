"""
Import employee privilege assignments from DBANDDDS.xlsx into data.json.

Mapping:
  USERNAME          → employeeId
  Module_Name       → privilege.module  (HCM→HR, FIN→Finance, SCM→SCM, ERP→ERP)
  Business Role Name→ privilege.function (auto-created in catalog if missing)
  DATA              → companyId (company name lookup)
  ACCESS_TO empty   → use employee's legalCompanyId
"""

import pandas as pd
import json
import re
import io
import sys
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

EXCEL_PATH = r"C:\Users\{DS}WaleedAlahdal\OneDrive - Dallah AlBarakah\DBANDDDS.xlsx"
DATA_PATH  = r"C:\Cursor\Role-Privileges-Manager\data.json"

MODULE_MAP = {"HCM": "HR", "FIN": "Finance", "SCM": "SCM", "ERP": "ERP"}

# ── Load ─────────────────────────────────────────────────────────────────────
df = pd.read_excel(EXCEL_PATH, sheet_name="Sheet2").fillna("")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# ── Lookup maps ───────────────────────────────────────────────────────────────
employee_lookup = {e["id"]: e for e in data["employees"]}
employee_ids    = set(employee_lookup)

# company name (lowercase) → company id
company_name_to_id: dict[str, str] = {}
for c in data["companies"]:
    company_name_to_id[c["name"].lower().strip()] = c["id"]

def resolve_company(data_val: str, emp_id: str) -> str:
    """Map DATA column value to a companyId; fall back to employee's legalCompanyId."""
    val = data_val.strip()
    if val:
        # Exact match
        if val.lower() in company_name_to_id:
            return company_name_to_id[val.lower()]
        # Strip leading numeric code prefix e.g. "001 " or "1 "
        stripped = re.sub(r"^\d+\s+", "", val).strip()
        if stripped.lower() in company_name_to_id:
            return company_name_to_id[stripped.lower()]
        # Partial match
        lower = stripped.lower()
        for name, cid in company_name_to_id.items():
            if lower and (lower in name or name in lower):
                return cid
    # Fall back
    emp = employee_lookup.get(emp_id)
    return emp["legalCompanyId"] if emp else ""

# catalog map: (module, function) → [privilege_id, ...]
catalog_map: dict[tuple, list] = defaultdict(list)
for p in data["privileges"]:
    catalog_map[(p["module"], p["function"])].append(p["id"])

# ── Step 4: Auto-create missing privileges ────────────────────────────────────
unique_pairs: set[tuple] = set()
for _, row in df.iterrows():
    mod  = str(row["Module_Name"]).strip()
    role = str(row["Business Role Name"]).strip()
    if mod in MODULE_MAP and role:
        unique_pairs.add((MODULE_MAP[mod], role))

new_privs: list[dict] = []
id_counter: dict[str, int] = {}

for app_module, role_name in sorted(unique_pairs):
    if catalog_map[(app_module, role_name)]:
        continue  # already in catalog
    # Generate a unique ID
    mod_key  = re.sub(r"[^A-Z]", "", app_module.upper())[:3]
    san_role = re.sub(r"[^A-Z0-9]", "_", role_name.upper())[:20].strip("_")
    base_key = f"{mod_key}_{san_role}"
    n        = id_counter.get(base_key, 0) + 1
    id_counter[base_key] = n
    priv_id  = f"P_{base_key}_{n:02d}"
    priv     = {"id": priv_id, "module": app_module, "function": role_name, "role": role_name}
    data["privileges"].append(priv)
    catalog_map[(app_module, role_name)].append(priv_id)
    new_privs.append(priv)

print(f"New privileges auto-created: {len(new_privs)}")
for p in new_privs[:15]:
    print(f"  {p['id']:45s} {p['module']:10s} {p['function']}")
if len(new_privs) > 15:
    print(f"  … and {len(new_privs) - 15} more")

# ── Step 5–6: Process rows ────────────────────────────────────────────────────
new_assignments: dict[tuple, set] = defaultdict(set)
skipped_missing_emp: set = set()
fallback_count  = 0
total_rows      = 0

for _, row in df.iterrows():
    mod_name  = str(row["Module_Name"]).strip()
    role_name = str(row["Business Role Name"]).strip()

    if mod_name not in MODULE_MAP or not role_name:
        continue

    # Employee ID
    raw = str(row["USERNAME"]).strip().rstrip(".0")
    try:
        emp_id = str(int(float(raw) if "." in raw else raw))
    except ValueError:
        continue

    if emp_id not in employee_ids:
        skipped_missing_emp.add(emp_id)
        continue

    app_module = MODULE_MAP[mod_name]
    priv_ids   = catalog_map[(app_module, role_name)]
    if not priv_ids:
        continue  # safety — should never happen after step 4

    access_to = str(row["ACCESS_TO"]).strip()
    data_val  = str(row["DATA"]).strip()

    # Company resolution
    if not access_to or not data_val:
        company_id = employee_lookup[emp_id]["legalCompanyId"]
        fallback_count += 1
    else:
        company_id = resolve_company(data_val, emp_id)
        if not company_id:
            company_id = employee_lookup[emp_id]["legalCompanyId"]
            fallback_count += 1

    for pid in priv_ids:
        new_assignments[(emp_id, company_id)].add(pid)

    total_rows += 1

# ── Step 7: Overwrite assignments for Excel employees ────────────────────────
excel_emp_ids = {
    emp_id
    for (emp_id, _) in new_assignments
}

# Keep assignments for employees NOT in this Excel
data["assignments"] = [
    a for a in data["assignments"]
    if a["employeeId"] not in excel_emp_ids
]

# Insert fresh assignments
for (emp_id, company_id), priv_ids in sorted(new_assignments.items()):
    data["assignments"].append({
        "companyId":   company_id,
        "employeeId":  emp_id,
        "privilegeIds": sorted(priv_ids),
    })

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\nRows processed      : {total_rows}")
print(f"Fallback to legalCo : {fallback_count}")
print(f"Unique assignments  : {len(new_assignments)}")
print(f"Employees updated   : {len(excel_emp_ids)}")
if skipped_missing_emp:
    print(f"Employees not found : {len(skipped_missing_emp)} → {sorted(skipped_missing_emp)}")
print(f"\ndata.json saved ✓  (total assignments: {len(data['assignments'])})")
