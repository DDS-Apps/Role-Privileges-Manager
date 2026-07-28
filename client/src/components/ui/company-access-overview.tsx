import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Building2,
  Users,
  UserRound,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ExternalLink,
  Plus,
  Minus,
  Trash2,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Employee, Privilege, Assignment, Company } from "@shared/schema";
import { cn } from "@/lib/utils";

export type AccessRowType =
  | "internal"
  | "external"
  | "no_access"
  | "internal_other_company";

export interface CompanyAccessRow {
  key: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle?: string;
  legalCompanyId: string;
  legalCompanyName: string;
  accessCompanyId: string;
  accessCompanyName: string;
  module: string;
  function: string;
  role: string;
  rowType: AccessRowType;
}

interface RoleLeaf {
  role: string;
}

interface FunctionNode {
  function: string;
  roles: RoleLeaf[];
}

export interface ModuleInstance {
  key: string;
  module: string;
  accessCompanyId: string;
  accessCompanyName: string;
  isOtherCompany: boolean;
  functions: FunctionNode[];
  privilegeCount: number;
  primaryRole: string;
}

export interface ExternalAccessRow {
  key: string;
  companyId: string;
  companyName: string;
  module: string;
  function: string;
  roles: string[];
}

export interface EmployeeAccessGroup {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle?: string;
  employeeDepartment?: string;
  lineManagerName?: string;
  legalCompanyName: string;
  legalCompanyId: string;
  rowType: AccessRowType;
  modulePills: string[];
  inCompanyModules: ModuleInstance[];
  primaryRoleSummary: string;
  externalRows: ExternalAccessRow[];
  externalCompanyCount: number;
}

type ViewTab = "internal" | "external" | "all";

interface CompanyAccessOverviewProps {
  privileges: Privilege[];
  assignments: Assignment[];
  employees: Employee[];
  companies: Company[];
  companyId: string;
  selectedEmployeeId?: string;
  onSelectEmployee: (id: string) => void;
  onNewRequest: (employeeId: string) => void;
  onNewRequestFromToolbar: () => void;
  onDeletePrivilege: (employeeId: string, module?: string, functionName?: string) => void;
  onDeletePrivilegeFromToolbar?: () => void;
  language: "en" | "ar";
  t: {
    title: string;
    subtitle: string;
    search: string;
    module: string;
    function: string;
    role: string;
    modulesCol: string;
    companyCol: string;
    externalCol: string;
    externalAccessTitle: string;
    privilegesCol: string;
    allModules: string;
    clearModules: string;
    modulesSelected: string;
    allFunctions: string;
    internal: string;
    external: string;
    all: string;
    employee: string;
    employeeId: string;
    position: string;
    department: string;
    lineManager: string;
    type: string;
    legalCompany: string;
    accessCompany: string;
    noAccess: string;
    noResults: string;
    showing: string;
    of: string;
    rows: string;
    selectCompany: string;
    internalBadge: string;
    externalBadge: string;
    company: string;
    companies: string;
    otherCompanyAccess: string;
    newRequest: string;
    deletePrivilege: string;
    actions: string;
  };
}

function formatExternalCompanyCount(
  count: number,
  t: CompanyAccessOverviewProps["t"],
): string {
  const unit = count === 1 ? t.company : t.companies;
  return `${count} ${unit}`;
}

const PAGE_SIZE = 20;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function buildPrivilegeMap(privileges: Privilege[]) {
  const map = new Map<string, Privilege>();
  for (const p of privileges) map.set(p.id, p);
  return map;
}

function buildEmployeeMap(employees: Employee[]) {
  const map = new Map<string, Employee>();
  for (const e of employees) map.set(e.id, e);
  return map;
}

function buildCompanyMap(companies: Company[]) {
  const map = new Map<string, Company>();
  for (const c of companies) map.set(c.id, c);
  return map;
}

