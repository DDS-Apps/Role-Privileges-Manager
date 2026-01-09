import { useState, useMemo, useEffect } from "react";
import { useBootstrapData, useCreateRequest, useRequests } from "@/hooks/use-app-data";
import { 
  Loader2, Search, Globe, Building2, Users, ShieldCheck,
  Plus, Check, ChevronDown, ChevronRight, Calendar, Clock, FileText, Settings
} from "lucide-react";
import { Link } from "wouter";
import type { Employee, Company, Privilege, PrivilegeRequest, RequestStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    all: "All",
    selectAll: "Select All",
    unselectAll: "Unselect All",
    companyEmployees: "Company Employees",
    allEmployees: "All Employees",
    submitRequest: "Submit Request",
    submitting: "Submitting...",
    startDate: "Start Date",
    endDate: "End Date (Optional)",
    myRequests: "My Requests",
    pending: "Pending",
    active: "Active",
    rejected: "Rejected",
    noRequests: "No requests found",
    requestCreated: "Request submitted successfully",
    adminPanel: "Admin Panel",
    noEndDate: "No end date",
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
    all: "الكل",
    selectAll: "تحديد الكل",
    unselectAll: "إلغاء تحديد الكل",
    companyEmployees: "موظفي الشركة",
    allEmployees: "جميع الموظفين",
    submitRequest: "تقديم الطلب",
    submitting: "جاري التقديم...",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء (اختياري)",
    myRequests: "طلباتي",
    pending: "قيد الانتظار",
    active: "نشط",
    rejected: "مرفوض",
    noRequests: "لم يتم العثور على طلبات",
    requestCreated: "تم تقديم الطلب بنجاح",
    adminPanel: "لوحة الإدارة",
    noEndDate: "لا يوجد تاريخ انتهاء",
  }
};

