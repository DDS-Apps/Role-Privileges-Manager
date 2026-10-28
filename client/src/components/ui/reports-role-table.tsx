import type { Privilege } from "@shared/schema";
import type { AppLanguage } from "@shared/employee-display";
import { privilegeRoleLabel } from "@shared/privilege-display";
import { parseReportRole } from "@/lib/parse-report-role";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const COL_HEADERS: Record<
  AppLanguage,
  { subArea: string; report: string; description: string; owner: string; outputs: string }
> = {
  en: {
    subArea: "Sub area",
    report: "Report name",
    description: "Description",
    owner: "Owner",
    outputs: "Output fields",
  },
  ar: {
    subArea: "المنطقة الفرعية",
    report: "اسم التقرير",
    description: "الوصف",
    owner: "المسؤول",
    outputs: "حقول المخرجات",
  },
};

interface ReportsRoleTableProps {
  roles: Privilege[];
  language: AppLanguage;
  roleSelections: Record<string, boolean>;
  onToggle: (id: string, checked: boolean) => void;
  assignedPrivilegeIds?: Set<string>;
  assignedLabel?: string;
  className?: string;
}

function displayField(
  privilege: Privilege,
  language: AppLanguage,
  field: keyof ReturnType<typeof parseReportRole>,
): string {
  const en = parseReportRole(privilege.role);
  if (language === "en") return en[field];
  const arSource = privilege.roleAr?.trim()
    ? parseReportRole(privilege.roleAr)
    : parseReportRole(privilegeRoleLabel(privilege, "ar"));
  const arVal = arSource[field];
  return arVal || en[field];
}

export function ReportsRoleTable({
  roles,
  language,
  roleSelections,
  onToggle,
  assignedPrivilegeIds,
  assignedLabel,
  className,
}: ReportsRoleTableProps) {
  const h = COL_HEADERS[language];

  return (
    <div
      className={cn(
        "max-h-[min(52vh,28rem)] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      <Table className="min-w-[880px] text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-800/80">
            <TableHead className="sticky top-0 z-10 w-10 bg-slate-50 dark:bg-slate-800/80" />
            <TableHead className="sticky top-0 z-10 w-[11%] bg-slate-50 text-xs font-semibold uppercase tracking-wide dark:bg-slate-800/80">
              {h.subArea}
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[18%] bg-slate-50 text-xs font-semibold uppercase tracking-wide dark:bg-slate-800/80">
              {h.report}
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[26%] bg-slate-50 text-xs font-semibold uppercase tracking-wide dark:bg-slate-800/80">
              {h.description}
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[14%] bg-slate-50 text-xs font-semibold uppercase tracking-wide dark:bg-slate-800/80">
              {h.owner}
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide dark:bg-slate-800/80">
              {h.outputs}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {
            const isAssigned = assignedPrivilegeIds?.has(role.id);
            return (
              <TableRow
                key={role.id}
                className={cn(
                  "align-top",
                  isAssigned && "bg-teal-50/50 dark:bg-teal-950/20",
                )}
              >
                <TableCell className="py-2.5">
                  <Checkbox
                    checked={roleSelections[role.id] || false}
                    onCheckedChange={(checked) =>
                      onToggle(role.id, checked === true)
                    }
                    data-testid={`modal-checkbox-role-${role.id}`}
                    aria-label={displayField(role, language, "reportName")}
                  />
                </TableCell>
                <TableCell className="py-2.5 text-slate-600 dark:text-slate-300" dir="auto">
                  {displayField(role, language, "subArea") || "—"}
                </TableCell>
                <TableCell className="py-2.5 font-medium text-slate-800 dark:text-slate-100" dir="auto">
                  {displayField(role, language, "reportName")}
                  {isAssigned && assignedLabel && (
                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
                      {assignedLabel}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-slate-600 dark:text-slate-300" dir="auto">
                  {displayField(role, language, "description") || "—"}
                </TableCell>
                <TableCell className="py-2.5 text-slate-600 dark:text-slate-300" dir="auto">
                  {displayField(role, language, "owner") || "—"}
                </TableCell>
                <TableCell className="py-2.5 text-xs leading-snug text-slate-500 dark:text-slate-400" dir="auto">
                  {displayField(role, language, "outputs") || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