function buildAccessRows(
  companyId: string,
  companyName: string,
  assignments: Assignment[],
  employees: Employee[],
  employeeMap: Map<string, Employee>,
  companyMap: Map<string, Company>,
  privilegeMap: Map<string, Privilege>,
): { accessRows: CompanyAccessRow[]; noAccessIds: Set<string> } {
  const rows: CompanyAccessRow[] = [];
  const withAccessInCtx = new Set<string>();

  const pushAssignment = (
    assignment: Assignment,
    emp: Employee,
    rowType: AccessRowType,
  ) => {
    const legalCompanyName =
      companyMap.get(emp.legalCompanyId)?.name ?? emp.legalCompanyId;
    const accessCompanyName =
      companyMap.get(assignment.companyId)?.name ?? assignment.companyId;

    for (const privId of assignment.privilegeIds) {
      const priv = privilegeMap.get(privId);
      if (!priv) continue;
      rows.push({
        key: `${emp.id}-${assignment.companyId}-${privId}-${rowType}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        employeeTitle: emp.title,
        legalCompanyId: emp.legalCompanyId,
        legalCompanyName,
        accessCompanyId: assignment.companyId,
        accessCompanyName,
        module: priv.module,
        function: priv.function,
        role: priv.role,
        rowType,
      });
    }
  };

  // Access granted IN the selected company (internal + external users)
  for (const assignment of assignments) {
    if (assignment.companyId !== companyId) continue;
    const emp = employeeMap.get(assignment.employeeId);
    if (!emp) continue;
    withAccessInCtx.add(emp.id);
    const rowType: AccessRowType =
      emp.legalCompanyId === companyId ? "internal" : "external";
    pushAssignment(assignment, emp, rowType);
  }

  // Company employees with access in OTHER companies
  for (const assignment of assignments) {
    if (assignment.companyId === companyId) continue;
    const emp = employeeMap.get(assignment.employeeId);
    if (!emp || emp.legalCompanyId !== companyId) continue;
    if (assignment.privilegeIds.length === 0) continue;
    pushAssignment(assignment, emp, "internal_other_company");
  }

  const noAccessIds = new Set<string>();
  for (const emp of employees) {
    if (emp.legalCompanyId !== companyId) continue;
    if (!withAccessInCtx.has(emp.id)) {
      noAccessIds.add(emp.id);
      const legalCompanyName =
        companyMap.get(emp.legalCompanyId)?.name ?? emp.legalCompanyId;
      rows.push({
        key: `${emp.id}-no-access`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        employeeTitle: emp.title,
        legalCompanyId: emp.legalCompanyId,
        legalCompanyName,
        accessCompanyId: companyId,
        accessCompanyName: companyName,
        module: "—",
        function: "—",
        role: "—",
        rowType: "no_access",
      });
    }
  }

  return { accessRows: rows, noAccessIds };
}

function buildModulesFromRows(
  rows: CompanyAccessRow[],
  selectedCompanyId: string,
  companyName: string,
  language: string,
): ModuleInstance[] {
  const byModule = new Map<string, CompanyAccessRow[]>();
  for (const row of rows) {
    const list = byModule.get(row.module) ?? [];
    list.push(row);
    byModule.set(row.module, list);
  }

  const modules: ModuleInstance[] = [];
  for (const [moduleName, modRows] of Array.from(byModule.entries())) {
    const fnMap = new Map<string, Set<string>>();
    for (const row of modRows) {
      if (!fnMap.has(row.function)) fnMap.set(row.function, new Set());
      fnMap.get(row.function)!.add(row.role);
    }
    const functions: FunctionNode[] = Array.from(fnMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, language))
      .map(([fn, roles]) => ({
        function: fn,
        roles: Array.from(roles)
          .sort((a, b) => a.localeCompare(b, language))
          .map((role) => ({ role })),
      }));
    const privilegeCount = functions.reduce((n, f) => n + f.roles.length, 0);
    modules.push({
      key: `${moduleName}::${selectedCompanyId}`,
      module: moduleName,
      accessCompanyId: selectedCompanyId,
      accessCompanyName: companyName,
      isOtherCompany: false,
      functions,
      privilegeCount,
      primaryRole: functions[0]?.roles[0]?.role ?? "—",
    });
  }
  return modules.sort((a, b) => a.module.localeCompare(b.module, language));
}

function buildExternalTableRows(
  rows: CompanyAccessRow[],
  language: string,
): ExternalAccessRow[] {
  const byCoModFn = new Map<string, CompanyAccessRow[]>();
  for (const row of rows) {
    const k = `${row.accessCompanyId}::${row.module}::${row.function}`;
    const list = byCoModFn.get(k) ?? [];
    list.push(row);
    byCoModFn.set(k, list);
  }

  const result: ExternalAccessRow[] = [];
  for (const [key, fnRows] of Array.from(byCoModFn.entries())) {
    const head = fnRows[0];
    const roleSet = new Set<string>();
    for (const r of fnRows) roleSet.add(r.role);
    const roles = Array.from(roleSet).sort((a, b) => a.localeCompare(b, language));
    result.push({
      key,
      companyId: head.accessCompanyId,
      companyName: head.accessCompanyName,
      module: head.module,
      function: head.function,
      roles,
    });
  }
  return result.sort((a, b) => {
    const c = a.companyName.localeCompare(b.companyName, language);
    if (c !== 0) return c;
    const m = a.module.localeCompare(b.module, language);
    if (m !== 0) return m;
    return a.function.localeCompare(b.function, language);
  });
}

function summarizeRoles(modules: ModuleInstance[]): string {
  const allRoles = modules.flatMap((m) =>
    m.functions.flatMap((f) => f.roles.map((r) => r.role)),
  );
  if (allRoles.length === 0) return "—";
  if (allRoles.length === 1) return allRoles[0];
  return `${allRoles[0]} (+${allRoles.length - 1})`;
}

function enrichEmployeeGroup(
  first: CompanyAccessRow,
  employeeMap: Map<string, Employee>,
): Pick<EmployeeAccessGroup, "employeeDepartment" | "lineManagerName"> {
  const emp = employeeMap.get(first.employeeId);
  const lineManagerName = emp?.managerId
    ? employeeMap.get(emp.managerId)?.name
    : undefined;
  return {
    employeeDepartment: emp?.department,
    lineManagerName,
  };
}

function rowsToEmployeeGroups(
  rows: CompanyAccessRow[] | undefined,
  selectedCompanyId: string,
  contextCompanyName: string,
  language: string,
  employeeMap: Map<string, Employee>,
): EmployeeAccessGroup[] {
  const safeRows = rows ?? [];
  const byEmployee = new Map<string, CompanyAccessRow[]>();
  for (const row of safeRows) {
    const list = byEmployee.get(row.employeeId) ?? [];
    list.push(row);
    byEmployee.set(row.employeeId, list);
  }

  const groups: EmployeeAccessGroup[] = [];

  for (const [, empRows] of Array.from(byEmployee.entries())) {
    const first = empRows[0];

    if (first.rowType === "no_access") {
      groups.push({
        employeeId: first.employeeId,
        employeeName: first.employeeName,
        employeeEmail: first.employeeEmail,
        employeeTitle: first.employeeTitle,
        ...enrichEmployeeGroup(first, employeeMap),
        legalCompanyName: first.legalCompanyName,
        legalCompanyId: first.legalCompanyId,
        rowType: "no_access",
        modulePills: [],
        inCompanyModules: [],
        primaryRoleSummary: "—",
        externalRows: [],
        externalCompanyCount: 0,
      });
      continue;
    }

    const inCompanyRows = empRows.filter(
      (r: CompanyAccessRow) =>
        r.rowType !== "no_access" &&
        r.rowType !== "internal_other_company" &&
        r.accessCompanyId === selectedCompanyId,
    );
    const otherCompanyRows = empRows.filter(
      (r: CompanyAccessRow) => r.rowType === "internal_other_company",
    );

    const inCompanyModules = buildModulesFromRows(
      inCompanyRows,
      selectedCompanyId,
      contextCompanyName,
      language,
    );
    const externalRows = buildExternalTableRows(otherCompanyRows, language);
    const externalCompanyCount = new Set(
      externalRows.map((r) => r.companyId),
    ).size;

    const modulePills = inCompanyModules.map((m) => m.module);
    const displayType: AccessRowType = empRows.some(
      (r: CompanyAccessRow) => r.rowType === "external",
    )
      ? "external"
      : "internal";

    groups.push({
      employeeId: first.employeeId,
      employeeName: first.employeeName,
      employeeEmail: first.employeeEmail,
      employeeTitle: first.employeeTitle,
      ...enrichEmployeeGroup(first, employeeMap),
      legalCompanyName: first.legalCompanyName,
      legalCompanyId: first.legalCompanyId,
      rowType: displayType,
      modulePills,
      inCompanyModules,
      primaryRoleSummary: summarizeRoles(inCompanyModules),
      externalRows,
      externalCompanyCount,
    });
  }

  groups.sort((a, b) => {
    const order: Record<string, number> = {
      internal: 0,
      no_access: 1,
      external: 2,
      internal_other_company: 0,
    };
    const ta = order[a.rowType] ?? 0;
    const tb = order[b.rowType] ?? 0;
    if (ta !== tb) return ta - tb;
    return a.employeeName.localeCompare(b.employeeName, language);
  });

  return groups;
}

function TypeBadge({
  rowType,
  t,
}: {
  rowType: AccessRowType;
  t: CompanyAccessOverviewProps["t"];
}) {
  if (rowType === "external") {
    return (
      <Badge className="border-0 bg-orange-100 font-normal capitalize text-orange-800 hover:bg-orange-100">
        {t.externalBadge}
      </Badge>
    );
  }
  if (rowType === "no_access") {
    return <Badge variant="secondary">{t.noAccess}</Badge>;
  }
  return (
    <Badge className="border-0 bg-sky-100 font-normal capitalize text-sky-800 hover:bg-sky-100">
      {t.internalBadge}
    </Badge>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
  ) : (
    <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
  );
}

export function CompanyAccessOverview({
  privileges,
  assignments,
  employees,
  companies,
  companyId,
  selectedEmployeeId,
  onSelectEmployee,
  onNewRequest,
  onNewRequestFromToolbar,
  onDeletePrivilege,
  language,
  t,
}: CompanyAccessOverviewProps) {
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [moduleFilters, setModuleFilters] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedExternal, setExpandedExternal] = useState<Set<string>>(
    () => new Set(),
  );
  const [focusedModule, setFocusedModule] = useState<{
    employeeId: string;
    moduleName: string;
  } | null>(null);

  const privilegeMap = useMemo(() => buildPrivilegeMap(privileges), [privileges]);
  const employeeMap = useMemo(() => buildEmployeeMap(employees), [employees]);
  const companyMap = useMemo(() => buildCompanyMap(companies), [companies]);
  const companyName = companyMap.get(companyId)?.name ?? companyId;

  const catalogModules = useMemo(
    () => Array.from(new Set(privileges.map((p) => p.module))).sort(),
    [privileges],
  );

  const { accessRows, noAccessIds } = useMemo(() => {
    if (!companyId) {
      return { accessRows: [] as CompanyAccessRow[], noAccessIds: new Set<string>() };
    }
    return buildAccessRows(
      companyId,
      companyName,
      assignments,
      employees,
      employeeMap,
      companyMap,
      privilegeMap,
    );
  }, [
    assignments,
    companyId,
    companyName,
    employeeMap,
    employees,
    companyMap,
    privilegeMap,
  ]);

  const filteredRows = useMemo(() => {
    const source = accessRows ?? [];
    let result = source;

    if (viewTab === "internal") {
      result = result.filter(
        (r) =>
          r.rowType === "internal" ||
          r.rowType === "no_access" ||
          r.rowType === "internal_other_company",
      );
    } else if (viewTab === "external") {
      result = result.filter((r) => r.rowType === "external");
    }

    if (moduleFilters.size > 0) {
      result = result.filter(
        (r) => r.rowType === "no_access" || moduleFilters.has(r.module),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.employeeId.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeEmail.toLowerCase().includes(q) ||
          r.module.toLowerCase().includes(q) ||
          r.function.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.accessCompanyName.toLowerCase().includes(q) ||
          r.legalCompanyName.toLowerCase().includes(q),
      );
    }

    return result;
  }, [accessRows, viewTab, moduleFilters, search]);

  const moduleFilterLabel = useMemo(() => {
    if (moduleFilters.size === 0) return t.allModules;
    const selected = catalogModules.filter((m) => moduleFilters.has(m));
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(", ");
    return t.modulesSelected.replace("{count}", String(selected.length));
  }, [moduleFilters, catalogModules, t.allModules, t.modulesSelected]);

  const toggleModuleFilter = (module: string) => {
    setModuleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
    setPage(0);
  };

  const clearModuleFilters = () => {
    setModuleFilters(new Set());
    setPage(0);
  };

  const employeeGroups = useMemo(
    () =>
      rowsToEmployeeGroups(
        filteredRows,
        companyId,
        companyName,
        language,
        employeeMap,
      ),
    [filteredRows, companyId, companyName, language, employeeMap],
  );

  const stats = useMemo(() => {
    const internal = new Set<string>();
    const external = new Set<string>();
    let crossCompany = 0;
    for (const r of accessRows ?? []) {
      if (r.rowType === "external") external.add(r.employeeId);
      if (r.rowType === "internal" || r.rowType === "no_access") internal.add(r.employeeId);
      if (r.rowType === "internal_other_company") {
        internal.add(r.employeeId);
        crossCompany++;
      }
    }
    return {
      internalEmployees: internal.size,
      externalEmployees: external.size,
      noAccess: noAccessIds.size,
      crossCompanyRows: crossCompany,
    };
  }, [accessRows, noAccessIds]);

  const totalPages = Math.max(1, Math.ceil(employeeGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageGroups = employeeGroups.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandModuleDetails = (employeeId: string, mod: ModuleInstance) => {
    const modKey = `${employeeId}|${mod.key}`;
    setExpandedEmployees((prev) => new Set(prev).add(employeeId));
    setExpandedModules((prev) => new Set(prev).add(modKey));
    setExpandedFunctions((prev) => {
      const next = new Set(prev);
      for (const fn of mod.functions) {
        next.add(`${modKey}|${fn.function}`);
      }
      return next;
    });
  };

  const collapseModuleDetails = (employeeId: string, mod: ModuleInstance) => {
    const modKey = `${employeeId}|${mod.key}`;
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.delete(modKey);
      return next;
    });
    setExpandedFunctions((prev) => {
      const next = new Set(prev);
      for (const fn of mod.functions) {
        next.delete(`${modKey}|${fn.function}`);
      }
      return next;
    });
  };

  const handleSelectEmployee = (employeeId: string) => {
    onSelectEmployee(employeeId);
    if (focusedModule?.employeeId !== employeeId) {
      setFocusedModule(null);
    }
  };

  const handleModulePillSelect = (
    group: EmployeeAccessGroup,
    moduleName: string,
  ) => {
    const isSamePill =
      focusedModule?.employeeId === group.employeeId &&
      focusedModule.moduleName === moduleName;

    const mod = group.inCompanyModules.find((m) => m.module === moduleName);

    if (isSamePill) {
      setFocusedModule(null);
      if (mod) collapseModuleDetails(group.employeeId, mod);
      setExpandedEmployees((prev) => {
        const next = new Set(prev);
        next.delete(group.employeeId);
        return next;
      });
      return;
    }

    handleSelectEmployee(group.employeeId);
    setFocusedModule({ employeeId: group.employeeId, moduleName });
    if (mod) expandModuleDetails(group.employeeId, mod);
  };

  const isEmployeeExpanded = (id: string) => expandedEmployees.has(id);
  const isExternalExpanded = (id: string) => expandedExternal.has(id);
  const isModuleExpanded = (key: string) => expandedModules.has(key);
  const isFunctionExpanded = (key: string) => expandedFunctions.has(key);

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">{t.selectCompany}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t.subtitle}{" "}
              <span className="font-medium text-slate-800" dir="auto">
                {companyName}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 font-normal">
              <Users className="h-3.5 w-3.5" />
              {stats.internalEmployees} {t.internal}
            </Badge>
            <Badge className="gap-1 border-0 bg-orange-50 font-normal text-orange-800">
              <UserRound className="h-3.5 w-3.5" />
              {stats.externalEmployees} {t.external}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <Tabs
          value={viewTab}
          onValueChange={(v) => {
            setViewTab(v as ViewTab);
            setPage(0);
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-9 bg-slate-100">
              <TabsTrigger value="all" className="text-xs capitalize">
                {t.all}
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-xs capitalize">
                {t.internal}
              </TabsTrigger>
              <TabsTrigger value="external" className="text-xs capitalize">
                {t.external}
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder={t.search}
                  className="h-9 border-slate-200 pl-9"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-[180px] justify-between border-slate-200 px-3 text-sm font-normal"
                    data-testid="button-module-filter"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{moduleFilterLabel}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  className="z-[200] w-52 border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 bg-white pb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {t.allModules}
                    </span>
                    {moduleFilters.size > 0 && (
                      <button
                        type="button"
                        onClick={clearModuleFilters}
                        className="text-xs font-medium text-teal-700 hover:text-teal-900"
                      >
                        {t.clearModules}
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 space-y-0.5 overflow-y-auto bg-white">
                    {catalogModules.map((m) => (
                      <label
                        key={m}
                        className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={moduleFilters.has(m)}
                          onCheckedChange={() => toggleModuleFilter(m)}
                          data-testid={`module-filter-${m}`}
                        />
                        <span className="text-sm text-slate-800">{m}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="sm"
                onClick={onNewRequestFromToolbar}
                className="h-9 shrink-0 gap-1.5 bg-[#218C9C] text-white hover:bg-[#1A7080]"
                data-testid="button-new-request-toolbar"
              >
                <Plus className="h-4 w-4" />
                {t.newRequest}
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-10" />
                  <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.employee}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.type}
                  </TableHead>
                  <TableHead className="min-w-[140px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.modulesCol}
                  </TableHead>
                  <TableHead className="min-w-[7.5rem] whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.externalCol}
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-slate-500">
                      {t.noResults}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageGroups.map((group) => (
                    <EmployeeTree
                      key={group.employeeId}
                      group={group}
                      contextCompanyName={companyName}
                      isSelected={selectedEmployeeId === group.employeeId}
                      isExpanded={isEmployeeExpanded(group.employeeId)}
                      isExternalExpanded={isExternalExpanded(group.employeeId)}
                      selectedModuleName={
                        focusedModule?.employeeId === group.employeeId
                          ? focusedModule.moduleName
                          : null
                      }
                      isModuleExpanded={isModuleExpanded}
                      isFunctionExpanded={isFunctionExpanded}
                      onToggleEmployee={() => {
                        const wasExpanded = isEmployeeExpanded(group.employeeId);
                        toggleSet(setExpandedEmployees, group.employeeId);
                        if (
                          wasExpanded &&
                          focusedModule?.employeeId === group.employeeId
                        ) {
                          setFocusedModule(null);
                        }
                      }}
                      onToggleExternal={() =>
                        toggleSet(setExpandedExternal, group.employeeId)
                      }
                      onToggleModule={(key) => toggleSet(setExpandedModules, key)}
                      onToggleFunction={(key) =>
                        toggleSet(setExpandedFunctions, key)
                      }
                      onSelect={() => handleSelectEmployee(group.employeeId)}
                      onModulePillSelect={(moduleName) =>
                        handleModulePillSelect(group, moduleName)
                      }
                      onNewRequest={() => onNewRequest(group.employeeId)}
                      onDeletePrivilege={(module, functionName) =>
                        onDeletePrivilege(group.employeeId, module, functionName)
                      }
                      t={t}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {employeeGroups.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>
                {t.showing} {safePage * PAGE_SIZE + 1}–
                {Math.min((safePage + 1) * PAGE_SIZE, employeeGroups.length)}{" "}
                {t.of} {employeeGroups.length} {t.rows}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4rem] text-center text-xs">
                  {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function EmployeeDetailsPopover({
  group,
  t,
}: {
  group: EmployeeAccessGroup;
  t: CompanyAccessOverviewProps["t"];
}) {
  const fields: { label: string; value: string; bold?: boolean }[] = [
    { label: t.employee, value: group.employeeName, bold: true },
    { label: t.employeeId, value: group.employeeId },
  ];
  if (group.employeeTitle) {
    fields.push({ label: t.position, value: group.employeeTitle });
  }
  if (group.employeeDepartment) {
    fields.push({ label: t.department, value: group.employeeDepartment });
  }
  if (group.lineManagerName) {
    fields.push({ label: t.lineManager, value: group.lineManagerName });
  }
  fields.push({ label: t.legalCompany, value: group.legalCompanyName });

  const [open, setOpen] = useState(false);

  return (
    <>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[45] bg-slate-900/40"
            aria-hidden
            onClick={() => setOpen(false)}
          />,
          document.body,
        )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            onClick={(e) => e.stopPropagation()}
            data-testid={`employee-info-${group.employeeId}`}
            aria-label={`${t.employee}: ${group.employeeName}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="z-[50] w-96 border-slate-200 bg-white p-0 text-slate-900 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
        <dl className="divide-y divide-slate-100 text-sm">
          {fields.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-4 px-4 py-3"
            >
              <dt className="shrink-0 text-slate-500">{row.label}</dt>
              <dd
                className={cn(
                  "text-end",
                  row.bold
                    ? "font-semibold text-slate-900"
                    : "text-slate-800",
                )}
                dir="auto"
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        </PopoverContent>
      </Popover>
    </>
  );
}

function EmployeeTree({
  group,
  contextCompanyName,
  isSelected,
  isExpanded,
  isExternalExpanded,
  selectedModuleName,
  isModuleExpanded,
  isFunctionExpanded,
  onToggleEmployee,
  onToggleExternal,
  onToggleModule,
  onToggleFunction,
  onSelect,
  onModulePillSelect,
  onNewRequest,
  onDeletePrivilege,
  t,
}: {
  group: EmployeeAccessGroup;
  contextCompanyName: string;
  isSelected: boolean;
  isExpanded: boolean;
  isExternalExpanded: boolean;
  selectedModuleName: string | null;
  isModuleExpanded: (key: string) => boolean;
  isFunctionExpanded: (key: string) => boolean;
  onToggleEmployee: () => void;
  onToggleExternal: () => void;
  onToggleModule: (key: string) => void;
  onToggleFunction: (key: string) => void;
  onSelect: () => void;
  onModulePillSelect: (moduleName: string) => void;
  onNewRequest: () => void;
  onDeletePrivilege: (module?: string, functionName?: string) => void;
  t: CompanyAccessOverviewProps["t"];
}) {
  const hasInCompany = group.inCompanyModules.length > 0;
  const hasExternal = group.externalCompanyCount > 0;
  const empKey = group.employeeId;

  const modulesToShow = selectedModuleName
    ? group.inCompanyModules.filter((m) => m.module === selectedModuleName)
    : group.inCompanyModules;

  const activeModuleKey = selectedModuleName
    ? (() => {
        const mod = group.inCompanyModules.find(
          (m) => m.module === selectedModuleName,
        );
        return mod ? `${empKey}|${mod.key}` : null;
      })()
    : null;

  const handleEmployeeRowClick = () => {
    onSelect();
    if (hasInCompany) onToggleEmployee();
  };

  return (
    <>
      <TableRow
        data-testid={`access-group-${empKey}`}
        className={cn(
          "cursor-pointer border-b border-slate-100 hover:bg-slate-50/80",
          isSelected && "bg-teal-50/60",
          group.rowType === "external" && "bg-orange-50/20",
        )}
        onClick={handleEmployeeRowClick}
        aria-expanded={hasInCompany ? isExpanded : undefined}
      >
        <TableCell className="py-3 align-middle">
          {hasInCompany ? (
            <ExpandIcon expanded={isExpanded} />
          ) : (
            <span className="inline-block w-4" />
          )}
        </TableCell>
        <TableCell className="py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0 border border-slate-200">
              <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">
                {getInitials(group.employeeName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-semibold text-slate-900">
                  {group.employeeName}
                </p>
                <EmployeeDetailsPopover group={group} t={t} />
              </div>
              <p className="truncate text-xs text-slate-500">{group.employeeEmail}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-3 align-top">
          <TypeBadge rowType={group.rowType} t={t} />
        </TableCell>
        <TableCell
          className="py-3 align-top"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap gap-1">
            {group.modulePills.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              group.modulePills.map((m) => {
                const isPillSelected = selectedModuleName === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModulePillSelect(m)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      isPillSelected
                        ? "border-teal-500 bg-teal-100 text-teal-900 ring-1 ring-teal-400/60"
                        : "border-slate-200 bg-slate-100 text-slate-700 hover:border-teal-300 hover:bg-teal-50",
                    )}
                    data-testid={`module-pill-${empKey}-${m}`}
                    aria-pressed={isPillSelected}
                  >
                    {m}
                  </button>
                );
              })
            )}
          </div>
        </TableCell>
        <TableCell
          className={cn(
            "py-3 align-top whitespace-nowrap",
            hasExternal && "cursor-pointer",
          )}
          onClick={
            hasExternal
              ? (e) => {
                  e.stopPropagation();
                  onToggleExternal();
                }
              : undefined
          }
          aria-expanded={hasExternal ? isExternalExpanded : undefined}
        >
          {hasExternal ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors",
                isExternalExpanded
                  ? "border-orange-400 bg-orange-100 text-orange-900"
                  : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100",
              )}
            >
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              <span>
                {formatExternalCompanyCount(group.externalCompanyCount, t)}
              </span>
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </TableCell>
        <TableCell
          className="py-3 align-top text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-40"
              onClick={() => onDeletePrivilege()}
              disabled={!hasInCompany}
              data-testid={`button-delete-privilege-${empKey}`}
              aria-label={t.deletePrivilege}
              title={t.deletePrivilege}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border-[#218C9C]/30 bg-white text-[#218C9C] hover:bg-teal-50"
              onClick={onNewRequest}
              data-testid={`button-new-request-${empKey}`}
              aria-label={t.newRequest}
              title={t.newRequest}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && hasInCompany && (
        <TableRow
          className={cn(
            "hover:bg-white",
            isSelected && "bg-teal-50/10",
          )}
        >
          <TableCell colSpan={6} className="border-b border-slate-200 p-0">
            <InCompanyAccessTree
              modules={modulesToShow}
              empKey={empKey}
              activeModuleKey={activeModuleKey}
              isModuleExpanded={isModuleExpanded}
              isFunctionExpanded={isFunctionExpanded}
              onToggleModule={onToggleModule}
              onToggleFunction={onToggleFunction}
              onDeleteFunction={(module, functionName) =>
                onDeletePrivilege(module, functionName)
              }
              deleteLabel={t.deletePrivilege}
            />
          </TableCell>
        </TableRow>
      )}

      {isExternalExpanded && hasExternal && (
        <TableRow className="bg-orange-50/60 hover:bg-orange-50/60">
          <TableCell colSpan={6} className="p-0">
            <ExternalAccessPanel
              group={group}
              contextCompanyName={contextCompanyName}
              t={t}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExternalAccessPanel({
  group,
  contextCompanyName,
  t,
}: {
  group: EmployeeAccessGroup;
  contextCompanyName: string;
  t: CompanyAccessOverviewProps["t"];
}) {
  return (
    <div className="border-t border-orange-200/80 px-4 py-3">
      <p className="mb-3 text-sm text-orange-900">
        <span className="font-semibold">{t.externalAccessTitle}</span>
        {" — "}
        <span className="font-medium">{group.employeeName}</span>
        {" "}
        {t.otherCompanyAccess}{" "}
        <span dir="auto">{contextCompanyName}</span>
      </p>
      <div className="overflow-hidden rounded-lg border border-orange-200/60 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-50/80 hover:bg-orange-50/80">
              <TableHead className="text-xs font-semibold uppercase text-orange-900/80">
                {t.companyCol}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-orange-900/80">
                {t.module}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-orange-900/80">
                {t.function}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-orange-900/80">
                {t.role}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.externalRows.map((row) => (
              <TableRow key={row.key} className="hover:bg-orange-50/30">
                <TableCell className="border-r border-orange-100/80 text-sm font-medium text-slate-800" dir="auto">
                  {row.companyName}
                </TableCell>
                <TableCell className="border-r border-orange-100/80 text-sm text-slate-700">
                  {row.module}
                </TableCell>
                <TableCell className="border-r border-orange-100/80 text-sm font-medium text-slate-700">
                  {row.function}
                </TableCell>
                <TableCell className="align-top text-sm text-slate-600">
                  {row.roles.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <ul className="list-disc space-y-1 pl-4 marker:text-orange-400/70">
                      {row.roles.map((role) => (
                        <li key={role} className="leading-snug">
                          {role}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TreeChevron({
  expanded,
  tone = "teal",
}: {
  expanded: boolean;
  tone?: "teal" | "muted";
}) {
  const className =
    tone === "teal"
      ? "h-3.5 w-3.5 shrink-0 text-teal-600"
      : "h-3 w-3 shrink-0 text-slate-400";
  return expanded ? (
    <ChevronDown className={className} aria-hidden />
  ) : (
    <ChevronRightIcon className={className} aria-hidden />
  );
}

function InCompanyAccessTree({
  modules,
  empKey,
  activeModuleKey,
  isModuleExpanded,
  isFunctionExpanded,
  onToggleModule,
  onToggleFunction,
  onDeleteFunction,
  deleteLabel,
}: {
  modules: ModuleInstance[];
  empKey: string;
  activeModuleKey: string | null;
  isModuleExpanded: (key: string) => boolean;
  isFunctionExpanded: (key: string) => boolean;
  onToggleModule: (key: string) => void;
  onToggleFunction: (key: string) => void;
  onDeleteFunction?: (module: string, functionName: string) => void;
  deleteLabel?: string;
}) {
  if (modules.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-slate-500">—</p>
    );
  }

  return (
    <div className="divide-y divide-slate-200 bg-white">
      {modules.map((mod) => {
        const modKey = `${empKey}|${mod.key}`;
        const modExpanded = isModuleExpanded(modKey);
        const hasFunctions = mod.functions.length > 0;
        const isActive = activeModuleKey === modKey;

        return (
          <div
            key={modKey}
            className={cn(isActive && "bg-teal-50/30 ring-1 ring-inset ring-teal-200/80")}
          >
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 pl-8 text-left transition-colors hover:bg-slate-50",
                !hasFunctions && "cursor-default",
              )}
              onClick={() => hasFunctions && onToggleModule(modKey)}
              aria-expanded={hasFunctions ? modExpanded : undefined}
            >
              {hasFunctions ? (
                <TreeChevron expanded={modExpanded} tone="teal" />
              ) : (
                <span className="w-3.5" />
              )}
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                {mod.module}
              </span>
              <span className="text-xs text-slate-400">({mod.privilegeCount})</span>
            </button>

            {modExpanded &&
              mod.functions.map((fn) => {
                const fnKey = `${modKey}|${fn.function}`;
                const fnExpanded = isFunctionExpanded(fnKey);
                const roleCount = fn.roles.length;

                return (
                  <div key={fnKey} className="border-t border-slate-100">
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 py-2 pl-12 text-left transition-colors hover:bg-slate-50/80"
                        onClick={() => onToggleFunction(fnKey)}
                        aria-expanded={fnExpanded}
                      >
                        <TreeChevron expanded={fnExpanded} tone="muted" />
                        <span className="text-sm text-slate-700">{fn.function}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                          {roleCount}
                        </span>
                      </button>
                      {onDeleteFunction && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => onDeleteFunction(mod.module, fn.function)}
                          aria-label={deleteLabel}
                          title={deleteLabel}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {fnExpanded && (
                      <div className="space-y-1 border-t border-slate-50 bg-slate-50/30 px-4 py-2 pl-16 pr-4">
                        {fn.roles.map((leaf) => (
                          <div
                            key={leaf.role}
                            className="flex gap-2.5 py-1.5 text-sm leading-snug text-slate-600"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                            <span>{leaf.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
