import { useState, useMemo } from "react";
import { useBootstrapData, useCreateRequest, useRequests } from "@/hooks/use-app-data";
import { 
  Loader2, Globe, ShieldCheck, Plus, Settings
} from "lucide-react";
import { Link } from "wouter";
import type { Employee, Company, Privilege, PrivilegeRequest, RequestStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContextCard } from "@/components/ui/context-card";
import { EmployeeSelector } from "@/components/ui/employee-selector";
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
  const [actingUserId, setActingUserId] = useState("E001");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [companyEmployeesOnly, setCompanyEmployeesOnly] = useState(true);
  const [requestTab, setRequestTab] = useState<RequestStatus>("pending");
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  const { data, isLoading, error } = useBootstrapData();
  const { data: requests = [] } = useRequests();
  const createRequest = useCreateRequest();
  const { toast } = useToast();

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

  // Current acting manager
  const actingUser = useMemo(() => {
    return data?.employees.find(e => e.id === actingUserId);
  }, [data, actingUserId]);

  // Manager's legal company
  const managerLegalCompany = useMemo(() => {
    return data?.companies.find(c => c.id === actingUser?.legalCompanyId);
  }, [data, actingUser]);

  // Selected employee
  const selectedEmployee = useMemo(() => {
    return data?.employees.find(e => e.id === selectedEmployeeId);
  }, [data, selectedEmployeeId]);

  // Employee's legal company
  const employeeLegalCompany = useMemo(() => {
    return data?.companies.find(c => c.id === selectedEmployee?.legalCompanyId);
  }, [data, selectedEmployee]);

  // Employees filtered for the dropdown
  const availableEmployees = useMemo(() => {
    if (!data || !actingUser) return [];
    return data.employees.filter(e => 
      !e.isManager && e.managerId === actingUserId
    );
  }, [data, actingUser, actingUserId]);

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
    companyId: string;
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => {
    if (!selectedEmployeeId) return;

    try {
      await createRequest.mutateAsync({
        managerId: actingUserId,
        employeeId: selectedEmployeeId,
        companyId: requestData.companyId,
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
    <div className="min-h-screen bg-background font-sans">
      {/* Zone A: Sticky Top Header (Slim 56px) */}
      <header className="sticky top-0 z-50 h-14 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 shadow-lg">
        <div className="mx-auto h-full max-w-7xl flex items-center justify-between gap-4">
          {/* Left: App Icon + Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h1 className="text-sm font-bold tracking-tight md:text-base text-white hidden sm:block" data-testid="text-app-title">
              {t.title}
            </h1>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Act as Manager Selector */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 border border-white/20">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white text-xs font-bold">
                {actingUser?.name.charAt(0) || "M"}
              </div>
              <select
                value={actingUserId}
                onChange={(e) => {
                  setActingUserId(e.target.value);
                  setSelectedEmployeeId("");
                }}
                className="bg-transparent text-white text-sm font-medium cursor-pointer focus:outline-none appearance-none pr-4"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
                  backgroundRepeat: 'no-repeat', 
                  backgroundPosition: 'right 0 center', 
                  backgroundSize: '14px' 
                }}
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
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>

            {/* Admin Panel Link */}
            {actingUser?.isAdmin && (
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Zone B: Manager Card + Employee Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manager Context Card */}
          <ContextCard
            type="manager"
            name={actingUser?.name}
            title={actingUser?.title}
            company={managerLegalCompany?.name}
            isHighlighted={true}
          />

          {/* Employee Selector */}
          <EmployeeSelector
            employees={availableEmployees}
            companies={data.companies}
            selectedEmployeeId={selectedEmployeeId}
            onSelect={setSelectedEmployeeId}
            managerLegalCompanyId={actingUser?.legalCompanyId || ""}
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

        {/* Employee Details Card */}
        <ContextCard
          type="employee"
          name={selectedEmployee?.name}
          title={selectedEmployee?.title}
          company={employeeLegalCompany?.name}
          placeholder={t.selectEmployeeFirst}
        />

        {/* Zone C: Work Area - Only show when employee is selected */}
        {selectedEmployee && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Content - Current Privileges (60%) */}
            <div className="lg:col-span-3">
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
            </div>

            {/* Sidebar - Privilege Requests (40%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Privilege Requests Card */}
              <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-md border border-slate-200 dark:border-slate-700">
                {/* Header with New Request Button */}
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100" data-testid="text-requests-title">
                    {t.privilegeRequests}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {employeeRequests.length}
                    </span>
                  </h2>
                  <Button 
                    onClick={() => setShowNewRequestModal(true)}
                    size="sm"
                    className="gap-1.5"
                    data-testid="button-new-request"
                  >
                    <Plus className="h-4 w-4" />
                    {t.newRequest}
                  </Button>
                </div>

                {/* Tabs */}
                <Tabs value={requestTab} onValueChange={(v) => setRequestTab(v as RequestStatus)}>
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="pending" data-testid="tab-pending">
                      {t.pending}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs">
                        {pendingRequests.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="active" data-testid="tab-active">
                      {t.active}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs">
                        {activeRequests.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="rejected" data-testid="tab-rejected">
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
        )}

        {/* Empty State when no employee selected */}
        {!selectedEmployee && (
          <div className="rounded-xl bg-white dark:bg-slate-800 p-12 shadow-md border border-slate-200 dark:border-slate-700 text-center">
            <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t.selectEmployeeFirst}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {t.noLegalEmployees}
            </p>
          </div>
        )}
      </main>

      {/* New Request Modal */}
      <NewRequestModal
        open={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        onSubmit={handleSubmitRequest}
        privileges={data.privileges}
        companies={allCompanies}
        isSubmitting={createRequest.isPending}
        t={{
          newRequest: t.newRequest,
          company: t.company,
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
