import { useState, useMemo, useEffect } from "react";
import { useBootstrapData, useApplyAssignments } from "@/hooks/use-app-data";
import { 
  Loader2, Search, Globe, Building2, Users, ShieldCheck,
  Plus, Minus, Check, ChevronDown, ChevronRight
} from "lucide-react";
import type { Employee, Company, Privilege, Assignment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type Language = "en" | "ar";

const DICT = {
  en: {
    title: "Business Users Roles and Privileges",
    actAs: "Act as Manager",
    company: "Company",
    employee: "Employee",
    search: "Search by ID or name...",
    privileges: "Privileges",
    module: "Module",
    function: "Function",
    role: "Role",
    assigned: "assigned",
    addRemove: "Add / Remove Privileges",
    applyChanges: "Apply Changes",
    cancel: "Cancel",
    managerDetails: "Manager Details",
    legalCompany: "Legal Company",
    noAccess: "No companies accessible",
    selectModule: "Select Module",
    selectFunction: "Select Function",
    noPrivileges: "No privileges assigned",
    allRolesSelected: "All roles selected by default. Uncheck to remove.",
    employeeDetails: "Employee Details",
    companyContext: "Company Context",
    currentPrivilege: "Current Privilege",
    editPrivileges: "Edit Privileges",
    selectModuleFirst: "Select a module to see functions",
    selectFunctionFirst: "Select a function to see roles",
    applying: "Applying...",
    legalEmployees: "Legal Employees",
    selectEmployee: "Select Employee",
    noLegalEmployees: "No employees under this manager",
    rolesAssigned: "roles assigned",
  },
  ar: {
    title: "أدوار وامتيازات مستخدمي الأعمال",
    actAs: "تصرف كمدير",
    company: "الشركة",
    employee: "الموظف",
    search: "ابحث بالرقم أو الاسم...",
    privileges: "الامتيازات",
    module: "الوحدة",
    function: "الوظيفة",
    role: "الدور",
    assigned: "مخصص",
    addRemove: "إضافة / إزالة الامتيازات",
    applyChanges: "تطبيق التغييرات",
    cancel: "إلغاء",
    managerDetails: "تفاصيل المدير",
    legalCompany: "الشركة القانونية",
    noAccess: "لا توجد شركات متاحة",
    selectModule: "اختر الوحدة",
    selectFunction: "اختر الوظيفة",
    noPrivileges: "لا توجد امتيازات مخصصة",
    allRolesSelected: "جميع الأدوار محددة افتراضياً. ألغِ التحديد للإزالة.",
    employeeDetails: "تفاصيل الموظف",
    companyContext: "سياق الشركة",
    currentPrivilege: "الامتيازات الحالية",
    editPrivileges: "تعديل الامتيازات",
    selectModuleFirst: "اختر وحدة لرؤية الوظائف",
    selectFunctionFirst: "اختر وظيفة لرؤية الأدوار",
    applying: "جاري التطبيق...",
    legalEmployees: "الموظفين القانونيين",
    selectEmployee: "اختر موظف",
    noLegalEmployees: "لا يوجد موظفين تحت هذا المدير",
    rolesAssigned: "أدوار مخصصة",
  }
};

// Expandable hierarchy component for Current Privilege
function ExpandableHierarchy({ 
  allPrivileges, 
  companyAssignments,
  t 
}: { 
  allPrivileges: Privilege[];
  companyAssignments: { company: Company; privilegeIds: string[] }[];
  t: typeof DICT.en;
}) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const toggleModule = (key: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleFunction = (key: string) => {
    setExpandedFunctions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Build module groups from ALL privileges
  const moduleGroups: Record<string, Record<string, Privilege[]>> = {};
  for (const priv of allPrivileges) {
    if (!moduleGroups[priv.module]) moduleGroups[priv.module] = {};
    if (!moduleGroups[priv.module][priv.function]) moduleGroups[priv.module][priv.function] = [];
    moduleGroups[priv.module][priv.function].push(priv);
  }

  // Only show companies that have assigned roles
  if (companyAssignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-violet-100/50 dark:bg-violet-900/20">
        <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t.noPrivileges}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companyAssignments.map(({ company, privilegeIds }) => {
        const isCompanyExpanded = expandedCompanies.has(company.id);
        const assignedCount = privilegeIds.length;

        return (
          <div key={company.id} className="border border-violet-200 dark:border-violet-700 rounded-lg bg-white/50 dark:bg-violet-950/30 overflow-hidden">
            {/* Company Header */}
            <button
              onClick={() => toggleCompany(company.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition-colors"
              data-testid={`toggle-company-${company.id}`}
            >
              <div className="flex items-center gap-2">
                {isCompanyExpanded ? <ChevronDown className="h-4 w-4 text-violet-600" /> : <ChevronRight className="h-4 w-4 text-violet-600" />}
                <Building2 className="h-4 w-4 text-violet-500" />
                <span className="font-medium">{company.name}</span>
              </div>
              <span className="text-xs text-violet-600 dark:text-violet-400">
                {assignedCount} {t.rolesAssigned}
              </span>
            </button>

            {/* Modules - show modules with assigned roles */}
            {isCompanyExpanded && (
              <div className="border-t border-violet-200 dark:border-violet-700">
                {Object.entries(moduleGroups).sort(([a], [b]) => a.localeCompare(b)).map(([moduleName, functionGroups]) => {
                  const moduleKey = `${company.id}-${moduleName}`;
                  const isModuleExpanded = expandedModules.has(moduleKey);
                  
                  // Count assigned roles in this module for this company
                  const moduleAssignedCount = Object.values(functionGroups)
                    .flat()
                    .filter(p => privilegeIds.includes(p.id)).length;
                  
                  // Skip modules with 0 assigned roles
                  if (moduleAssignedCount === 0) return null;

                  const moduleTotalCount = Object.values(functionGroups).flat().length;

                  return (
                    <div key={moduleKey} className="border-t border-violet-200 dark:border-violet-700 first:border-t-0">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(moduleKey)}
                        className="w-full flex items-center gap-2 p-2 pl-6 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition-colors text-left"
                        data-testid={`toggle-module-${moduleKey}`}
                      >
                        {isModuleExpanded ? <ChevronDown className="h-3 w-3 text-violet-600" /> : <ChevronRight className="h-3 w-3 text-violet-600" />}
                        <span className="inline-flex items-center rounded-md bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                          {moduleName}
                        </span>
                        <span className="text-xs text-violet-600/70 dark:text-violet-400/70">({moduleAssignedCount}/{moduleTotalCount})</span>
                      </button>

                      {/* Functions - only show functions with assigned roles */}
                      {isModuleExpanded && (
                        <div>
                          {Object.entries(functionGroups).sort(([a], [b]) => a.localeCompare(b)).map(([funcName, funcPrivs]) => {
                            // Count assigned roles in this function
                            const funcAssignedCount = funcPrivs.filter(p => privilegeIds.includes(p.id)).length;
                            
                            // Skip functions with 0 assigned roles
                            if (funcAssignedCount === 0) return null;

                            const funcKey = `${moduleKey}-${funcName}`;
                            const isFuncExpanded = expandedFunctions.has(funcKey);

                            // Only show assigned roles, sorted alphabetically
                            const assignedRoles = funcPrivs
                              .filter(p => privilegeIds.includes(p.id))
                              .sort((a, b) => a.role.localeCompare(b.role));

                            return (
                              <div key={funcKey}>
                                {/* Function Header */}
                                <button
                                  onClick={() => toggleFunction(funcKey)}
                                  className="w-full flex items-center gap-2 p-2 pl-10 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition-colors text-left"
                                  data-testid={`toggle-function-${funcKey}`}
                                >
                                  {isFuncExpanded ? <ChevronDown className="h-3 w-3 text-violet-600" /> : <ChevronRight className="h-3 w-3 text-violet-600" />}
                                  <span className="text-sm text-muted-foreground">{funcName}</span>
                                  <span className="text-xs text-violet-600/70 dark:text-violet-400/70">({funcAssignedCount}/{funcPrivs.length})</span>
                                </button>

                                {/* Roles - only show assigned roles */}
                                {isFuncExpanded && (
                                  <div className="pl-14 pr-3 pb-2 space-y-1">
                                    {assignedRoles.map(priv => (
                                      <label 
                                        key={priv.id} 
                                        className="flex items-start gap-2 p-1.5 rounded"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={true}
                                          disabled
                                          className="rounded border-gray-300 mt-0.5"
                                          data-testid={`checkbox-current-${company.id}-${priv.id}`}
                                        />
                                        <span className="text-sm">{priv.role}</span>
                                        <span className="text-xs text-green-600 dark:text-green-400">({t.assigned})</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [actingUserId, setActingUserId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(""); // Company Context for editing
  const [searchQuery, setSearchQuery] = useState("");
  
  // Inline editor state
  const [editorModule, setEditorModule] = useState<string>("");
  const [editorFunction, setEditorFunction] = useState<string>("");
  const [roleSelections, setRoleSelections] = useState<Record<string, boolean>>({});
  const [isAddRemoveExpanded, setIsAddRemoveExpanded] = useState(true);

  const { data, isLoading, error } = useBootstrapData();
  const applyAssignments = useApplyAssignments();
  const { toast } = useToast();

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  // Only show managers in the Act-as dropdown
  const managers = useMemo(() => 
    data?.employees.filter(e => e.isManager) || [],
    [data]
  );

  // Auto-select first manager
  useEffect(() => {
    if (data && !actingUserId && managers.length > 0) {
      setActingUserId(managers[0].id);
    }
  }, [data, actingUserId, managers]);

  const actingUser = useMemo(() => 
    data?.employees.find(e => e.id === actingUserId), 
    [data, actingUserId]
  );

  // Get manager's legal company
  const managerLegalCompany = useMemo(() => {
    if (!data || !actingUser) return undefined;
    return data.companies.find(c => c.id === actingUser.legalCompanyId);
  }, [data, actingUser]);

  // Get legal employees (employees managed by this manager with same legal company)
  const legalEmployees = useMemo(() => {
    if (!data || !actingUser) return [];
    return data.employees.filter(e => 
      e.managerId === actingUserId && 
      e.legalCompanyId === actingUser.legalCompanyId
    );
  }, [data, actingUser, actingUserId]);

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return legalEmployees;
    const q = searchQuery.toLowerCase();
    return legalEmployees.filter(emp => 
      emp.id.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q)
    );
  }, [legalEmployees, searchQuery]);

  // Auto-select first employee when manager changes
  useEffect(() => {
    if (data && actingUserId && legalEmployees.length > 0) {
      if (!selectedEmployeeId || !legalEmployees.find(e => e.id === selectedEmployeeId)) {
        setSelectedEmployeeId(legalEmployees[0].id);
      }
    } else if (legalEmployees.length === 0) {
      setSelectedEmployeeId("");
    }
  }, [data, actingUserId, legalEmployees, selectedEmployeeId]);

  // All companies for Company Context dropdown
  const allCompanies = useMemo(() => data?.companies || [], [data]);

  // Auto-select first company as context
  useEffect(() => {
    if (data && allCompanies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(allCompanies[0].id);
    }
  }, [data, allCompanies, selectedCompanyId]);

  const selectedEmployee = useMemo(() => 
    data?.employees.find(e => e.id === selectedEmployeeId),
    [data, selectedEmployeeId]
  );

  const selectedCompany = useMemo(() =>
    data?.companies.find(c => c.id === selectedCompanyId),
    [data, selectedCompanyId]
  );

  // Get employee's legal company
  const employeeLegalCompany = useMemo(() => {
    if (!data || !selectedEmployee) return undefined;
    return data.companies.find(c => c.id === selectedEmployee.legalCompanyId);
  }, [data, selectedEmployee]);

  // Get all assignments for selected employee across ALL companies
  const employeeAssignmentsWithCompanies = useMemo(() => {
    if (!data || !selectedEmployeeId) return [];
    
    const result: { company: Company; privilegeIds: string[] }[] = [];
    
    for (const company of data.companies) {
      const assignment = data.assignments.find(
        a => a.companyId === company.id && a.employeeId === selectedEmployeeId
      );
      if (assignment && assignment.privilegeIds.length > 0) {
        result.push({
          company,
          privilegeIds: assignment.privilegeIds
        });
      }
    }
    
    return result.sort((a, b) => a.company.name.localeCompare(b.company.name));
  }, [data, selectedEmployeeId]);

  // Get current assignment for selected employee + selected company context (for editing)
  const currentAssignment = useMemo(() => {
    if (!data || !selectedCompanyId || !selectedEmployeeId) return undefined;
    return data.assignments.find(
      a => a.companyId === selectedCompanyId && a.employeeId === selectedEmployeeId
    );
  }, [data, selectedCompanyId, selectedEmployeeId]);

  const currentPrivileges = currentAssignment?.privilegeIds || [];

  // Unique modules from all privileges
  const uniqueModules = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.privileges.map(p => p.module))).sort();
  }, [data]);

  // Editor: functions filtered by selected module
  const functionsForModule = useMemo(() => {
    if (!data || !editorModule) return [];
    return Array.from(new Set(
      data.privileges.filter(p => p.module === editorModule).map(p => p.function)
    )).sort();
  }, [data, editorModule]);

  // Editor: roles for selected module + function, sorted: assigned first, then unassigned
  const rolesForFunction = useMemo(() => {
    if (!data || !editorModule || !editorFunction) return [];
    const roles = data.privileges.filter(p => p.module === editorModule && p.function === editorFunction);
    
    // Sort: assigned first, then alphabetically within each group
    return roles.sort((a, b) => {
      const aAssigned = currentPrivileges.includes(a.id);
      const bAssigned = currentPrivileges.includes(b.id);
      if (aAssigned && !bAssigned) return -1;
      if (!aAssigned && bAssigned) return 1;
      return a.role.localeCompare(b.role);
    });
  }, [data, editorModule, editorFunction, currentPrivileges]);

  // When function is selected, initialize all checkboxes to checked
  useEffect(() => {
    if (editorFunction && rolesForFunction.length > 0) {
      const selections: Record<string, boolean> = {};
      for (const priv of rolesForFunction) {
        selections[priv.id] = true;
      }
      setRoleSelections(selections);
    }
  }, [editorFunction, rolesForFunction]);

  // Reset editor when employee/company changes
  useEffect(() => {
    setEditorModule("");
    setEditorFunction("");
    setRoleSelections({});
  }, [selectedEmployeeId, selectedCompanyId]);

  const handleApplyChanges = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) return;

    // Calculate new privileges
    const newPrivileges = new Set(currentPrivileges);
    
    for (const [privId, isChecked] of Object.entries(roleSelections)) {
      if (isChecked) {
        newPrivileges.add(privId);
      } else {
        newPrivileges.delete(privId);
      }
    }

    try {
      await applyAssignments.mutateAsync({
        actorId: actingUserId,
        companyId: selectedCompanyId,
        targetEmployeeId: selectedEmployeeId,
        privilegeIds: Array.from(newPrivileges),
      });
      toast({ title: "Changes applied successfully" });
      // Reset editor after successful apply
      setEditorModule("");
      setEditorFunction("");
      setRoleSelections({});
    } catch (err) {
      toast({ 
        title: "Failed to apply changes", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
        <div className="rounded-2xl bg-destructive/5 p-8 text-center border border-destructive/20">
          <h2 className="text-xl font-bold">Failed to load data</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-800 dark:to-blue-700 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl text-white">{t.title}</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Act As Dropdown - Managers Only */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <span className="text-sm text-white/80">{t.actAs}:</span>
              <select
                value={actingUserId}
                onChange={(e) => {
                  setActingUserId(e.target.value);
                  setSelectedEmployeeId("");
                  setSelectedCompanyId("");
                }}
                className="rounded-lg border border-white/30 bg-white/20 text-white px-3 py-1.5 text-sm font-medium backdrop-blur-sm"
                data-testid="select-act-as"
              >
                {managers.map(emp => (
                  <option key={emp.id} value={emp.id} className="text-foreground bg-background">
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/20"
              data-testid="button-language-toggle"
            >
              <Globe className="h-4 w-4" />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Manager Details Card */}
        {actingUser && (
          <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">{t.managerDetails}</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {actingUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{actingUser.name}</p>
                  <p className="text-sm text-muted-foreground">{actingUser.title}</p>
                </div>
              </div>
              <div className="h-10 w-px bg-indigo-200 dark:bg-indigo-700 hidden sm:block" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t.legalCompany}</span>
                </div>
                <span className="inline-flex items-center rounded-md bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {managerLegalCompany?.name || "N/A"}
                </span>
              </div>
            </div>

            {/* Employee Selector */}
            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t.legalEmployees}
                  </label>
                  {legalEmployees.length > 0 ? (
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-employee"
                    >
                      {filteredEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.id} - {emp.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">{t.noLegalEmployees}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t.search}</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.search}
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm"
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Details Card */}
        {selectedEmployee && (
          <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">{t.employeeDetails}</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.title} - {selectedEmployee.email}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-700 hidden sm:block" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t.legalCompany}</span>
                </div>
                <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {employeeLegalCompany?.name || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Add / Remove Privileges (Full Width) - with Company Context inside */}
        {selectedEmployee && (
          <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-4 shadow-sm">
            <button
              onClick={() => setIsAddRemoveExpanded(!isAddRemoveExpanded)}
              className="w-full flex items-center justify-between mb-2"
              data-testid="toggle-add-remove"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300">{t.addRemove}</h3>
              </div>
              {isAddRemoveExpanded ? <ChevronDown className="h-5 w-5 text-amber-600" /> : <ChevronRight className="h-5 w-5 text-amber-600" />}
            </button>

            {isAddRemoveExpanded && (
              <div className="space-y-4 pt-2">
              {/* Company Context - Inside Add/Remove */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {t.companyContext}
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-company-context"
                  >
                    {allCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">{t.module}</label>
                  <select
                    value={editorModule}
                    onChange={(e) => {
                      setEditorModule(e.target.value);
                      setEditorFunction("");
                      setRoleSelections({});
                    }}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-editor-module"
                  >
                    <option value="">{t.selectModule}</option>
                    {uniqueModules.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">{t.function}</label>
                  <select
                    value={editorFunction}
                    onChange={(e) => setEditorFunction(e.target.value)}
                    disabled={!editorModule}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    data-testid="select-editor-function"
                  >
                    <option value="">{t.selectFunction}</option>
                    {functionsForModule.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Checkboxes */}
              {editorFunction && rolesForFunction.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">{t.role}</label>
                    <span className="text-xs text-muted-foreground">{t.allRolesSelected}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border rounded-lg p-3 bg-muted/20 max-h-80 overflow-y-auto">
                    {rolesForFunction.map(priv => {
                      const isCurrentlyAssigned = currentPrivileges.includes(priv.id);
                      const isChecked = roleSelections[priv.id] ?? false;
                      
                      return (
                        <label 
                          key={priv.id} 
                          className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setRoleSelections(prev => ({
                                ...prev,
                                [priv.id]: e.target.checked
                              }));
                            }}
                            className="rounded border-gray-300 mt-0.5"
                            data-testid={`checkbox-role-${priv.id}`}
                          />
                          <div className="flex-1">
                            <span className="text-sm">{priv.role}</span>
                            {isCurrentlyAssigned && (
                              <span className="ml-1 text-xs text-green-600 dark:text-green-400">({t.assigned})</span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guidance Text */}
              {!editorModule && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/10">{t.selectModuleFirst}</p>
              )}
              {editorModule && !editorFunction && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/10">{t.selectFunctionFirst}</p>
              )}

              {/* Apply Button */}
              {editorFunction && (
                <button
                  onClick={handleApplyChanges}
                  disabled={applyAssignments.isPending}
                  className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-sm font-medium disabled:opacity-50"
                  data-testid="button-apply-changes"
                >
                  {applyAssignments.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.applying}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {t.applyChanges}
                    </>
                  )}
                </button>
              )}
            </div>
            )}
          </div>
        )}

        {/* Current Privilege - Multi-company hierarchical view */}
        {selectedEmployee && (
          <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-lg font-semibold text-violet-700 dark:text-violet-300">{t.currentPrivilege}</h3>
              <span className="text-sm text-violet-600/70 dark:text-violet-400/70">
                ({employeeAssignmentsWithCompanies.length} {employeeAssignmentsWithCompanies.length === 1 ? 'company' : 'companies'})
              </span>
            </div>

            <ExpandableHierarchy
              allPrivileges={data.privileges}
              companyAssignments={employeeAssignmentsWithCompanies}
              t={t}
            />
          </div>
        )}
      </main>
    </div>
  );
}
