import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, Company, Employee, Privilege } from "@shared/schema";
import type { AppLanguage } from "@shared/employee-display";
import { companyDisplayName, employeeDisplayName } from "@shared/employee-display";
import {
  catalogFunctionLabel,
  catalogModuleLabel,
} from "@shared/catalog-i18n";
import { privilegeRoleLabel } from "@shared/privilege-display";
import { cn } from "@/lib/utils";
import { employeeMatchesQuery } from "@/lib/employee-search";
import { CurrentPrivilegesPanel } from "@/components/ui/current-privileges-panel";
import { ReportsRoleTable } from "@/components/ui/reports-role-table";
import { isReportsFunction } from "@/lib/parse-report-role";
interface DeletePrivilegeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => Promise<void>;
  privileges: Privilege[];
  assignments: Assignment[];
  employees?: Employee[];
  companyId?: string;
  companies?: Company[];
  employeeId?: string;
  requireEmployeeSearch?: boolean;
  onEmployeeIdChange?: (employeeId: string) => void;
  initialModule?: string;
  initialFunction?: string;
  language?: AppLanguage;
  isSubmitting: boolean;
  t: {
    deletePrivilege: string;
    employee: string;
    searchEmployee: string;
    selectEmployee: string;
    externalEmployee: string;
    externalBadge: string;
    module: string;
    function: string;
    role: string;
    effectiveFrom: string;
    reinstateAfter: string;
    dateHelper: string;
    submitDeleteRequest: string;
    submitting: string;
    cancel: string;
    selectAll: string;
    unselectAll: string;
    noAssignedPrivileges: string;
    currentPrivileges: string;
    noCurrentPrivileges: string;
    filterCompany: string;
    allCompanies: string;
  };
}

