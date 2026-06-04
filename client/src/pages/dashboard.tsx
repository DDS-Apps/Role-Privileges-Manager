import { useState, useMemo } from "react";
import { useBootstrapData, useCreateRequest, useRequests } from "@/hooks/use-app-data";
import { useAuth, useLogout } from "@/hooks/use-auth";
import {
  Loader2, Globe, Plus, Settings, LogOut
} from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";
import { Link, useLocation } from "wouter";
import type { Employee, Company, Privilege, PrivilegeRequest, RequestStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CompanySwitcher } from "@/components/ui/company-switcher";
import { ContextCard } from "@/components/ui/context-card";
import { EmployeeSelector } from "@/components/ui/employee-selector";
import { AccessSearchCard } from "@/components/ui/access-search-card";
import { NewRequestModal } from "@/components/ui/new-request-modal";
import { RequestsTable } from "@/components/ui/requests-table";
import { PrivilegesPanel } from "@/components/ui/privileges-panel";

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
    cancel: "Cancel",
    managerDetails: "Manager Details",
    legalCompany: "Legal Company",
    noAccess: "No companies accessible",
    selectModule: "Select Module",
    selectFunction: "Select Function",
    noPrivileges: "No privileges assigned",
    employeeDetails: "Employee Details",
    selectModuleFirst: "Select a module to see functions",
    selectFunctionFirst: "Select a function to see roles",
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
    newRequest: "New Request",
    privilegeRequests: "Privilege Requests",
    currentPrivilege: "Current Active Privileges",
    moduleFunction: "Module & Function",
    requestedRoles: "Requested Roles",
    status: "Status",
    adminComment: "Admin Comments",
    roles: "Roles",
    selectEmployeeFirst: "Select an employee to view their privileges and requests",
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
    cancel: "إلغاء",
    managerDetails: "تفاصيل المدير",
    legalCompany: "الشركة القانونية",
    noAccess: "لا توجد شركات متاحة",
    selectModule: "اختر الوحدة",
    selectFunction: "اختر الوظيفة",
    noPrivileges: "لا توجد امتيازات مخصصة",
    employeeDetails: "تفاصيل الموظف",
    selectModuleFirst: "اختر وحدة لرؤية الوظائف",
    selectFunctionFirst: "اختر وظيفة لرؤية الأدوار",
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
    newRequest: "طلب جديد",
    privilegeRequests: "طلبات الامتيازات",
    currentPrivilege: "الامتيازات النشطة الحالية",
    moduleFunction: "الوحدة والوظيفة",
    requestedRoles: "الأدوار المطلوبة",
    status: "الحالة",
    adminComment: "تعليقات المسؤول",
    roles: "الأدوار",
    selectEmployeeFirst: "اختر موظف لعرض امتيازاته وطلباته",
  }
};

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [companyEmployeesOnly, setCompanyEmployeesOnly] = useState(true);
  const [requestTab, setRequestTab] = useState<RequestStatus>("pending");
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  const { data: authUser } = useAuth();
  const logout = useLogout();
  const [, navigate] = useLocation();
  const actingUserId = authUser?.id || "";
  const selectedCompanyId = authUser?.selectedCompanyId || "";

  const { data, isLoading, error } = useBootstrapData();
  const { data: requests = [] } = useRequests();
  const createRequest = useCreateRequest();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/login");
  };

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  // Managers list for "Act as" dropdown
  const managers = useMemo(() => {
    return data?.employees.filter(e => e.isManager) || [];
  }, [data]);

  // Current acting manager — try SAP userId first, then email, then contact id
  const actingUser = useMemo(() => {
    return (
      data?.employees.find(e => authUser?.userId && e.id === authUser.userId) ||
      data?.employees.find(e => authUser?.email && e.email.toLowerCase() === authUser.email.toLowerCase()) ||
      data?.employees.find(e => e.id === actingUserId)
    );
  }, [data, actingUserId, authUser]);

  // Manager's currently selected working company (changes when switching via header)
  const managerSelectedCompany = useMemo(() => {
    return data?.companies.find(c => c.id === selectedCompanyId);
  }, [data, selectedCompanyId]);

  // Selected employee
  const selectedEmployee = useMemo(() => {
    return data?.employees.find(e => e.id === selectedEmployeeId);
  }, [data, selectedEmployeeId]);

  // Employee's legal company
  const employeeLegalCompany = useMemo(() => {
    return data?.companies.find(c => c.id === selectedEmployee?.legalCompanyId);
  }, [data, selectedEmployee]);

  // Employee's line manager name
  const employeeLineManager = useMemo(() => {
    if (!selectedEmployee?.managerId) return undefined;
    return data?.employees.find(e => e.id === selectedEmployee.managerId)?.name;
  }, [data, selectedEmployee]);

  // All employees — EmployeeSelector handles company filtering internally
  const availableEmployees = useMemo(() => {
    return data?.employees || [];
  }, [data]);

  // Get all companies for the request modal
  const allCompanies = useMemo(() => {
    return data?.companies || [];
  }, [data]);

  // Get assignments for selected employee across all companies
  const employeeAssignmentsWithCompanies = useMemo(() => {
    if (!data || !selectedEmployeeId) return [];
    return data.assignments
      .filter(a => a.employeeId === selectedEmployeeId)
      .map(a => ({
        company: data.companies.find(c => c.id === a.companyId)!,
        privilegeIds: a.privilegeIds,
      }))
      .filter(a => a.company && a.privilegeIds.length > 0);
  }, [data, selectedEmployeeId]);

  // Filter requests for selected employee
  const employeeRequests = useMemo(() => {
    return requests.filter(r => r.employeeId === selectedEmployeeId);
  }, [requests, selectedEmployeeId]);

  const pendingRequests = employeeRequests.filter(r => r.status === "pending");
  const activeRequests = employeeRequests.filter(r => r.status === "active");
  const rejectedRequests = employeeRequests.filter(r => r.status === "rejected");

  const currentTabRequests = useMemo(() => {
    switch (requestTab) {
      case "pending": return pendingRequests;
      case "active": return activeRequests;
      case "rejected": return rejectedRequests;
      default: return pendingRequests;
    }
  }, [requestTab, pendingRequests, activeRequests, rejectedRequests]);

  // Handle new request submission
  const handleSubmitRequest = async (requestData: {
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => {
    if (!selectedEmployeeId) return;

    try {
      await createRequest.mutateAsync({
        managerId: actingUser?.id || actingUserId,
        managerUserId: authUser?.userId || undefined,
        employeeId: selectedEmployeeId,
        companyId: selectedEmployee?.legalCompanyId || selectedCompanyId,
        module: requestData.module,
        function: requestData.function,
        rolesSelected: requestData.rolesSelected,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
      });
      toast({ title: t.requestCreated });
      setShowNewRequestModal(false);
    } catch (err) {
      toast({ 
        title: "Failed to submit request", 
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Zone A: Sticky Top Header (Slim 56px) */}
      <header className="sticky top-0 z-50 h-14 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 shadow-lg overflow-hidden">
        {/* Teal glow decoration */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="mx-auto h-full max-w-7xl flex items-center justify-between gap-4 relative">
          {/* Left: App Icon + Title */}
          <div className="flex items-center gap-3">
            <DallahLogo size={34} />
            <h1 className="text-sm font-bold tracking-tight md:text-base text-white hidden sm:block" data-testid="text-app-title">
              {t.title}
            </h1>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Logged-in user badge */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 border border-white/20">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white text-xs font-bold">
                {(authUser?.name || actingUser?.name || "?").charAt(0)}
              </div>
              <span className="text-white text-sm font-medium">{authUser?.name || actingUser?.name}</span>
            </div>

            {/* Company Switcher — only shown when user has multiple companies */}
            <CompanySwitcher
              companies={authUser?.companies || []}
              selectedCompanyId={selectedCompanyId}
            />

            {/* Notification Bell */}
            <NotificationBell
              requests={requests}
              employees={data.employees}
              companies={data.companies}
              privileges={data.privileges}
              managerId={actingUser?.id || actingUserId}
              authUser={authUser ?? null}
            />

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>

            {/* Admin Panel Link */}
            {(actingUser?.isAdmin || authUser?.isAdmin) && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/20 bg-transparent"
                  data-testid="link-admin-panel"
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  {t.adminPanel}
                </Button>
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-8">
        {/* Section: Account Details */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
            {t.managerDetails}
          </h2>
          <div className="flex flex-col gap-4">
            {/* 1. Manager Context Card */}
            <ContextCard
              type="manager"
              name={authUser?.name || actingUser?.name}
              title={actingUser?.title}
              company={managerSelectedCompany?.name}
              isHighlighted={true}
            />

            {/* 2. Access Search Card */}
            <AccessSearchCard
              privileges={data.privileges}
              assignments={data.assignments}
              employees={data.employees}
              companies={data.companies}
              companyId={selectedCompanyId}
              onSelectEmployee={setSelectedEmployeeId}
            />

            {/* 3. Employee Selector */}
            <EmployeeSelector
              employees={availableEmployees}
              companies={data.companies}
              selectedEmployeeId={selectedEmployeeId}
              onSelect={setSelectedEmployeeId}
              managerLegalCompanyId={selectedCompanyId}
              companyEmployeesOnly={companyEmployeesOnly}
              onToggleCompanyEmployees={setCompanyEmployeesOnly}
              t={{
                companyEmployees: t.companyEmployees,
                allEmployees: t.allEmployees,
                selectEmployee: t.selectEmployee,
                search: t.search,
              }}
            />
          </div>
        </section>

        {/* Section: Employee Details */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
            {t.employeeDetails}
          </h2>
          <ContextCard
            type="employee"
            name={selectedEmployee?.name}
            title={selectedEmployee?.title}
            department={selectedEmployee?.department}
            lineManager={employeeLineManager}
            company={employeeLegalCompany?.name}
            placeholder={t.selectEmployeeFirst}
          />
        </section>

        {/* Section: Privileges Overview - Only show when employee is selected */}
        {selectedEmployee && (
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
              {t.privileges}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Privileges (50%) */}
              <PrivilegesPanel
                allPrivileges={data.privileges}
                companyAssignments={employeeAssignmentsWithCompanies}
                activeRequests={activeRequests}
                t={{
                  currentPrivilege: t.currentPrivilege,
                  noPrivileges: t.noPrivileges,
                  rolesAssigned: t.rolesAssigned,
                  noEndDate: t.noEndDate,
                }}
              />

              {/* Privilege Requests (50%) */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                {/* Card Header with New Request Button */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm" data-testid="text-requests-title">
                    {t.privilegeRequests}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({employeeRequests.length})
                    </span>
                  </h3>
                  <Button 
                    onClick={() => setShowNewRequestModal(true)}
                    size="sm"
                    className="gap-1.5 h-8"
                    data-testid="button-new-request"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.newRequest}
                  </Button>
                </div>

                {/* Card Body with Tabs */}
                <div className="p-4">
                  <Tabs value={requestTab} onValueChange={(v) => setRequestTab(v as RequestStatus)}>
                    <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-800">
                      <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs">
                        {t.pending}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs">
                          {pendingRequests.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="active" data-testid="tab-active" className="text-xs">
                        {t.active}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs">
                          {activeRequests.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="rejected" data-testid="tab-rejected" className="text-xs">
                        {t.rejected}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
                          {rejectedRequests.length}
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={requestTab}>
                      <RequestsTable
                        requests={currentTabRequests}
                        privileges={data.privileges}
                        companies={data.companies}
                        t={{
                          moduleFunction: t.moduleFunction,
                          requestedRoles: t.requestedRoles,
                          startDate: t.startDate,
                          endDate: t.endDate,
                          status: t.status,
                          noRequests: t.noRequests,
                          adminComment: t.adminComment,
                          roles: t.roles,
                          noEndDate: t.noEndDate,
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty State when no employee selected */}
        {!selectedEmployee && (
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              <span className="w-1 h-6 bg-teal-600 rounded-full"></span>
              {t.privileges}
            </h2>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <DallahLogo size={48} className="mx-auto mb-3 opacity-20" />
              <h3 className="text-base font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.selectEmployeeFirst}
              </h3>
            </div>
          </section>
        )}
      </main>

      {/* New Request Modal */}
      <NewRequestModal
        open={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        onSubmit={handleSubmitRequest}
        privileges={data.privileges}
        isSubmitting={createRequest.isPending}
        t={{
          newRequest: t.newRequest,
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
        }}
      />
    </div>
  );
}
