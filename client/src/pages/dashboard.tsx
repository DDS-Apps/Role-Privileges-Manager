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
    assigned: "Assigned",
    addRemove: "Add / Remove Privileges",
    applyChanges: "Apply Changes",
    cancel: "Cancel",
    managerDetails: "Manager Details",
    accessibleCompanies: "Accessible Companies",
    noAccess: "No companies accessible",
    selectModule: "Select Module",
    selectFunction: "Select Function",
    noPrivileges: "No privileges assigned",
    allRolesSelected: "All roles selected by default. Uncheck to remove.",
    employeeDetails: "Employee Details",
    companyContext: "Company Context",
    currentAssignments: "Current Assignments",
    editPrivileges: "Edit Privileges",
    selectModuleFirst: "Select a module to see functions",
    selectFunctionFirst: "Select a function to see roles",
    applying: "Applying...",
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
    accessibleCompanies: "الشركات المتاحة",
    noAccess: "لا توجد شركات متاحة",
    selectModule: "اختر الوحدة",
    selectFunction: "اختر الوظيفة",
    noPrivileges: "لا توجد امتيازات مخصصة",
    allRolesSelected: "جميع الأدوار محددة افتراضياً. ألغِ التحديد للإزالة.",
    employeeDetails: "تفاصيل الموظف",
    companyContext: "سياق الشركة",
    currentAssignments: "التخصيصات الحالية",
    editPrivileges: "تعديل الامتيازات",
    selectModuleFirst: "اختر وحدة لرؤية الوظائف",
    selectFunctionFirst: "اختر وظيفة لرؤية الأدوار",
    applying: "جاري التطبيق...",
  }
};

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [actingUserId, setActingUserId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Inline editor state
  const [editorModule, setEditorModule] = useState<string>("");
  const [editorFunction, setEditorFunction] = useState<string>("");
  const [roleSelections, setRoleSelections] = useState<Record<string, boolean>>({});
  const [showEditor, setShowEditor] = useState(false);

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

  const managerCompanies = useMemo(() => {
    if (!data || !actingUser) return [];
    const access = data.managerAccess.find(m => m.managerId === actingUserId);
    return access?.companyIds || [];
  }, [data, actingUser, actingUserId]);

  const accessibleCompanies = useMemo(() => 
    data?.companies.filter(c => managerCompanies.includes(c.id)) || [],
    [data, managerCompanies]
  );

  // Auto-select first company
  useEffect(() => {
    if (data && !selectedCompanyId && accessibleCompanies.length > 0) {
      setSelectedCompanyId(accessibleCompanies[0].id);
    }
  }, [data, selectedCompanyId, accessibleCompanies]);

  // Reset company selection when manager changes
  useEffect(() => {
    if (actingUserId && accessibleCompanies.length > 0) {
      if (!accessibleCompanies.find(c => c.id === selectedCompanyId)) {
        setSelectedCompanyId(accessibleCompanies[0].id);
        setSelectedEmployeeId("");
      }
    }
  }, [actingUserId, accessibleCompanies, selectedCompanyId]);

  const employeesInSelectedCompany = useMemo(() => {
    if (!data || !selectedCompanyId) return [];
    return data.employees.filter(emp => {
      const membership = data.employeeMembership.find(m => m.employeeId === emp.id);
      return membership?.companyIds.includes(selectedCompanyId);
    });
  }, [data, selectedCompanyId]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employeesInSelectedCompany;
    const q = searchQuery.toLowerCase();
    return employeesInSelectedCompany.filter(emp => 
      emp.id.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q)
    );
  }, [employeesInSelectedCompany, searchQuery]);

  // Auto-select first employee
  useEffect(() => {
    if (data && selectedCompanyId && !selectedEmployeeId && filteredEmployees.length > 0) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [data, selectedCompanyId, selectedEmployeeId, filteredEmployees]);

  // Reset employee when not in filtered list
  useEffect(() => {
    if (selectedEmployeeId && filteredEmployees.length > 0) {
      if (!filteredEmployees.find(e => e.id === selectedEmployeeId)) {
        setSelectedEmployeeId(filteredEmployees[0].id);
      }
    }
  }, [selectedEmployeeId, filteredEmployees]);

  const selectedEmployee = useMemo(() => 
    data?.employees.find(e => e.id === selectedEmployeeId),
    [data, selectedEmployeeId]
  );

  // Get employee's company membership for context dropdown
  const employeeCompanyMembership = useMemo(() => {
    if (!data || !selectedEmployeeId) return [];
    const membership = data.employeeMembership.find(m => m.employeeId === selectedEmployeeId);
    return membership?.companyIds || [];
  }, [data, selectedEmployeeId]);

  // All companies the employee belongs to (for display in context dropdown)
  const contextCompanies = useMemo(() => {
    if (!data) return [];
    return data.companies.filter(c => employeeCompanyMembership.includes(c.id));
  }, [data, employeeCompanyMembership]);

  const currentAssignment = useMemo(() => {
    if (!data || !selectedCompanyId || !selectedEmployeeId) return undefined;
    return data.assignments.find(
      a => a.companyId === selectedCompanyId && a.employeeId === selectedEmployeeId
    );
  }, [data, selectedCompanyId, selectedEmployeeId]);

  const currentPrivileges = currentAssignment?.privilegeIds || [];

  // Get assigned privilege details
  const assignedPrivilegeDetails = useMemo(() => {
    if (!data) return [];
    return data.privileges.filter(p => currentPrivileges.includes(p.id));
  }, [data, currentPrivileges]);

  // Group assigned privileges by module/function
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, Record<string, Privilege[]>> = {};
    for (const priv of assignedPrivilegeDetails) {
      if (!groups[priv.module]) groups[priv.module] = {};
      if (!groups[priv.module][priv.function]) groups[priv.module][priv.function] = [];
      groups[priv.module][priv.function].push(priv);
    }
    return groups;
  }, [assignedPrivilegeDetails]);

  // Editor: unique modules
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

  // Editor: roles for selected module + function
  const rolesForFunction = useMemo(() => {
    if (!data || !editorModule || !editorFunction) return [];
    return data.privileges.filter(p => p.module === editorModule && p.function === editorFunction);
  }, [data, editorModule, editorFunction]);

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
                  setSelectedCompanyId("");
                  setSelectedEmployeeId("");
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
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t.accessibleCompanies}</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-1">
                  {accessibleCompanies.length > 0 ? accessibleCompanies.map(c => (
                    <span key={c.id} className="inline-flex items-center rounded-md bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {c.name}
                    </span>
                  )) : <span className="text-xs text-muted-foreground">{t.noAccess}</span>}
                </div>
              </div>
            </div>

            {/* Employee Selector */}
            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Company Dropdown */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {t.company}
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      setSelectedEmployeeId("");
                    }}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-company"
                  >
                    {accessibleCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Employee Dropdown */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t.employee}
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-employee"
                  >
                    {filteredEmployees.map(emp => {
                      const membership = data.employeeMembership.find(m => m.employeeId === emp.id);
                      const companyCount = membership?.companyIds.length || 0;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.id} - {emp.name} {companyCount > 1 ? `(${companyCount} companies)` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Search */}
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
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.employeeDetails}</h3>
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.title} - {selectedEmployee.email}</p>
                </div>
              </div>
              
              {/* Company Context Dropdown (if employee in multiple companies) */}
              {contextCompanies.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t.companyContext}:</span>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                    data-testid="select-company-context"
                  >
                    {contextCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privileges Card with Inline Editor */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              {t.privileges}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Current Assignments */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{t.currentAssignments}</h4>
              {assignedPrivilegeDetails.length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(groupedAssignments).map(([module, functions]) => (
                    <div key={module} className="border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium text-sm mb-2 flex items-center gap-1">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium">
                          {module}
                        </span>
                      </div>
                      {Object.entries(functions).map(([func, roles]) => (
                        <div key={func} className="ml-4 mb-2">
                          <div className="text-sm text-muted-foreground mb-1">{func}</div>
                          <div className="flex flex-wrap gap-1 ml-2">
                            {roles.map(role => (
                              <span 
                                key={role.id} 
                                className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                              >
                                {role.role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t.noPrivileges}</p>
                </div>
              )}
            </div>

            {/* Right: Inline Editor */}
            <div className="border-l-0 lg:border-l lg:pl-6">
              <div 
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => setShowEditor(!showEditor)}
                data-testid="toggle-editor"
              >
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <Minus className="h-4 w-4" />
                  {t.addRemove}
                </h4>
                {showEditor ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {showEditor && selectedEmployeeId && selectedCompanyId && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  {/* Module Dropdown */}
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

                  {/* Function Dropdown */}
                  {editorModule && (
                    <div>
                      <label className="text-sm font-medium">{t.function}</label>
                      <select
                        value={editorFunction}
                        onChange={(e) => setEditorFunction(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-editor-function"
                      >
                        <option value="">{t.selectFunction}</option>
                        {functionsForModule.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Role Checkboxes */}
                  {editorFunction && rolesForFunction.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-1">{t.role}</label>
                      <p className="text-xs text-muted-foreground mb-2">{t.allRolesSelected}</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-background">
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
                                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">(assigned)</span>
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
                    <p className="text-sm text-muted-foreground text-center py-4">{t.selectModuleFirst}</p>
                  )}
                  {editorModule && !editorFunction && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.selectFunctionFirst}</p>
                  )}

                  {/* Apply Button */}
                  {editorFunction && (
                    <button
                      onClick={handleApplyChanges}
                      disabled={applyAssignments.isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
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

              {!showEditor && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/10">
                  Click above to expand the privilege editor
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
