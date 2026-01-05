import { useState, useMemo, useEffect } from "react";
import { 
  useBootstrapData, 
  useCreateDelegation, 
  useRevokeDelegation,
  useCreateRequest,
  useApproveRequest,
  useRejectRequest
} from "@/hooks/use-app-data";
import { 
  Loader2, Pencil, Search, Globe, Download, Building2, Users, ShieldCheck,
  UserPlus, X, Check, Clock, CheckCircle2, XCircle, ChevronDown, AlertTriangle
} from "lucide-react";
import type { 
  Employee, Company, Privilege, Assignment, Delegation, PrivilegeRequest, RoleTemplate 
} from "@shared/schema";

type Language = "en" | "ar";

const DICT = {
  en: {
    title: "Business Users Roles and Privileges",
    actAs: "Act as",
    company: "Company",
    employee: "Employee",
    search: "Search by ID or name...",
    privileges: "Privileges",
    module: "Module",
    function: "Function",
    role: "Role",
    assigned: "Assigned",
    applyTemplate: "Apply Role Template",
    apply: "Apply",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit for Approval",
    delegate: "Manager Delegate",
    export: "Export",
    exportCompany: "Export (This Company)",
    exportAll: "Export (All Companies)",
    managerDetails: "Manager Details",
    accessibleCompanies: "Accessible Companies",
    noAccess: "No companies accessible",
    delegations: "Delegations",
    createDelegation: "Create Delegation",
    delegateUser: "Delegate User",
    scope: "Scope",
    companyWide: "Company-wide",
    employeeSpecific: "Employee-specific",
    targetEmployee: "Target Employee",
    startDate: "Start Date",
    endDate: "End Date",
    revoke: "Revoke",
    pendingRequests: "Pending Requests",
    approve: "Approve",
    reject: "Reject",
    before: "Before",
    after: "After",
    noChanges: "No changes detected",
    unsavedWarning: "Unsaved Changes",
    unsavedDesc: "You have unsaved changes. Discard them?",
    discard: "Discard",
    viewMode: "View Mode",
    editMode: "Edit Mode",
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    applied: "Applied",
  },
  ar: {
    title: "أدوار وامتيازات مستخدمي الأعمال",
    actAs: "تصرف كـ",
    company: "الشركة",
    employee: "الموظف",
    search: "ابحث بالرقم أو الاسم...",
    privileges: "الامتيازات",
    module: "الوحدة",
    function: "الوظيفة",
    role: "الدور",
    assigned: "مخصص",
    applyTemplate: "تطبيق قالب الدور",
    apply: "تطبيق",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    submit: "إرسال للموافقة",
    delegate: "تفويض المدير",
    export: "تصدير",
    exportCompany: "تصدير (هذه الشركة)",
    exportAll: "تصدير (جميع الشركات)",
    managerDetails: "تفاصيل المدير",
    accessibleCompanies: "الشركات المتاحة",
    noAccess: "لا توجد شركات متاحة",
    delegations: "التفويضات",
    createDelegation: "إنشاء تفويض",
    delegateUser: "المستخدم المفوض",
    scope: "النطاق",
    companyWide: "على مستوى الشركة",
    employeeSpecific: "لموظف محدد",
    targetEmployee: "الموظف المستهدف",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    revoke: "إلغاء",
    pendingRequests: "الطلبات المعلقة",
    approve: "موافقة",
    reject: "رفض",
    before: "قبل",
    after: "بعد",
    noChanges: "لم يتم الكشف عن أي تغييرات",
    unsavedWarning: "تغييرات غير محفوظة",
    unsavedDesc: "لديك تغييرات غير محفوظة. هل تريد تجاهلها؟",
    discard: "تجاهل",
    viewMode: "وضع العرض",
    editMode: "وضع التحرير",
    draft: "مسودة",
    submitted: "مرسل",
    approved: "موافق عليه",
    rejected: "مرفوض",
    applied: "مطبق",
  }
};

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [actingUserId, setActingUserId] = useState<string>("E001");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftPrivileges, setDraftPrivileges] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const { data, isLoading, error } = useBootstrapData();
  const createDelegation = useCreateDelegation();
  const revokeDelegation = useRevokeDelegation();
  const createRequest = useCreateRequest();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const actingUser = useMemo(() => 
    data?.employees.find(e => e.id === actingUserId), 
    [data, actingUserId]
  );

  const managerCompanies = useMemo(() => {
    if (!data || !actingUser) return [];
    const access = data.managerAccess.find(m => m.managerId === actingUserId);
    return access?.companyIds || [];
  }, [data, actingUser, actingUserId]);

  const delegatedCompanies = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return data.delegations
      .filter(d => {
        if (d.delegateId !== actingUserId) return false;
        if (d.revokedAt) return false;
        if (d.startDate && new Date(d.startDate) > now) return false;
        if (d.endDate && new Date(d.endDate) < now) return false;
        return true;
      })
      .map(d => d.companyId);
  }, [data, actingUserId]);

  const accessibleCompanyIds = useMemo(() => 
    [...new Set([...managerCompanies, ...delegatedCompanies])],
    [managerCompanies, delegatedCompanies]
  );

  const accessibleCompanies = useMemo(() => 
    data?.companies.filter(c => accessibleCompanyIds.includes(c.id)) || [],
    [data, accessibleCompanyIds]
  );

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

  const selectedEmployee = useMemo(() => 
    data?.employees.find(e => e.id === selectedEmployeeId),
    [data, selectedEmployeeId]
  );

  const currentAssignment = useMemo(() => {
    if (!data || !selectedCompanyId || !selectedEmployeeId) return undefined;
    return data.assignments.find(
      a => a.companyId === selectedCompanyId && a.employeeId === selectedEmployeeId
    );
  }, [data, selectedCompanyId, selectedEmployeeId]);

  const currentPrivileges = currentAssignment?.privilegeIds || [];

  const hasUnsavedChanges = useMemo(() => {
    if (!isEditMode) return false;
    const sorted1 = [...currentPrivileges].sort();
    const sorted2 = [...draftPrivileges].sort();
    return JSON.stringify(sorted1) !== JSON.stringify(sorted2);
  }, [isEditMode, currentPrivileges, draftPrivileges]);

  const pendingRequestsForManager = useMemo(() => {
    if (!data || !actingUser?.isManager) return [];
    return data.requests.filter(r => 
      r.status === "Submitted" && managerCompanies.includes(r.companyId)
    );
  }, [data, actingUser, managerCompanies]);

  // Auto-select first company
  useEffect(() => {
    if (data && !selectedCompanyId && accessibleCompanies.length > 0) {
      setSelectedCompanyId(accessibleCompanies[0].id);
    }
  }, [data, selectedCompanyId, accessibleCompanies]);

  // Auto-select first employee
  useEffect(() => {
    if (data && selectedCompanyId && !selectedEmployeeId && filteredEmployees.length > 0) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [data, selectedCompanyId, selectedEmployeeId, filteredEmployees]);

  const handleActionWithCheck = (action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      setShowUnsavedWarning(true);
    } else {
      action();
    }
  };

  const confirmPendingAction = () => {
    if (pendingAction) pendingAction();
    setShowUnsavedWarning(false);
    setPendingAction(null);
    setIsEditMode(false);
    setDraftPrivileges([]);
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      handleActionWithCheck(() => {
        setIsEditMode(false);
        setDraftPrivileges([]);
      });
    } else {
      setIsEditMode(true);
      setDraftPrivileges([...currentPrivileges]);
    }
  };

  const handlePrivilegeToggle = (privId: string) => {
    setDraftPrivileges(prev => 
      prev.includes(privId) ? prev.filter(p => p !== privId) : [...prev, privId]
    );
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate || !data) return;
    const template = data.roleTemplates.find(rt => rt.role === selectedTemplate);
    if (template) {
      setDraftPrivileges([...template.privilegeIds]);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedCompanyId || !selectedEmployeeId) return;
    await createRequest.mutateAsync({
      actorId: actingUserId,
      companyId: selectedCompanyId,
      targetEmployeeId: selectedEmployeeId,
      afterPrivileges: draftPrivileges,
      status: "Submitted",
    });
    setIsEditMode(false);
    setDraftPrivileges([]);
  };

  const handleExport = (scope: "company" | "all") => {
    if (!selectedEmployeeId) return;
    const url = `/api/export/employee?employeeId=${selectedEmployeeId}&scope=${scope}${scope === "company" ? `&companyId=${selectedCompanyId}` : ""}`;
    window.location.href = url;
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
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">{t.title}</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Act As Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.actAs}:</span>
              <select
                value={actingUserId}
                onChange={(e) => handleActionWithCheck(() => {
                  setActingUserId(e.target.value);
                  setSelectedCompanyId("");
                  setSelectedEmployeeId("");
                  setIsEditMode(false);
                })}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium"
                data-testid="select-act-as"
              >
                {data.employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.isManager ? "(Manager)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => handleActionWithCheck(toggleLanguage)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              data-testid="button-language-toggle"
            >
              <Globe className="h-4 w-4" />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Manager Details Section */}
        {actingUser && (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t.managerDetails}</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {actingUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{actingUser.name}</p>
                  <p className="text-sm text-muted-foreground">{actingUser.title}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div>
                <p className="text-xs text-muted-foreground">{t.accessibleCompanies}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {accessibleCompanies.length > 0 ? accessibleCompanies.map(c => (
                    <span key={c.id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                      {c.name}
                    </span>
                  )) : <span className="text-xs text-muted-foreground">{t.noAccess}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Selection */}
        <div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Company Dropdown */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.company}</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => handleActionWithCheck(() => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedEmployeeId("");
                  setIsEditMode(false);
                })}
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
              <label className="text-sm font-medium text-muted-foreground">{t.employee}</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleActionWithCheck(() => {
                  setSelectedEmployeeId(e.target.value);
                  setIsEditMode(false);
                })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-employee"
              >
                {filteredEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.id} - {emp.name}</option>
                ))}
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

          {/* Selected Employee Info */}
          {selectedEmployee && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                </div>
              </div>
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
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            {actingUser?.isManager && (
              <button
                onClick={() => setShowDelegationModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                data-testid="button-delegate"
              >
                <UserPlus className="h-4 w-4" />
                {t.delegate}
              </button>
            )}
            <button
              onClick={handleEditToggle}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                isEditMode ? "bg-amber-100 text-amber-700" : "bg-primary text-primary-foreground"
              }`}
              data-testid="button-edit-toggle"
            >
              <Pencil className="h-4 w-4" />
              {isEditMode ? t.editMode : t.viewMode}
            </button>
          </div>

          {isEditMode && (
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-template"
              >
                <option value="">{t.applyTemplate}</option>
                {data.roleTemplates.map(rt => (
                  <option key={rt.role} value={rt.role}>{rt.role}</option>
                ))}
              </select>
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate}
                className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
                data-testid="button-apply-template"
              >
                {t.apply}
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={!hasUnsavedChanges || createRequest.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                data-testid="button-submit"
              >
                {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.submit}
              </button>
            </div>
          )}
        </div>

        {/* Privileges Grid */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/30 px-4 py-3">
            <h3 className="font-semibold">{t.privileges}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{t.module}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t.function}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t.role}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t.assigned}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.privileges.map(priv => {
                  const isAssigned = isEditMode 
                    ? draftPrivileges.includes(priv.id)
                    : currentPrivileges.includes(priv.id);

                  return (
                    <tr key={priv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{priv.module}</td>
                      <td className="px-4 py-3">{priv.function}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                          {priv.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditMode ? (
                          <button
                            onClick={() => handlePrivilegeToggle(priv.id)}
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isAssigned 
                                ? "bg-primary border-primary text-white" 
                                : "border-input hover:border-primary/50"
                            }`}
                            data-testid={`checkbox-priv-${priv.id}`}
                          >
                            {isAssigned && <Check className="h-3 w-3" />}
                          </button>
                        ) : (
                          isAssigned ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Requests for Manager */}
        {actingUser?.isManager && pendingRequestsForManager.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b bg-amber-50 dark:bg-amber-400/10 px-4 py-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">{t.pendingRequests}</h3>
            </div>
            <div className="divide-y">
              {pendingRequestsForManager.map(req => {
                const targetEmp = data.employees.find(e => e.id === req.targetEmployeeId);
                const company = data.companies.find(c => c.id === req.companyId);
                const creator = data.employees.find(e => e.id === req.createdBy);
                
                return (
                  <div key={req.id} className="p-4">
                    <div className="flex flex-wrap gap-4 items-start justify-between">
                      <div>
                        <p className="font-semibold">{targetEmp?.name} - {company?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested by {creator?.name} on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex gap-4 text-xs">
                          <div>
                            <span className="font-medium">{t.before}:</span>{" "}
                            {req.beforePrivileges.length > 0 ? req.beforePrivileges.join(", ") : "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t.after}:</span>{" "}
                            {req.afterPrivileges.join(", ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest.mutate({ id: req.id, actorId: actingUserId })}
                          disabled={approveRequest.isPending}
                          className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
                          data-testid={`button-approve-${req.id}`}
                        >
                          <Check className="h-4 w-4" />
                          {t.approve}
                        </button>
                        <button
                          onClick={() => rejectRequest.mutate({ id: req.id, actorId: actingUserId })}
                          disabled={rejectRequest.isPending}
                          className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                          data-testid={`button-reject-${req.id}`}
                        >
                          <X className="h-4 w-4" />
                          {t.reject}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Delegations */}
        {actingUser?.isManager && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b bg-muted/30 px-4 py-3">
              <h3 className="font-semibold">{t.delegations}</h3>
            </div>
            <div className="divide-y">
              {data.delegations.filter(d => d.managerId === actingUserId && !d.revokedAt).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No active delegations</p>
              ) : (
                data.delegations
                  .filter(d => d.managerId === actingUserId && !d.revokedAt)
                  .map(del => {
                    const delegate = data.employees.find(e => e.id === del.delegateId);
                    const company = data.companies.find(c => c.id === del.companyId);
                    const targetEmp = del.targetEmployeeId 
                      ? data.employees.find(e => e.id === del.targetEmployeeId)
                      : null;

                    return (
                      <div key={del.id} className="p-4 flex flex-wrap gap-4 items-center justify-between">
                        <div>
                          <p className="font-semibold">{delegate?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {del.scope === "company-wide" ? t.companyWide : t.employeeSpecific}: {company?.name}
                            {targetEmp && ` - ${targetEmp.name}`}
                          </p>
                          {del.endDate && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(del.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => revokeDelegation.mutate({ id: del.id, actorId: actingUserId })}
                          disabled={revokeDelegation.isPending}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                          data-testid={`button-revoke-${del.id}`}
                        >
                          {t.revoke}
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delegation Modal */}
      {showDelegationModal && (
        <DelegationModal
          data={data}
          actorId={actingUserId}
          managerCompanies={managerCompanies}
          t={t}
          onClose={() => setShowDelegationModal(false)}
          onCreate={createDelegation.mutateAsync}
          isPending={createDelegation.isPending}
        />
      )}

      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">{t.unsavedWarning}</h3>
            <p className="mt-2 text-muted-foreground">{t.unsavedDesc}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmPendingAction}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                {t.discard}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Delegation Modal Component
function DelegationModal({ 
  data, 
  actorId, 
  managerCompanies, 
  t, 
  onClose, 
  onCreate, 
  isPending 
}: {
  data: any;
  actorId: string;
  managerCompanies: string[];
  t: typeof DICT.en;
  onClose: () => void;
  onCreate: (data: any) => Promise<any>;
  isPending: boolean;
}) {
  const [delegateId, setDelegateId] = useState("");
  const [companyId, setCompanyId] = useState(managerCompanies[0] || "");
  const [scope, setScope] = useState<"company-wide" | "employee-specific">("company-wide");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [endDate, setEndDate] = useState("");

  const eligibleDelegates = data.employees.filter((e: Employee) => e.id !== actorId);
  const eligibleCompanies = data.companies.filter((c: Company) => managerCompanies.includes(c.id));
  const employeesInCompany = data.employees.filter((emp: Employee) => {
    const membership = data.employeeMembership.find((m: any) => m.employeeId === emp.id);
    return membership?.companyIds.includes(companyId);
  });

  const handleSubmit = async () => {
    await onCreate({
      actorId,
      delegateId,
      companyId,
      scope,
      targetEmployeeId: scope === "employee-specific" ? targetEmployeeId : undefined,
      endDate: endDate || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">{t.createDelegation}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-medium">{t.delegateUser}</label>
            <select
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {eligibleDelegates.map((emp: Employee) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">{t.company}</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {eligibleCompanies.map((c: Company) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">{t.scope}</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="company-wide">{t.companyWide}</option>
              <option value="employee-specific">{t.employeeSpecific}</option>
            </select>
          </div>

          {scope === "employee-specific" && (
            <div>
              <label className="text-sm font-medium">{t.targetEmployee}</label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {employeesInCompany.map((emp: Employee) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t.endDate} (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!delegateId || !companyId || isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