export function DeletePrivilegeModal({
  open,
  onClose,
  onSubmit,
  privileges,
  assignments,
  employees = [],
  companyId = "",
  companies = [],
  employeeId = "",
  requireEmployeeSearch = false,
  onEmployeeIdChange,
  initialModule = "",
  initialFunction = "",
  language = "en",
  isSubmitting,
  t,
}: DeletePrivilegeModalProps) {
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [roleSelections, setRoleSelections] = useState<Record<string, boolean>>({});
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [externalEmployeeOnly, setExternalEmployeeOnly] = useState(false);
  const [legalCompanyFilter, setLegalCompanyFilter] = useState("all");

  const isExternalEmployee = (emp: Employee) =>
    Boolean(companyId && emp.legalCompanyId !== companyId);

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const assignedPrivilegeIds = useMemo(() => {
    if (!employeeId || !companyId) return new Set<string>();
    const assignment = assignments.find(
      (a) => a.companyId === companyId && a.employeeId === employeeId,
    );
    return new Set(assignment?.privilegeIds ?? []);
  }, [assignments, companyId, employeeId]);

  const assignedPrivileges = useMemo(
    () => privileges.filter((p) => assignedPrivilegeIds.has(p.id)),
    [privileges, assignedPrivilegeIds],
  );

  const employeesWithPrivileges = useMemo(
    () =>
      employees.filter((emp) => {
        const ids = assignments.find(
          (a) => a.companyId === companyId && a.employeeId === emp.id,
        )?.privilegeIds;
        return ids && ids.length > 0;
      }),
    [employees, assignments, companyId],
  );

  const companyFilterOptions = useMemo(() => {
    let scoped = employeesWithPrivileges;
    if (companyId) {
      scoped = scoped.filter((e) =>
        externalEmployeeOnly ? isExternalEmployee(e) : !isExternalEmployee(e),
      );
    }
    const ids = new Set(scoped.map((e) => e.legalCompanyId));
    return companies
      .filter((c) => ids.has(c.id))
      .sort((a, b) =>
        companyDisplayName(a, language).localeCompare(
          companyDisplayName(b, language),
          language,
        ),
      );
  }, [employeesWithPrivileges, companies, companyId, externalEmployeeOnly, language]);

  const filteredEmployees = useMemo(() => {
    let result = employeesWithPrivileges;
    if (companyId) {
      result = result.filter((e) =>
        externalEmployeeOnly ? isExternalEmployee(e) : !isExternalEmployee(e),
      );
    }
    if (legalCompanyFilter && legalCompanyFilter !== "all") {
      result = result.filter((e) => e.legalCompanyId === legalCompanyFilter);
    }
    if (employeeSearch.trim()) {
      result = result.filter((e) =>
        employeeMatchesQuery(e, employeeSearch, language),
      );
    }
    result.sort((a, b) => a.name.localeCompare(b.name, language));
    return result.slice(0, 50);
  }, [
    employeesWithPrivileges,
    companyId,
    employeeSearch,
    externalEmployeeOnly,
    legalCompanyFilter,
    language,
  ]);

  useEffect(() => {
    if (!open) {
      setSelectedModule("");
      setSelectedFunction("");
      setRoleSelections({});
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setEmployeeSearch("");
      setExternalEmployeeOnly(false);
      setLegalCompanyFilter("all");
    } else {
      setSelectedModule(initialModule);
      setSelectedFunction(initialFunction);
    }
  }, [open, initialModule, initialFunction]);

  useEffect(() => {
    if (!requireEmployeeSearch || !employeeId) return;
    const stillVisible = filteredEmployees.some((e) => e.id === employeeId);
    if (!stillVisible) onEmployeeIdChange?.("");
  }, [externalEmployeeOnly, filteredEmployees, employeeId, requireEmployeeSearch, onEmployeeIdChange]);

  const modules = useMemo(() => {
    const mods = new Set(assignedPrivileges.map((p) => p.module));
    return Array.from(mods).sort((a, b) =>
      catalogModuleLabel(a, language).localeCompare(
        catalogModuleLabel(b, language),
        language,
      ),
    );
  }, [assignedPrivileges, language]);

  const functions = useMemo(() => {
    if (!selectedModule) return [];
    const funcs = new Set(
      assignedPrivileges
        .filter((p) => p.module === selectedModule)
        .map((p) => p.function),
    );
    return Array.from(funcs).sort((a, b) =>
      catalogFunctionLabel(selectedModule, a, language).localeCompare(
        catalogFunctionLabel(selectedModule, b, language),
        language,
      ),
    );
  }, [assignedPrivileges, selectedModule, language]);

  const roles = useMemo(() => {
    if (!selectedModule || !selectedFunction) return [];
    return assignedPrivileges
      .filter((p) => p.module === selectedModule && p.function === selectedFunction)
      .sort((a, b) =>
        privilegeRoleLabel(a, language).localeCompare(
          privilegeRoleLabel(b, language),
          language,
        ),
      );
  }, [assignedPrivileges, selectedModule, selectedFunction, language]);

  useEffect(() => {
    if (roles.length > 0) {
      const selections: Record<string, boolean> = {};
      roles.forEach((r) => {
        selections[r.id] = true;
      });
      setRoleSelections(selections);
    }
  }, [roles]);

  useEffect(() => {
    setSelectedFunction("");
    setRoleSelections({});
  }, [selectedModule]);

  const handleSelectAll = () => {
    const selections: Record<string, boolean> = {};
    roles.forEach((r) => {
      selections[r.id] = true;
    });
    setRoleSelections(selections);
  };

  const handleUnselectAll = () => {
    const selections: Record<string, boolean> = {};
    roles.forEach((r) => {
      selections[r.id] = false;
    });
    setRoleSelections(selections);
  };

  const handleSubmit = async () => {
    const selectedRoles = Object.entries(roleSelections)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    await onSubmit({
      module: selectedModule,
      function: selectedFunction,
      rolesSelected: selectedRoles,
      startDate,
      endDate: endDate || null,
    });
  };

  const selectedCount = Object.values(roleSelections).filter(Boolean).length;
  const hasEmployee = !requireEmployeeSearch || Boolean(employeeId);
  const datesValid = !endDate || endDate >= startDate;
  const canSubmit =
    hasEmployee &&
    selectedModule &&
    selectedFunction &&
    selectedCount > 0 &&
    startDate &&
    datesValid &&
    assignedPrivileges.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          isReportsFunction(selectedFunction)
            ? "max-w-[min(96vw,72rem)] w-full"
            : "max-w-lg",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-rose-700">
            {t.deletePrivilege}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {requireEmployeeSearch ? (
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t.employee}</Label>
              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  id="delete-modal-external-employee"
                  checked={externalEmployeeOnly}
                  onCheckedChange={(v) => setExternalEmployeeOnly(v === true)}
                />
                <Label
                  htmlFor="delete-modal-external-employee"
                  className="cursor-pointer text-sm font-normal text-slate-600"
                >
                  {t.externalEmployee}
                </Label>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder={t.searchEmployee}
                    className="ps-9"
                  />
                </div>
                <Select
                  value={legalCompanyFilter}
                  onValueChange={setLegalCompanyFilter}
                >
                  <SelectTrigger
                    className="w-[11.5rem] shrink-0"
                    aria-label={t.filterCompany}
                  >
                    <SelectValue placeholder={t.filterCompany} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCompanies}</SelectItem>
                    {companyFilterOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {companyDisplayName(company, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                {filteredEmployees.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">
                    {t.noAssignedPrivileges}
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const external = isExternalEmployee(emp);
                    const legalCompany = companies.find((c) => c.id === emp.legalCompanyId);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => onEmployeeIdChange?.(emp.id)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-white",
                          employeeId === emp.id && "bg-rose-50",
                        )}
                      >
                        <span className="text-sm font-medium text-slate-900">
                          {employeeDisplayName(emp, language)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {emp.id}
                          {emp.email ? ` · ${emp.email}` : ""}
                        </span>
                        {external && legalCompany && (
                          <span className="text-xs text-orange-600">
                            {legalCompany.name} · {t.externalBadge}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            selectedEmployee && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2">
                <p className="text-xs text-slate-500">{t.employee}</p>
                <p className="font-medium text-slate-900">{selectedEmployee.name}</p>
                <p className="text-xs text-slate-600">{selectedEmployee.id}</p>
              </div>
            )
          )}

          {hasEmployee && (
            <CurrentPrivilegesPanel
              privileges={privileges}
              assignedPrivilegeIds={assignedPrivilegeIds}
              title={t.currentPrivileges}
              emptyMessage={t.noCurrentPrivileges}
              variant="rose"
            />
          )}

          {hasEmployee && assignedPrivileges.length > 0 && (
            <>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">{t.module}</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${t.module.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m} value={m}>
                        {catalogModuleLabel(m, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">{t.function}</Label>
                <Select
                  value={selectedFunction}
                  onValueChange={setSelectedFunction}
                  disabled={!selectedModule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${t.function.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {functions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {catalogFunctionLabel(selectedModule, f, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {roles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      {t.role} ({selectedCount}/{roles.length})
                    </Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs h-7">
                        {t.selectAll}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleUnselectAll} className="text-xs h-7">
                        {t.unselectAll}
                      </Button>
                    </div>
                  </div>
                  {isReportsFunction(selectedFunction) ? (
                    <ReportsRoleTable
                      roles={roles}
                      language={language}
                      roleSelections={roleSelections}
                      onToggle={(id, checked) =>
                        setRoleSelections((prev) => ({ ...prev, [id]: checked }))
                      }
                      className="border-rose-200 dark:border-rose-900/40"
                    />
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50/30 p-2 space-y-1">
                      {roles.map((role) => (
                        <label
                          key={role.id}
                          className="flex items-start gap-2 p-2 rounded hover:bg-rose-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={roleSelections[role.id] || false}
                            onCheckedChange={(checked) =>
                              setRoleSelections((prev) => ({
                                ...prev,
                                [role.id]: checked as boolean,
                              }))
                            }
                          />
                          <span className="text-sm text-slate-700" dir="auto">
                            {privilegeRoleLabel(role, language)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.effectiveFrom}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t.reinstateAfter}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-9"
                      min={startDate}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t.dateHelper}</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                {t.submitting}
              </>
            ) : (
              t.submitDeleteRequest
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
