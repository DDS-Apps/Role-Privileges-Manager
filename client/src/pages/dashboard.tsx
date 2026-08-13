import { useState, useMemo, useEffect, useCallback } from "react";
import { useBootstrapData, useCreateRequest, useRequests } from "@/hooks/use-app-data";
import { useAuth, useLogout } from "@/hooks/use-auth";
import {
  Loader2, Globe, Settings, LogOut,
} from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CompanyAccessOverview } from "@/components/ui/company-access-overview";
import { NewRequestModal } from "@/components/ui/new-request-modal";
import { DeletePrivilegeModal } from "@/components/ui/delete-privilege-modal";
import { RequestsTable } from "@/components/ui/requests-table";
import type { PrivilegeRequest, RequestStatus } from "@shared/schema";
import {
  buildOwnerIds,
  isRequestOwnedByUser,
  isPendingForUserApproval,
} from "@/lib/request-utils";

type Language = "en" | "ar";

const DICT = {
  en: {
    title: "Business Users Roles and Privileges",
    managerDetails: "Your session",
    company: "Working company",
    employeeDetails: "Selected employee",
    privileges: "Privileges & requests",
    module: "Module",
    function: "Function",
    role: "Role",
    legalCompany: "Legal company",
    lineManager: "Line manager",
    department: "Department",
    position: "Position",
    pending: "Pending",
    active: "Approved",
    rejected: "Rejected",
    noRequests: "No requests found",
    requestCreated: "Request submitted successfully",
    adminPanel: "Admin Panel",
    noEndDate: "No end date",
    userId: "User ID",
    created: "Created",
    newRequest: "New request",
    newPrivilege: "New Privilege",
    searchEmployee: "Search by ID or name...",
    selectEmployee: "Select an employee",
    externalEmployee: "External employee",
    privilegeRequests: "Privilege requests",
    currentPrivilege: "Active privileges (all companies)",
    moduleFunction: "Module & function",
    requestedRoles: "Requested roles",
    status: "Status",
    adminComment: "Admin comments",
    roles: "Roles",
    noPrivileges: "No privileges assigned",
    rolesAssigned: "roles assigned",
    submitRequest: "Submit request",
    submitting: "Submitting...",
    startDate: "Start date",
    endDate: "End date (optional)",
    cancel: "Cancel",
    submittedBy: "Submitted by",
    commentOptional: "Comment (optional)",
    addComment: "Add a comment...",
    approve: "Approve",
    reject: "Reject",
    requestApproved: "Request approved",
    requestRejected: "Request rejected",
    approvalFailed: "Action failed",
    selectAll: "Select all",
    unselectAll: "Unselect all",
    accessOverviewTitle: "Company access overview",
    accessOverviewSubtitle: "All privileges granted in",
    accessSearch: "Search by ID, name, module, role...",
    allModules: "All modules",
    clearModules: "Clear",
    modulesSelected: "{count} modules",
    allFunctions: "All functions",
    internal: "Company employees",
    external: "External users",
    externalUsersSummary: "Users with External Access",
    all: "All",
    employee: "Employee",
    employeeId: "ID",
    type: "Type",
    accessCompany: "Access company",
    noAccess: "No access",
    noResults: "No matching records",
    showing: "Showing",
    of: "of",
    rows: "rows",
    selectCompany: "Select a company to view access",
    internalBadge: "Own",
    externalBadge: "Other",
    companyUnit: "Company",
    companiesUnit: "Companies",
    modulesCol: "Modules (own company)",
    companyCol: "Company",
    externalCol: "Other Company",
    externalAccessTitle: "External company access",
    privilegesCol: "Privileges",
    otherCompanyAccess: "also has roles outside",
    deletePrivilege: "Delete privilege",
    submitDeleteRequest: "Submit delete request",
    deleteRequestCreated: "Delete request submitted successfully",
    effectiveFrom: "Effective from",
    reinstateAfter: "Reinstate after (optional)",
    dateHelper: "Privileges are removed on the effective date. If a reinstate date is set, roles are restored automatically after that date.",
    noAssignedPrivileges: "No assigned privileges for this employee",
    grant: "Grant",
    delete: "Delete",
    scheduled: "Scheduled",
    revoked: "Revoked",
    reinstated: "Reinstated",
    revokedUntil: "Revoked until {date}",
    actions: "Actions",
    currentPrivileges: "Current privileges",
    noCurrentPrivileges: "No privileges assigned in this company",
    alreadyAssigned: "Already assigned",
    externalGrant: "External",
    approvalStep1: "Step 1 of 2",
    approvalStep2: "Step 2 of 2",
    awaitingRequesterGm: "Awaiting GM (your company)",
    awaitingTargetGm: "Awaiting GM (employee's company)",
    viewingModules: "Viewing: {modules}",
  },
  ar: {
    title: "أدوار وامتيازات مستخدمي الأعمال",
    managerDetails: "جلستك الحالية",
    company: "الشركة العاملة",
    employeeDetails: "الموظف المحدد",
    privileges: "الامتيازات والطلبات",
    module: "الوحدة",
    function: "الوظيفة",
    role: "الدور",
    legalCompany: "الشركة القانونية",
    lineManager: "المدير المباشر",
    department: "القسم",
    position: "المسمى",
    pending: "قيد الانتظار",
    active: "معتمد",
    rejected: "مرفوض",
    noRequests: "لم يتم العثور على طلبات",
    requestCreated: "تم تقديم الطلب بنجاح",
    adminPanel: "لوحة الإدارة",
    noEndDate: "لا يوجد تاريخ انتهاء",
    userId: "رقم المستخدم",
    created: "تاريخ الإنشاء",
    newRequest: "طلب جديد",
    newPrivilege: "امتياز جديد",
    searchEmployee: "بحث بالرقم أو الاسم...",
    selectEmployee: "اختر موظفاً",
    externalEmployee: "موظف خارجي",
    privilegeRequests: "طلبات الامتيازات",
    currentPrivilege: "الامتيازات النشطة (جميع الشركات)",
    moduleFunction: "الوحدة والوظيفة",
    requestedRoles: "الأدوار المطلوبة",
    status: "الحالة",
    adminComment: "تعليقات المسؤول",
    roles: "الأدوار",
    noPrivileges: "لا توجد امتيازات",
    rolesAssigned: "أدوار مخصصة",
    submitRequest: "تقديم الطلب",
    submitting: "جاري التقديم...",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء (اختياري)",
    cancel: "إلغاء",
    submittedBy: "قدمه",
    commentOptional: "تعليق (اختياري)",
    addComment: "أضف تعليقاً...",
    approve: "اعتماد",
    reject: "رفض",
    requestApproved: "تم اعتماد الطلب",
    requestRejected: "تم رفض الطلب",
    approvalFailed: "فشل الإجراء",
    selectAll: "تحديد الكل",
    unselectAll: "إلغاء التحديد",
    accessOverviewTitle: "نظرة عامة على وصول الشركة",
    accessOverviewSubtitle: "جميع الامتيازات الممنوحة في",
    accessSearch: "بحث بالرقم، الاسم، الوحدة، الدور...",
    allModules: "كل الوحدات",
    clearModules: "مسح",
    modulesSelected: "{count} وحدات",
    allFunctions: "كل الوظائف",
    internal: "موظفو الشركة",
    external: "مستخدمون خارجيون",
    externalUsersSummary: "مستخدمون بوصول خارجي",
    all: "الكل",
    employee: "الموظف",
    employeeId: "الرقم",
    type: "النوع",
    accessCompany: "شركة الوصول",
    noAccess: "بدون وصول",
    noResults: "لا توجد سجلات",
    showing: "عرض",
    of: "من",
    rows: "صف",
    selectCompany: "اختر شركة لعرض الوصول",
    internalBadge: "ذاتية",
    externalBadge: "أخرى",
    companyUnit: "شركة",
    companiesUnit: "شركات",
    modulesCol: "الوحدات (الشركة الأم)",
    companyCol: "الشركة",
    externalCol: "شركة أخرى",
    externalAccessTitle: "وصول الشركات الخارجية",
    privilegesCol: "الامتيازات",
    otherCompanyAccess: "لديه أيضاً أدوار خارج",
    deletePrivilege: "حذف امتياز",
    submitDeleteRequest: "تقديم طلب الحذف",
    deleteRequestCreated: "تم تقديم طلب الحذف بنجاح",
    effectiveFrom: "ساري من",
    reinstateAfter: "إعادة بعد (اختياري)",
    dateHelper: "تُزال الامتيازات في تاريخ السريان. إذا حُدد تاريخ الإعادة، تُستعاد الأدوار تلقائياً بعد ذلك.",
    noAssignedPrivileges: "لا توجد امتيازات مخصصة لهذا الموظف",
    grant: "منح",
    delete: "حذف",
    scheduled: "مجدول",
    revoked: "ملغى",
    reinstated: "مُستعاد",
    revokedUntil: "ملغى حتى {date}",
    actions: "إجراءات",
    currentPrivileges: "الامتيازات الحالية",
    noCurrentPrivileges: "لا توجد امتيازات مخصصة في هذه الشركة",
    alreadyAssigned: "مُخصص مسبقاً",
    externalGrant: "خارجي",
    approvalStep1: "الخطوة 1 من 2",
    approvalStep2: "الخطوة 2 من 2",
    awaitingRequesterGm: "بانتظار موافقة المدير العام (شركتك)",
    awaitingTargetGm: "بانتظار موافقة المدير العام (شركة الموظف)",
    viewingModules: "عرض: {modules}",
  },
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [requestTab, setRequestTab] = useState<RequestStatus>("pending");
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newRequestRequireEmployeePick, setNewRequestRequireEmployeePick] =
    useState(false);
  const [newRequestEmployeeId, setNewRequestEmployeeId] = useState("");
  const [showDeletePrivilegeModal, setShowDeletePrivilegeModal] = useState(false);
  const [deletePrivilegeRequireEmployeePick, setDeletePrivilegeRequireEmployeePick] =
    useState(false);
  const [deletePrivilegeEmployeeId, setDeletePrivilegeEmployeeId] = useState("");
  const [deletePrivilegeInitialModule, setDeletePrivilegeInitialModule] = useState("");
  const [deletePrivilegeInitialFunction, setDeletePrivilegeInitialFunction] = useState("");

  const { data: authUser } = useAuth();
  const logout = useLogout();
  const [, navigate] = useLocation();
  const actingUserId = authUser?.id || "";
  const selectedCompanyId = authUser?.selectedCompanyId ?? "";

  const { data, isLoading, error } = useBootstrapData();
  const { data: requests = [] } = useRequests();
  const createRequest = useCreateRequest();
  const { toast } = useToast();

  const t = DICT[language];

  useEffect(() => {
    setSelectedEmployeeId("");
  }, [selectedCompanyId]);

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  const actingUser = useMemo(() => {
    if (!data) return undefined;
    return (
      data.employees.find((e) => authUser?.userId && e.id === authUser.userId) ||
      data.employees.find(
        (e) =>
          authUser?.email &&
          e.email.toLowerCase() === authUser.email.toLowerCase(),
      ) ||
      data.employees.find((e) => e.id === actingUserId)
    );
  }, [data, actingUserId, authUser]);

  const openNewRequestForEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setNewRequestEmployeeId(employeeId);
    setNewRequestRequireEmployeePick(false);
    setShowNewRequestModal(true);
  };

  const openNewRequestFromToolbar = () => {
    setNewRequestRequireEmployeePick(true);
    setNewRequestEmployeeId(selectedEmployeeId);
    setShowNewRequestModal(true);
  };

  const closeNewRequestModal = () => {
    setShowNewRequestModal(false);
    setNewRequestRequireEmployeePick(false);
  };

  const openDeletePrivilegeForEmployee = (
    employeeId: string,
    module = "",
    functionName = "",
  ) => {
    setSelectedEmployeeId(employeeId);
    setDeletePrivilegeEmployeeId(employeeId);
    setDeletePrivilegeRequireEmployeePick(false);
    setDeletePrivilegeInitialModule(module);
    setDeletePrivilegeInitialFunction(functionName);
    setShowDeletePrivilegeModal(true);
  };

  const openDeletePrivilegeFromToolbar = () => {
    setDeletePrivilegeRequireEmployeePick(true);
    setDeletePrivilegeEmployeeId(selectedEmployeeId);
    setDeletePrivilegeInitialModule("");
    setDeletePrivilegeInitialFunction("");
    setShowDeletePrivilegeModal(true);
  };

  const closeDeletePrivilegeModal = () => {
    setShowDeletePrivilegeModal(false);
    setDeletePrivilegeRequireEmployeePick(false);
    setDeletePrivilegeInitialModule("");
    setDeletePrivilegeInitialFunction("");
  };

  const managerId = actingUser?.id || actingUserId;

  const gmLegalCompanyIds = useMemo(() => {
    if (!authUser) return [];
    return authUser.companies
      .filter((c) => c.role === "GM")
      .map((c) => c.companyId);
  }, [authUser]);

  const accessibleCompanyIds = useMemo(() => {
    return new Set(authUser?.companies.map((c) => c.companyId) ?? []);
  }, [authUser]);

  const managerRequests = useMemo(() => {
    if (!data) return [];
    const ownerIds = buildOwnerIds(actingUser?.id, actingUserId, authUser?.userId);
    const approvalOptions = {
      isAdmin: Boolean(authUser?.isAdmin),
      accessibleCompanyIds,
      gmLegalCompanyIds,
      employees: data.employees,
    };

    return requests.filter((r) => {
      // All requests you submitted (any company, any status)
      if (isRequestOwnedByUser(r, ownerIds)) return true;
      // Pending requests waiting for you to approve (admin / GM)
      return isPendingForUserApproval(r, ownerIds, approvalOptions);
    });
  }, [
    requests,
    data,
    actingUser?.id,
    actingUserId,
    authUser?.userId,
    authUser?.isAdmin,
    gmLegalCompanyIds,
    accessibleCompanyIds,
  ]);

  const requestOwnerIds = useMemo(
    () => buildOwnerIds(actingUser?.id, actingUserId, authUser?.userId),
    [actingUser?.id, actingUserId, authUser?.userId],
  );

  const requestApprovalOptions = useMemo(
    () =>
      data
        ? {
            isAdmin: Boolean(authUser?.isAdmin),
            accessibleCompanyIds,
            gmLegalCompanyIds,
            employees: data.employees,
          }
        : null,
    [data, authUser?.isAdmin, accessibleCompanyIds, gmLegalCompanyIds],
  );

  const canApproveRequest = useCallback(
    (request: PrivilegeRequest) => {
      if (!requestApprovalOptions) return false;
      return isPendingForUserApproval(
        request,
        requestOwnerIds,
        requestApprovalOptions,
      );
    },
    [requestApprovalOptions, requestOwnerIds],
  );

  const pendingRequests = managerRequests.filter((r) => r.status === "pending");
  const activeRequests = managerRequests.filter((r) => r.status === "active");
  const rejectedRequests = managerRequests.filter((r) => r.status === "rejected");

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/login");
  };

  const handleSubmitRequest = async (requestData: {
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => {
    const employeeId = newRequestRequireEmployeePick
      ? newRequestEmployeeId
      : selectedEmployeeId;
    if (!employeeId || !selectedCompanyId) return;

    try {
      await createRequest.mutateAsync({
        managerId: actingUser?.id || actingUserId,
        managerUserId: authUser?.userId || undefined,
        employeeId,
        companyId: selectedCompanyId,
        module: requestData.module,
        function: requestData.function,
        rolesSelected: requestData.rolesSelected,
        requestType: "grant",
        startDate: requestData.startDate,
        endDate: requestData.endDate,
      });
      toast({ title: t.requestCreated });
      closeNewRequestModal();
      setSelectedEmployeeId(employeeId);
    } catch (err) {
      toast({
        title: "Failed to submit request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSubmitDeleteRequest = async (requestData: {
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => {
    const employeeId = deletePrivilegeRequireEmployeePick
      ? deletePrivilegeEmployeeId
      : deletePrivilegeEmployeeId || selectedEmployeeId;
    if (!employeeId || !selectedCompanyId) return;

    try {
      await createRequest.mutateAsync({
        managerId: actingUser?.id || actingUserId,
        managerUserId: authUser?.userId || undefined,
        employeeId,
        companyId: selectedCompanyId,
        module: requestData.module,
        function: requestData.function,
        rolesSelected: requestData.rolesSelected,
        requestType: "revoke",
        startDate: requestData.startDate,
        endDate: requestData.endDate,
      });
      toast({ title: t.deleteRequestCreated });
      closeDeletePrivilegeModal();
      setSelectedEmployeeId(employeeId);
    } catch (err) {
      toast({
        title: "Failed to submit delete request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const requestTableLabels = {
    moduleFunction: t.moduleFunction,
    requestedRoles: t.requestedRoles,
    startDate: t.startDate,
    endDate: t.endDate,
    status: t.status,
    noRequests: t.noRequests,
    adminComment: t.adminComment,
    noEndDate: t.noEndDate,
    employee: t.employee,
    userId: t.userId,
    company: t.companyCol,
    created: t.created,
    submittedBy: t.submittedBy,
    grant: t.grant,
    delete: t.delete,
    scheduled: t.scheduled,
    revoked: t.revoked,
    reinstated: t.reinstated,
    revokedUntil: t.revokedUntil,
    effectiveFrom: t.effectiveFrom,
    reinstateAfter: t.reinstateAfter,
    commentOptional: t.commentOptional,
    addComment: t.addComment,
    approve: t.approve,
    reject: t.reject,
    cancel: t.cancel,
    requestApproved: t.requestApproved,
    requestRejected: t.requestRejected,
    approvalFailed: t.approvalFailed,
    externalGrant: t.externalGrant,
    approvalStep1: t.approvalStep1,
    approvalStep2: t.approvalStep2,
    awaitingRequesterGm: t.awaitingRequesterGm,
    awaitingTargetGm: t.awaitingTargetGm,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ECF1F6]">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ECF1F6] text-destructive">
        <div className="rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold">Failed to load data</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECF1F6] font-sans">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0F2A4D] via-[#1F4F6B] to-[#218C9C] shadow-md">
        <div className="mx-auto flex min-h-[4.25rem] max-w-[1600px] items-center justify-between gap-3 px-4 py-2 md:gap-4 md:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
            <DallahLogo size={32} />
            <h1
              className="hidden truncate text-sm font-semibold text-white sm:block md:text-base"
              data-testid="text-app-title"
            >
              {t.title}
            </h1>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-3 overflow-hidden sm:flex md:gap-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-400/90 text-sm font-bold text-white">
                  {getInitials(authUser?.name || actingUser?.name || "?")}
                </div>
                <div className="min-w-0">
                  <p className="max-w-[140px] truncate text-sm font-semibold text-white md:max-w-[180px]">
                    {authUser?.name || actingUser?.name}
                  </p>
                  <p className="max-w-[140px] truncate text-xs text-white/55 md:max-w-[180px]">
                    {actingUser?.title || "—"}
                  </p>
                </div>
              </div>

            </div>

            <NotificationBell
              requests={requests}
              employees={data.employees}
              companies={data.companies}
              privileges={data.privileges}
              managerId={actingUser?.id || actingUserId}
              authUser={authUser ?? null}
            />

            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/15"
            >
              <Globe className="mr-1 inline h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>

            {(actingUser?.isAdmin || authUser?.isAdmin) && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden border-white/30 bg-transparent text-white hover:bg-white/15 sm:inline-flex"
                  data-testid="link-admin-panel"
                >
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  {t.adminPanel}
                </Button>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
        {/* Access overview table */}
        <CompanyAccessOverview
          privileges={data.privileges}
          assignments={data.assignments}
          employees={data.employees}
          companies={data.companies}
          companyId={selectedCompanyId}
          authCompanies={authUser?.companies ?? []}
          selectedEmployeeId={selectedEmployeeId}
          onSelectEmployee={setSelectedEmployeeId}
          onNewRequest={openNewRequestForEmployee}
          onNewRequestFromToolbar={openNewRequestFromToolbar}
          onDeletePrivilege={openDeletePrivilegeForEmployee}
          onDeletePrivilegeFromToolbar={openDeletePrivilegeFromToolbar}
          language={language}
          viewingModules={
            authUser?.managedModules?.length
              ? t.viewingModules.replace("{modules}", authUser.managedModules.join(", "))
              : undefined
          }
          t={{
            title: t.accessOverviewTitle,
            subtitle: t.accessOverviewSubtitle,
            search: t.accessSearch,
            module: t.module,
            function: t.function,
            role: t.role,
            modulesCol: t.modulesCol,
            companyCol: t.companyCol,
            externalCol: t.externalCol,
            externalAccessTitle: t.externalAccessTitle,
            privilegesCol: t.privilegesCol,
            otherCompanyAccess: t.otherCompanyAccess,
            allModules: t.allModules,
            clearModules: t.clearModules,
            modulesSelected: t.modulesSelected,
            allFunctions: t.allFunctions,
            internal: t.internal,
            external: t.external,
            externalUsersSummary: t.externalUsersSummary,
            all: t.all,
            employee: t.employee,
            employeeId: t.employeeId,
            position: t.position,
            department: t.department,
            lineManager: t.lineManager,
            type: t.type,
            legalCompany: t.legalCompany,
            accessCompany: t.accessCompany,
            noAccess: t.noAccess,
            noResults: t.noResults,
            showing: t.showing,
            of: t.of,
            rows: t.rows,
            selectCompany: t.selectCompany,
            internalBadge: t.internalBadge,
            externalBadge: t.externalBadge,
            company: t.companyUnit,
            companies: t.companiesUnit,
            newRequest: t.newRequest,
            newPrivilege: t.newPrivilege,
            deletePrivilege: t.deletePrivilege,
            actions: t.actions,
          }}
        />

        {/* Privilege requests */}
        <section>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t.privilegeRequests}
                <span className="ml-2 font-normal text-slate-500">
                  ({managerRequests.length})
                </span>
              </h2>
            </div>
            <div className="p-4">
              <Tabs
                value={requestTab}
                onValueChange={(v) => setRequestTab(v as RequestStatus)}
              >
                <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-slate-100">
                  <TabsTrigger value="pending" className="text-xs" data-testid="tab-pending">
                    {t.pending}
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      {pendingRequests.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-xs" data-testid="tab-active">
                    {t.active}
                    <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-xs text-teal-800">
                      {activeRequests.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs" data-testid="tab-rejected">
                    {t.rejected}
                    <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs text-rose-800">
                      {rejectedRequests.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                  <RequestsTable
                    requests={pendingRequests}
                    privileges={data.privileges}
                    companies={data.companies}
                    employees={data.employees}
                    adminId={authUser?.id || ""}
                    canApproveRequest={canApproveRequest}
                    t={requestTableLabels}
                  />
                </TabsContent>
                <TabsContent value="active">
                  <RequestsTable
                    requests={activeRequests}
                    privileges={data.privileges}
                    companies={data.companies}
                    employees={data.employees}
                    t={requestTableLabels}
                  />
                </TabsContent>
                <TabsContent value="rejected">
                  <RequestsTable
                    requests={rejectedRequests}
                    privileges={data.privileges}
                    companies={data.companies}
                    employees={data.employees}
                    t={requestTableLabels}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <NewRequestModal
        open={showNewRequestModal}
        onClose={closeNewRequestModal}
        onSubmit={handleSubmitRequest}
        privileges={data.privileges}
        assignments={data.assignments}
        employees={[...data.employees].sort((a, b) => a.name.localeCompare(b.name))}
        companyId={selectedCompanyId}
        companies={data.companies}
        employeeId={newRequestEmployeeId}
        requireEmployeeSearch={newRequestRequireEmployeePick}
        onEmployeeIdChange={setNewRequestEmployeeId}
        isSubmitting={createRequest.isPending}
        t={{
          newRequest: t.newRequest,
          employee: t.employee,
          searchEmployee: t.searchEmployee,
          selectEmployee: t.selectEmployee,
          externalEmployee: t.externalEmployee,
          externalBadge: t.externalBadge,
          module: t.module,
          function: t.function,
          role: t.role,
          startDate: t.startDate,
          endDate: t.endDate,
          submitRequest: t.submitRequest,
          submitting: t.submitting,
          cancel: t.cancel,
          selectAll: t.selectAll,
          unselectAll: t.unselectAll,
          currentPrivileges: t.currentPrivileges,
          noCurrentPrivileges: t.noCurrentPrivileges,
          alreadyAssigned: t.alreadyAssigned,
        }}
      />

      <DeletePrivilegeModal
        open={showDeletePrivilegeModal}
        onClose={closeDeletePrivilegeModal}
        onSubmit={handleSubmitDeleteRequest}
        privileges={data.privileges}
        assignments={data.assignments}
        employees={[...data.employees].sort((a, b) => a.name.localeCompare(b.name))}
        companyId={selectedCompanyId}
        companies={data.companies}
        employeeId={deletePrivilegeEmployeeId}
        requireEmployeeSearch={deletePrivilegeRequireEmployeePick}
        onEmployeeIdChange={setDeletePrivilegeEmployeeId}
        initialModule={deletePrivilegeInitialModule}
        initialFunction={deletePrivilegeInitialFunction}
        isSubmitting={createRequest.isPending}
        t={{
          deletePrivilege: t.deletePrivilege,
          employee: t.employee,
          searchEmployee: t.searchEmployee,
          selectEmployee: t.selectEmployee,
          externalEmployee: t.externalEmployee,
          externalBadge: t.externalBadge,
          module: t.module,
          function: t.function,
          role: t.role,
          effectiveFrom: t.effectiveFrom,
          reinstateAfter: t.reinstateAfter,
          dateHelper: t.dateHelper,
          submitDeleteRequest: t.submitDeleteRequest,
          submitting: t.submitting,
          cancel: t.cancel,
          selectAll: t.selectAll,
          unselectAll: t.unselectAll,
          noAssignedPrivileges: t.noAssignedPrivileges,
          currentPrivileges: t.currentPrivileges,
          noCurrentPrivileges: t.noCurrentPrivileges,
        }}
      />
    </div>
  );
}

