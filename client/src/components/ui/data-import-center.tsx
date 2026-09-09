import { useState } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  CatalogImportResult,
  UserRoleImportResult,
  EmployeeRosterImportResult,
  AccessUserImportResult,
  UserRoleImportError,
} from "@shared/schema";

type ImportKind = "catalog" | "user_roles" | "employees" | "access_users";

type ImportResult =
  | CatalogImportResult
  | (UserRoleImportResult & { type?: "user_roles" })
  | EmployeeRosterImportResult
  | AccessUserImportResult;

interface ImportSlotConfig {
  id: ImportKind;
  step: number;
  title: string;
  description: string;
  columns: string;
  endpoint: string;
  queryParams?: string;
  currentCount?: number;
  countLabel?: string;
}

interface DataImportCenterProps {
  counts: {
    privileges: number;
    employees: number;
    assignments: number;
    companies: number;
    accessUsers?: number;
  };
  labels: {
    sectionTitle: string;
    sectionSubtitle: string;
    selectFile: string;
    upload: string;
    uploading: string;
    summary: string;
    errors: string;
    recommendedOrder: string;
    mergeNote: string;
  };
  onSuccess?: () => void;
}

function ImportSummary({
  result,
  kind,
  labels,
}: {
  result: ImportResult;
  kind: ImportKind;
  labels: DataImportCenterProps["labels"];
}) {
  const errors: UserRoleImportError[] = "errors" in result ? result.errors : [];

  const rows: { label: string; value: number | string }[] = [];

  if (kind === "catalog" && result.type === "catalog") {
    rows.push(
      { label: "Rows processed", value: result.processed },
      { label: "New privileges", value: result.privilegesCreated },
      { label: "Already in catalog", value: result.privilegesSkipped },
      { label: "Mode", value: result.mode },
    );
  } else if (kind === "user_roles" && "assignmentsUpdated" in result) {
    rows.push(
      { label: "Rows processed", value: result.processed },
      { label: "New privileges", value: result.privilegesCreated },
      { label: "New companies", value: result.companiesCreated },
      { label: "New employees", value: result.employeesCreated },
      { label: "Assignments updated", value: result.assignmentsUpdated },
      { label: "Skipped", value: result.skipped },
    );
  } else if (kind === "employees" && result.type === "employees") {
    rows.push(
      { label: "Rows processed", value: result.processed },
      { label: "Created", value: result.created },
      { label: "Updated", value: result.updated },
      { label: "Managers linked", value: result.managersLinked },
      { label: "Skipped", value: result.skipped },
    );
  } else if (kind === "access_users" && result.type === "access_users") {
    rows.push(
      { label: "People processed", value: result.processed },
      { label: "New login users", value: result.personsCreated },
      { label: "Updated", value: result.personsUpdated },
      { label: "Access rows", value: result.rowsCreated },
      { label: "Skipped", value: result.skipped },
    );
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30 p-3 space-y-2 text-sm">
      <p className="font-medium flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="h-4 w-4" />
        {labels.summary}
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.label}>
            {r.label}: <strong>{r.value}</strong>
          </li>
        ))}
      </ul>
      {errors.length > 0 && (
        <div>
          <p className="font-medium text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {labels.errors}
          </p>
          <ul className="mt-1 max-h-32 overflow-y-auto text-destructive/90 text-xs">
            {errors.slice(0, 15).map((err, idx) => (
              <li key={idx}>
                {err.row > 0 ? `Row ${err.row}: ` : ""}
                {err.message}
              </li>
            ))}
            {errors.length > 15 && <li>…and {errors.length - 15} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImportSlot({
  config,
  labels,
  onSuccess,
}: {
  config: ImportSlotConfig;
  labels: DataImportCenterProps["labels"];
  onSuccess?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceCatalog, setReplaceCatalog] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      let url = config.endpoint;
      const params = new URLSearchParams();
      if (config.id === "catalog" && replaceCatalog) {
        params.set("mode", "replace");
      } else if (config.queryParams) {
        const extra = new URLSearchParams(config.queryParams);
        extra.forEach((v, k) => params.set(k, v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      setResult(data);
      setFile(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-4 space-y-3"
      data-testid={`import-slot-${config.id}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
          {config.step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{config.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{config.description}</p>
          <p className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-400 break-words">
            {config.columns}
          </p>
          {config.currentCount != null && config.countLabel && (
            <p className="mt-1 text-xs text-teal-700 dark:text-teal-300">
              Current: {config.currentCount.toLocaleString()} {config.countLabel}
            </p>
          )}
        </div>
      </div>

      {config.id === "catalog" && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={replaceCatalog}
            onChange={(e) => setReplaceCatalog(e.target.checked)}
            className="rounded"
          />
          Replace entire catalog (clears existing privileges — re-import user roles after)
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="max-w-sm text-sm"
          data-testid={`input-import-${config.id}`}
        />
        <Button
          size="sm"
          onClick={handleUpload}
          disabled={!file || pending}
          data-testid={`button-import-${config.id}`}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              {labels.uploading}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" />
              {labels.upload}
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {result && <ImportSummary result={result} kind={config.id} labels={labels} />}
    </div>
  );
}

export function DataImportCenter({ counts, labels, onSuccess }: DataImportCenterProps) {
  const slots: ImportSlotConfig[] = [
    {
      id: "catalog",
      step: 1,
      title: "Privilege catalog",
      description: "Master list of modules, functions, and roles (Business-Role.xlsx).",
      columns: "Models · Functions · Privileges",
      endpoint: "/api/imports/catalog",
      currentCount: counts.privileges,
      countLabel: "privileges",
    },
    {
      id: "user_roles",
      step: 2,
      title: "User role assignments",
      description: "Who has which roles in which company (ERP export). Creates employees, companies, and assignments.",
      columns:
        "USERNAME · DISPLAY_NAME · Company_Code · DATA_ACCESS_COMPANY_CODE · Module_Name · Business Role Name · ROLE_NAME",
      endpoint: "/api/imports/user-roles",
      currentCount: counts.assignments,
      countLabel: "assignments",
    },
    {
      id: "employees",
      step: 3,
      title: "Employee roster (optional enrich)",
      description: "Add emails, titles, and manager hierarchy. Updates employees created by step 2.",
      columns:
        "USERNAME · DISPLAY_NAME · Company_Code · EMAIL · TITLE · MANAGER_USERNAME · IS_MANAGER",
      endpoint: "/api/imports/employees",
      currentCount: counts.employees,
      countLabel: "employees",
    },
    {
      id: "access_users",
      step: 4,
      title: "Login users (allow-list)",
      description: "Who can sign in as GM, admin, or scoped viewer. Local accounts default password: password.",
      columns:
        "EMAIL · NAME · USER_ID · LOGIN_USERNAME · COMPANY_CODE · CONTACT_ROLE · IS_ADMIN · AUTH_TYPE · MANAGED_MODULES",
      endpoint: "/api/imports/access-users",
      currentCount: counts.accessUsers,
      countLabel: "access records",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {labels.sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{labels.sectionSubtitle}</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
          {labels.recommendedOrder}
        </p>
      </div>

      <div className={cn("grid gap-4", "lg:grid-cols-2")}>
        {slots.map((slot) => (
          <ImportSlot key={slot.id} config={slot} labels={labels} onSuccess={onSuccess} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{labels.mergeNote}</p>
    </section>
  );
}
