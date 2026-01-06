import { useState, useMemo, useEffect } from "react";
import { useBootstrapData, useApplyAssignments, useUploadCatalog } from "@/hooks/use-app-data";
import { 
  Loader2, Search, Globe, Download, Building2, Users, ShieldCheck,
  Plus, Minus, X, Check, Upload, ChevronDown
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
    addRemove: "Add/Remove",
    applyChanges: "Apply Changes",
    cancel: "Cancel",
    export: "Export",
    exportCompany: "Export (This Company)",
    exportAll: "Export (All Companies)",
    managerDetails: "Manager Details",
    accessibleCompanies: "Accessible Companies",
    noAccess: "No companies accessible",
    selectModule: "Select Module",
    selectFunction: "Select Function",
    noPrivileges: "No privileges assigned",
    uploadData: "Upload Data",
    uploadCatalog: "Upload Catalog (CSV)",
    uploading: "Uploading...",
    uploadSuccess: "Catalog uploaded successfully",
    allRolesSelected: "All roles selected by default",
    employeeDetails: "Employee Details",
    companyContext: "Company Context",
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
    addRemove: "إضافة/إزالة",
    applyChanges: "تطبيق التغييرات",
    cancel: "إلغاء",
    export: "تصدير",
    exportCompany: "تصدير (هذه الشركة)",
    exportAll: "تصدير (جميع الشركات)",
    managerDetails: "تفاصيل المدير",
    accessibleCompanies: "الشركات المتاحة",
    noAccess: "لا توجد شركات متاحة",
    selectModule: "اختر الوحدة",
    selectFunction: "اختر الوظيفة",
    noPrivileges: "لا توجد امتيازات مخصصة",
    uploadData: "تحميل البيانات",
    uploadCatalog: "تحميل الكتالوج (CSV)",
    uploading: "جاري التحميل...",
    uploadSuccess: "تم تحميل الكتالوج بنجاح",
    allRolesSelected: "جميع الأدوار محددة افتراضياً",
    employeeDetails: "تفاصيل الموظف",
    companyContext: "سياق الشركة",
  }
};

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [actingUserId, setActingUserId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddRemoveModal, setShowAddRemoveModal] = useState(false);
  const [modalModule, setModalModule] = useState<string>("");
  const [modalFunction, setModalFunction] = useState<string>("");
  const [modalRoleSelections, setModalRoleSelections] = useState<Record<string, boolean>>({});
  const [showUploadSection, setShowUploadSection] = useState(false);

  const { data, isLoading, error } = useBootstrapData();
  const applyAssignments = useApplyAssignments();
  const uploadCatalog = useUploadCatalog();
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

  // Overlapping companies: both manager has access AND employee belongs to
  const contextCompanies = useMemo(() => {
    return accessibleCompanies.filter(c => employeeCompanyMembership.includes(c.id));
  }, [accessibleCompanies, employeeCompanyMembership]);

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

  // Modal: unique modules
  const uniqueModules = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.privileges.map(p => p.module))).sort();
  }, [data]);

  // Modal: functions filtered by selected module
  const functionsForModule = useMemo(() => {
    if (!data || !modalModule) return [];
    return Array.from(new Set(
      data.privileges.filter(p => p.module === modalModule).map(p => p.function)
    )).sort();
  }, [data, modalModule]);

  // Modal: roles for selected module + function
  const rolesForFunction = useMemo(() => {
    if (!data || !modalModule || !modalFunction) return [];
    return data.privileges.filter(p => p.module === modalModule && p.function === modalFunction);
  }, [data, modalModule, modalFunction]);

  // When function is selected, initialize all checkboxes to checked (per requirements)
  // "All checkboxes are checked by default (meaning add the function with its default roles)"
  // Manager can uncheck to NOT add, or to remove if currently assigned
  useEffect(() => {
    if (modalFunction && rolesForFunction.length > 0) {
      const selections: Record<string, boolean> = {};
      for (const priv of rolesForFunction) {
        // All roles default to checked per requirements
        selections[priv.id] = true;
      }
      setModalRoleSelections(selections);
    }
  }, [modalFunction, rolesForFunction]);

  const handleOpenAddRemoveModal = () => {
    setModalModule("");
    setModalFunction("");
    setModalRoleSelections({});
    setShowAddRemoveModal(true);
  };

  const handleApplyChanges = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) return;

    // Calculate new privileges
    const newPrivileges = new Set(currentPrivileges);
    
    for (const [privId, isChecked] of Object.entries(modalRoleSelections)) {
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
      setShowAddRemoveModal(false);
    } catch (err) {
      toast({ 
        title: "Failed to apply changes", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const handleExport = (scope: "company" | "all") => {
    if (!selectedEmployeeId) return;
    const url = `/api/export/employee?employeeId=${selectedEmployeeId}&scope=${scope}${scope === "company" ? `&companyId=${selectedCompanyId}` : ""}`;
    window.location.href = url;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    
    // Skip header row if present
    const startIdx = lines[0]?.toLowerCase().includes("module") ? 1 : 0;
    
    const catalog: { module: string; function: string; role: string }[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length >= 3) {
        catalog.push({
          module: parts[0],
          function: parts[1],
          role: parts[2],
        });
      }
    }

    if (catalog.length === 0) {
      toast({ title: "No valid data found in file", variant: "destructive" });
      return;
    }

    try {
      await uploadCatalog.mutateAsync({
        actorId: actingUserId,
        catalog,
      });
      toast({ title: t.uploadSuccess });
    } catch (err) {
      toast({ 
        title: "Failed to upload catalog", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
    
    // Reset input
    e.target.value = "";
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
      {/* Section A: Act as Manager (Highlighted) */}
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
        {/* Section B: Manager Details (Highlighted Card) */}
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

                {/* Employee Dropdown with Company Badge */}
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

        {/* Section C: Employee Details (Card) */}
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

              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("company")}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  data-testid="button-export-company"
                >
                  <Download className="h-4 w-4" />
                  {t.exportCompany}
                </button>
                <button
                  onClick={() => handleExport("all")}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  data-testid="button-export-all"
                >
                  <Download className="h-4 w-4" />
                  {t.exportAll}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section D: Privileges (Card) */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              {t.privileges}
            </h3>
            <button
              onClick={handleOpenAddRemoveModal}
              disabled={!selectedEmployeeId || !selectedCompanyId}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-add-remove"
            >
              <Plus className="h-4 w-4" />
              <Minus className="h-4 w-4" />
              {t.addRemove}
            </button>
          </div>

          {/* Privileges Table */}
          {assignedPrivilegeDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium">{t.module}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.function}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.role}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedPrivilegeDetails.map(priv => (
                    <tr key={priv.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium">
                          {priv.module}
                        </span>
                      </td>
                      <td className="px-4 py-2">{priv.function}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                          {priv.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>{t.noPrivileges}</p>
            </div>
          )}
        </div>

        {/* Upload Data Section (Collapsible) */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <button
            onClick={() => setShowUploadSection(!showUploadSection)}
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-upload"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t.uploadData}
            </h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${showUploadSection ? "rotate-180" : ""}`} />
          </button>
          
          {showUploadSection && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Upload a CSV file with columns: module, function, role
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <span className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  {uploadCatalog.isPending ? t.uploading : t.uploadCatalog}
                </span>
              </label>
            </div>
          )}
        </div>
      </main>

      {/* Add/Remove Modal */}
      {showAddRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 to-blue-500 rounded-t-xl px-4 py-3">
              <h3 className="font-semibold text-white">{t.addRemove}</h3>
              <button
                onClick={() => setShowAddRemoveModal(false)}
                className="text-white/80 hover:text-white"
                data-testid="button-close-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Module Dropdown */}
              <div>
                <label className="text-sm font-medium">{t.module}</label>
                <select
                  value={modalModule}
                  onChange={(e) => {
                    setModalModule(e.target.value);
                    setModalFunction("");
                    setModalRoleSelections({});
                  }}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  data-testid="select-modal-module"
                >
                  <option value="">{t.selectModule}</option>
                  {uniqueModules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Function Dropdown (filtered by module) */}
              {modalModule && (
                <div>
                  <label className="text-sm font-medium">{t.function}</label>
                  <select
                    value={modalFunction}
                    onChange={(e) => setModalFunction(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-modal-function"
                  >
                    <option value="">{t.selectFunction}</option>
                    {functionsForModule.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role Checkboxes */}
              {modalFunction && rolesForFunction.length > 0 && (
                <div>
                  <label className="text-sm font-medium block mb-2">{t.role}</label>
                  <p className="text-xs text-muted-foreground mb-2">{t.allRolesSelected}</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    {rolesForFunction.map(priv => {
                      const isCurrentlyAssigned = currentPrivileges.includes(priv.id);
                      const isChecked = modalRoleSelections[priv.id] ?? false;
                      
                      return (
                        <label 
                          key={priv.id} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setModalRoleSelections(prev => ({
                                ...prev,
                                [priv.id]: e.target.checked
                              }));
                            }}
                            className="rounded border-gray-300"
                            data-testid={`checkbox-role-${priv.id}`}
                          />
                          <span className="text-sm">{priv.role}</span>
                          {isCurrentlyAssigned && (
                            <span className="text-xs text-green-600 dark:text-green-400">(currently assigned)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => setShowAddRemoveModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                  data-testid="button-modal-cancel"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleApplyChanges}
                  disabled={!modalFunction || applyAssignments.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                  data-testid="button-modal-apply"
                >
                  {applyAssignments.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t.applyChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