// Expandable hierarchy component for Current Privilege
function ExpandableHierarchy({ 
  allPrivileges, 
  companyAssignments,
  activeRequests,
  t 
}: { 
  allPrivileges: Privilege[];
  companyAssignments: { company: Company; privilegeIds: string[] }[];
  activeRequests: PrivilegeRequest[];
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
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-slate-100/50 dark:bg-slate-900/20">
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
          <div key={company.id} className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-950/30 overflow-hidden">
            {/* Company Header */}
            <button
              onClick={() => toggleCompany(company.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
              data-testid={`toggle-company-${company.id}`}
            >
              <div className="flex items-center gap-2">
                {isCompanyExpanded ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-indigo-600" />}
                <Building2 className="h-4 w-4 text-indigo-500" />
                <span className="font-medium">{company.name}</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {assignedCount} {t.rolesAssigned}
              </span>
            </button>

            {/* Modules - show modules with assigned roles */}
            {isCompanyExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700">
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
                    <div key={moduleKey} className="border-t border-slate-200 dark:border-slate-700 first:border-t-0">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(moduleKey)}
                        className="w-full flex items-center gap-2 p-2 pl-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors text-left"
                        data-testid={`toggle-module-${moduleKey}`}
                      >
                        {isModuleExpanded ? <ChevronDown className="h-3 w-3 text-indigo-600" /> : <ChevronRight className="h-3 w-3 text-indigo-600" />}
                        <span className="inline-flex items-center rounded-md bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                          {moduleName}
                        </span>
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

                            // Split into assigned and unassigned roles, sorted alphabetically
                            const assignedRoles = funcPrivs
                              .filter(p => privilegeIds.includes(p.id))
                              .sort((a, b) => a.role.localeCompare(b.role));
                            const unassignedRoles = funcPrivs
                              .filter(p => !privilegeIds.includes(p.id))
                              .sort((a, b) => a.role.localeCompare(b.role));

                            // Find active request for this function/company to get dates
                            const matchingRequest = activeRequests.find(
                              r => r.companyId === company.id && r.module === moduleName && r.function === funcName
                            );

                            return (
                              <div key={funcKey}>
                                {/* Function Header */}
                                <button
                                  onClick={() => toggleFunction(funcKey)}
                                  className="w-full flex items-center gap-2 p-2 pl-10 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors text-left"
                                  data-testid={`toggle-function-${funcKey}`}
                                >
                                  {isFuncExpanded ? <ChevronDown className="h-3 w-3 text-indigo-600" /> : <ChevronRight className="h-3 w-3 text-indigo-600" />}
                                  <span className="text-sm text-muted-foreground">{funcName}</span>
                                  <span className="text-xs text-slate-600/70 dark:text-slate-400/70">({funcAssignedCount}/{funcPrivs.length})</span>
                                  {matchingRequest && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-2">
                                      {matchingRequest.startDate} - {matchingRequest.endDate || t.noEndDate}
                                    </span>
                                  )}
                                </button>

                                {/* Roles - show assigned first, then unassigned */}
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
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400">({t.assigned})</span>
                                      </label>
                                    ))}
                                    {unassignedRoles.map(priv => (
                                      <label 
                                        key={priv.id} 
                                        className="flex items-start gap-2 p-1.5 rounded opacity-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={false}
                                          disabled
                                          className="rounded border-gray-300 mt-0.5"
                                          data-testid={`checkbox-current-unassigned-${company.id}-${priv.id}`}
                                        />
                                        <span className="text-sm text-muted-foreground">{priv.role}</span>
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
  const [companyEmployeesOnly, setCompanyEmployeesOnly] = useState(true); // "Company Employees" checkbox
  
  // Inline editor state
  const [editorModule, setEditorModule] = useState<string>("");
  const [editorFunction, setEditorFunction] = useState<string>("");
  const [roleSelections, setRoleSelections] = useState<Record<string, boolean>>({});
  const [isAddRemoveExpanded, setIsAddRemoveExpanded] = useState(false);
  
  // Request form state
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [requestTab, setRequestTab] = useState<"pending" | "active" | "rejected">("pending");

  const { data, isLoading, error } = useBootstrapData();
  const createRequest = useCreateRequest();
  const { data: requests = [] } = useRequests({ managerId: actingUserId });
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

  // Get employees based on "Company Employees" checkbox
  // If checked: show only employees from manager's legal company
  // If unchecked: show ALL organization employees
  const availableEmployees = useMemo(() => {
    if (!data || !actingUser) return [];
    
    if (companyEmployeesOnly) {
      // Only employees from manager's legal company
      return data.employees.filter(e => 
        !e.isManager && e.legalCompanyId === actingUser.legalCompanyId
      );
    } else {
      // All non-manager employees
      return data.employees.filter(e => !e.isManager);
    }
  }, [data, actingUser, companyEmployeesOnly]);

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return availableEmployees;
    const q = searchQuery.toLowerCase();
    return availableEmployees.filter(emp => 
      emp.id.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q)
    );
  }, [availableEmployees, searchQuery]);

  // Auto-select first employee when manager changes
  useEffect(() => {
    if (data && actingUserId && availableEmployees.length > 0) {
      if (!selectedEmployeeId || !availableEmployees.find(e => e.id === selectedEmployeeId)) {
        setSelectedEmployeeId(availableEmployees[0].id);
      }
    } else if (availableEmployees.length === 0) {
      setSelectedEmployeeId("");
    }
  }, [data, actingUserId, availableEmployees, selectedEmployeeId]);

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

  // Editor: roles for selected module + function (or all functions if "All" selected)
  const rolesForFunction = useMemo(() => {
    if (!data || !editorModule || !editorFunction) return [];
    
    // If "All" is selected, show all roles from all functions in the module
    const roles = editorFunction === "__all__" 
      ? data.privileges.filter(p => p.module === editorModule)
      : data.privileges.filter(p => p.module === editorModule && p.function === editorFunction);
    
    // Sort: assigned first, then alphabetically within each group
    return roles.sort((a, b) => {
      const aAssigned = currentPrivileges.includes(a.id);
      const bAssigned = currentPrivileges.includes(b.id);
      if (aAssigned && !bAssigned) return -1;
      if (!aAssigned && bAssigned) return 1;
      return a.role.localeCompare(b.role);
    });
  }, [data, editorModule, editorFunction, currentPrivileges]);

  // When function is selected, initialize all checkboxes to selected by default
  useEffect(() => {
    if (editorFunction && data) {
      const roles = editorFunction === "__all__" 
        ? data.privileges.filter(p => p.module === editorModule)
        : data.privileges.filter(p => p.module === editorModule && p.function === editorFunction);
      
      const selections: Record<string, boolean> = {};
      for (const priv of roles) {
        // Initialize all to selected by default
        selections[priv.id] = true;
      }
      setRoleSelections(selections);
    }
  }, [editorFunction, editorModule, data]);

  // Reset editor when employee/company changes
  useEffect(() => {
    setEditorModule("");
    setEditorFunction("");
    setRoleSelections({});
  }, [selectedEmployeeId, selectedCompanyId]);

  // Submit request instead of directly applying
  const handleSubmitRequest = async () => {
    if (!selectedCompanyId || !selectedEmployeeId || !editorModule || !editorFunction) return;

    // Get selected role IDs
    const selectedRoles = Object.entries(roleSelections)
      .filter(([_, isSelected]) => isSelected)
      .map(([privId]) => privId);

    if (selectedRoles.length === 0) {
      toast({ 
        title: "No roles selected", 
        description: "Please select at least one role",
        variant: "destructive" 
      });
      return;
    }

    // Determine function name (handle "All" case)
    const functionName = editorFunction === "__all__" 
      ? data?.privileges.find(p => selectedRoles.includes(p.id))?.function || ""
      : editorFunction;

    try {
      await createRequest.mutateAsync({
        managerId: actingUserId,
        employeeId: selectedEmployeeId,
        companyId: selectedCompanyId,
        module: editorModule,
        function: functionName,
        rolesSelected: selectedRoles,
        startDate: startDate,
        endDate: endDate || null,
      });
      toast({ title: t.requestCreated });
      // Reset editor after successful submit
      setEditorModule("");
      setEditorFunction("");
      setRoleSelections({});
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate("");
    } catch (err) {
      toast({ 
        title: "Failed to submit request", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  // Filter requests for selected employee
  const employeeRequests = useMemo(() => {
    return requests.filter(r => r.employeeId === selectedEmployeeId);
  }, [requests, selectedEmployeeId]);

  const pendingRequests = employeeRequests.filter(r => r.status === "pending");
  const activeRequests = employeeRequests.filter(r => r.status === "active");
  const rejectedRequests = employeeRequests.filter(r => r.status === "rejected");

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
      <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 dark:from-indigo-800 dark:via-indigo-900 dark:to-violet-800 px-4 py-2 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h1 className="text-base font-bold tracking-tight md:text-lg text-white">{t.title}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Act As Manager - Pill with Avatar */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-1 pr-3 py-1 border border-white/20">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white text-xs font-bold">
                {actingUser?.name.charAt(0) || "M"}
              </div>
              <select
                value={actingUserId}
                onChange={(e) => {
                  setActingUserId(e.target.value);
                  setSelectedEmployeeId("");
                  setSelectedCompanyId("");
                }}
                className="bg-transparent text-white text-sm font-medium cursor-pointer focus:outline-none appearance-none pr-4"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center', backgroundSize: '16px' }}
                data-testid="select-act-as"
              >
                {managers.map(emp => (
                  <option key={emp.id} value={emp.id} className="text-foreground bg-background">
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-white/30" />

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>

            {/* Admin Panel Link (only for admin users) */}
            {actingUser?.isAdmin && (
              <>
                <div className="h-5 w-px bg-white/30" />
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
                  data-testid="link-admin-panel"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t.adminPanel}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Context Card - Acting Authority */}
        {actingUser && (
          <div className="flex rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 overflow-hidden">
            {/* Left Gradient Strip */}
            <div className="w-1.5 bg-gradient-to-b from-indigo-500 via-indigo-600 to-violet-600 flex-shrink-0" />
            
            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Avatar + Name + Position - Stacked */}
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {actingUser.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-base leading-tight">{actingUser.name}</span>
                    <span className="text-sm text-muted-foreground leading-tight">{actingUser.title}</span>
                  </div>
                </div>

                {/* Legal Company Badge */}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                    {managerLegalCompany?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Selection Card */}
        {actingUser && (
          <div className="rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 p-4">
            {/* Company Employees Checkbox */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="company-employees-checkbox"
                checked={companyEmployeesOnly}
                onChange={(e) => setCompanyEmployeesOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                data-testid="checkbox-company-employees"
              />
              <label htmlFor="company-employees-checkbox" className="text-sm font-medium cursor-pointer">
                {t.companyEmployees}
              </label>
              <span className="text-xs text-muted-foreground">
                ({companyEmployeesOnly ? managerLegalCompany?.name : t.allEmployees})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {companyEmployeesOnly ? t.legalEmployees : t.allEmployees}
                  </label>
                  {availableEmployees.length > 0 ? (
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-employee"
                    >
                      {filteredEmployees.map(emp => {
                        const empLegalCompany = data?.companies.find(c => c.id === emp.legalCompanyId);
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.id} - {emp.name}{!companyEmployeesOnly && empLegalCompany ? ` - ${empLegalCompany.name}` : ""}
                          </option>
                        );
                      })}
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
        )}

        {/* Employee Details Card */}
        {selectedEmployee && (
          <div className="rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.employeeDetails}</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-white font-bold">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.title}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{t.legalCompany}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  {employeeLegalCompany?.name || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Add / Remove Privileges (Full Width) - with Company Context inside */}
        {selectedEmployee && (
          <div className="rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 p-4">
            <button
              onClick={() => setIsAddRemoveExpanded(!isAddRemoveExpanded)}
              className="w-full flex items-center justify-between"
              data-testid="toggle-add-remove"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{t.addRemove}</h3>
              </div>
              {isAddRemoveExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
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
                    <option value="__all__">{t.all}</option>
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolesForFunction.every(p => roleSelections[p.id] === true)}
                        onChange={(e) => {
                          const newSelections: Record<string, boolean> = {};
                          for (const priv of rolesForFunction) {
                            newSelections[priv.id] = e.target.checked;
                          }
                          setRoleSelections(prev => ({ ...prev, ...newSelections }));
                        }}
                        className="rounded border-gray-300"
                        data-testid="checkbox-select-all-roles"
                      />
                      <span className="text-sm font-medium">
                        {rolesForFunction.every(p => roleSelections[p.id] === true) ? t.unselectAll : t.selectAll}
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border rounded-lg p-3 bg-muted/20 max-h-80 overflow-y-auto">
                    {rolesForFunction.map(priv => {
                      const isCurrentlyAssigned = currentPrivileges.includes(priv.id);
                      const isChecked = roleSelections[priv.id] ?? false;
                      
                      return (
                        <label 
                          key={priv.id} 
                          className="flex items-start gap-2 cursor-pointer hover:bg-muted p-2 rounded"
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

              {/* Date Pickers and Submit Request Button */}
              {editorFunction && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t.startDate}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.endDate}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitRequest}
                    disabled={createRequest.isPending}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-sm font-medium disabled:opacity-50"
                    data-testid="button-submit-request"
                  >
                    {createRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.submitting}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {t.submitRequest}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* Current Privilege - Multi-company hierarchical view */}
        {selectedEmployee && (
          <div className="rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{t.currentPrivilege}</h3>
              <span className="text-sm text-muted-foreground">
                ({employeeAssignmentsWithCompanies.length} {employeeAssignmentsWithCompanies.length === 1 ? 'company' : 'companies'})
              </span>
            </div>

            <ExpandableHierarchy
              allPrivileges={data.privileges}
              companyAssignments={employeeAssignmentsWithCompanies}
              activeRequests={activeRequests}
              t={t}
            />
          </div>
        )}

        {/* My Requests - Tabbed view */}
        {selectedEmployee && (
          <div className="rounded-lg border border-border bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{t.myRequests}</h3>
              <span className="text-sm text-muted-foreground">({employeeRequests.length})</span>
            </div>

            <Tabs value={requestTab} onValueChange={(v) => setRequestTab(v as "pending" | "active" | "rejected")}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  {t.pending} ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active">
                  {t.active} ({activeRequests.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" data-testid="tab-rejected">
                  {t.rejected} ({rejectedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <RequestList requests={pendingRequests} privileges={data.privileges} companies={data.companies} t={t} />
              </TabsContent>
              <TabsContent value="active">
                <RequestList requests={activeRequests} privileges={data.privileges} companies={data.companies} t={t} />
              </TabsContent>
              <TabsContent value="rejected">
                <RequestList requests={rejectedRequests} privileges={data.privileges} companies={data.companies} t={t} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper component to display request list
function RequestList({ 
  requests, 
  privileges, 
  companies,
  t 
}: { 
  requests: PrivilegeRequest[]; 
  privileges: Privilege[]; 
  companies: Company[];
  t: typeof DICT["en"];
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t.noRequests}</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map(req => {
        const company = companies.find(c => c.id === req.companyId);
        const roleCount = req.rolesSelected.length;
        
        return (
          <div 
            key={req.id} 
            className="rounded-lg border border-border bg-background p-3"
            data-testid={`request-item-${req.id}`}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{req.module}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm">{req.function}</span>
                  <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {roleCount} {roleCount === 1 ? 'role' : 'roles'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>{company?.name}</span>
                  <span>{req.startDate} - {req.endDate || 'No end date'}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300' :
                req.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
              }`}>
                {req.status}
              </div>
            </div>
            {req.adminComments && (
              <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                <span className="font-medium">Admin:</span> {req.adminComments}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
