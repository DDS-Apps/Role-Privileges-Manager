import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useBootstrapData, useRequests, useUpdateRequest, useTerminateEmployee, useRegisterItTicket, useMarkItResolved } from "@/hooks/use-app-data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataImportCenter } from "@/components/ui/data-import-center";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2, Globe, ArrowLeft, ShieldCheck, Search, Users,
  UserX, ChevronDown, ChevronRight, Check, X, AlertTriangle
} from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { PrivilegeRequest, RequestStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getRequestTypeLabel, formatRevokeExecutionState, getItTicketLabel } from "@/lib/request-utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type Language = "en" | "ar";

const DICT = {
  en: {
    title: "Admin Panel",
    backToDashboard: "Back to Dashboard",
    requestManagement: "Request Management",
    employeeTermination: "Employee Termination",
    all: "All",
    pending: "Pending",
    active: "Approved",
    rejected: "Rejected",
    employee: "Employee",
    manager: "Manager",
    moduleFunction: "Module / Function",
    rolesCount: "Roles Count",
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
    createdDate: "Created Date",
    noRequests: "No requests found",
    roles: "Roles",
    adminComment: "Admin Comment",
    addComment: "Add comment (optional)...",
    approve: "Approve",
    reject: "Reject",
    approving: "Approving...",
    rejecting: "Rejecting...",
    searchEmployee: "Search by name or ID...",
    selectEmployee: "Select Employee",
    terminateEmployee: "Terminate Employee",
    terminateConfirm: "Confirm Termination",
    terminateWarning: "This action will revoke all privileges from the selected employee. This cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    terminating: "Terminating...",
    noEndDate: "No end date",
    loading: "Loading...",
    grant: "Grant",
    delete: "Delete",
    scheduled: "Scheduled",
    revoked: "Revoked",
    reinstated: "Reinstated",
    revokedUntil: "Revoked until {date}",
    awaitingIt: "Awaiting IT",
    ticketId: "Ticket ID",
    registerTicket: "Register ticket",
    markItResolved: "Mark IT resolved",
    ticketPlaceholder: "##RE-20217##",
    dataImportTitle: "Data import center",
    dataImportSubtitle: "Upload each Excel file in order. All imports merge into existing data unless noted.",
    recommendedOrder: "Recommended order: 1 Catalog → 2 User roles → 3 Employee roster → 4 Login users. After replacing the catalog, re-import user roles so assignments stay linked.",
    mergeNote: "Catalog and user-role imports merge by default. Use “Replace entire catalog” only when you intend to reset the master privilege list.",
    selectFile: "Select Excel file",
    uploadImport: "Upload & import",
    uploading: "Importing...",
    importSummary: "Import summary",
    importErrors: "Import errors",
  },
  ar: {
    title: "لوحة الإدارة",
    backToDashboard: "العودة إلى لوحة التحكم",
    requestManagement: "إدارة الطلبات",
    employeeTermination: "إنهاء خدمة الموظف",
    all: "الكل",
    pending: "معلق",
    active: "معتمد",
    rejected: "مرفوض",
    employee: "الموظف",
    manager: "المدير",
    moduleFunction: "الوحدة / الوظيفة",
    rolesCount: "عدد الأدوار",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    status: "الحالة",
    createdDate: "تاريخ الإنشاء",
    noRequests: "لا توجد طلبات",
    roles: "الأدوار",
    adminComment: "تعليق المسؤول",
    addComment: "أضف تعليق (اختياري)...",
    approve: "موافقة",
    reject: "رفض",
    approving: "جاري الموافقة...",
    rejecting: "جاري الرفض...",
    searchEmployee: "ابحث بالاسم أو الرقم...",
    selectEmployee: "اختر موظف",
    terminateEmployee: "إنهاء خدمة الموظف",
    terminateConfirm: "تأكيد الإنهاء",
    terminateWarning: "هذا الإجراء سيلغي جميع الامتيازات من الموظف المحدد. لا يمكن التراجع عن هذا.",
    cancel: "إلغاء",
    confirm: "تأكيد",
    terminating: "جاري الإنهاء...",
    noEndDate: "لا يوجد تاريخ انتهاء",
    loading: "جاري التحميل...",
    grant: "منح",
    delete: "حذف",
    scheduled: "مجدول",
    revoked: "ملغى",
    reinstated: "مُستعاد",
    revokedUntil: "ملغى حتى {date}",
    awaitingIt: "بانتظار IT",
    ticketId: "رقم التذكرة",
    registerTicket: "تسجيل التذكرة",
    markItResolved: "تأكيد إنجاز IT",
    ticketPlaceholder: "##RE-20217##",
    dataImportTitle: "مركز استيراد البيانات",
    dataImportSubtitle: "ارفع كل ملف Excel بالترتيب. جميع الاستيرادات تُدمج مع البيانات الحالية ما لم يُذكر خلاف ذلك.",
    recommendedOrder: "الترتيب الموصى به: 1 الكatalog → 2 أدوار المستخدمين → 3 سجل الموظفين → 4 مستخدمو الدخول. بعد استبدال الكatalog، أعد استيراد أدوار المستخدمين.",
    mergeNote: "الاستيراد يدمج افتراضياً. استخدم استبدال الكatalog فقط عند إعادة تعيين قائمة الامتيازات.",
    selectFile: "اختر ملف Excel",
    uploadImport: "رفع واستيراد",
    uploading: "جاري الاستيراد...",
    importSummary: "ملخص الاستيراد",
    importErrors: "أخطاء الاستيراد",
  }
};

// ADMIN_USER_ID is now derived from the session

function getStatusColor(status: RequestStatus) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
    case "approved_pending_it":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300";
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [adminComments, setAdminComments] = useState<Record<string, string>>({});
  const [itTicketInputs, setItTicketInputs] = useState<Record<string, string>>({});
  
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const { data: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading: isBootstrapLoading } = useBootstrapData();
  const { data: accessUsersList } = useQuery({
    queryKey: ["/api/access-users"],
    queryFn: async () => {
      const res = await fetch("/api/access-users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<unknown[]>;
    },
  });

  // The ID sent as adminId for approve/reject (contact id or employee SAP id)
  const adminId = authUser?.id || "";

  // GM companies: contacts with role "GM" — used to filter visible requests
  const gmCompanyIds = authUser?.isAdmin
    ? undefined  // system admin sees all
    : authUser?.companies.filter(c => c.role === "GM").map(c => c.companyId);

  const { data: requests, isLoading: isRequestsLoading } = useRequests(
    statusFilter === "all"
      ? (gmCompanyIds?.length ? { targetCompanyIds: gmCompanyIds } : undefined)
      : { status: statusFilter, ...(gmCompanyIds?.length ? { targetCompanyIds: gmCompanyIds } : {}) }
  );
  const updateRequest = useUpdateRequest();
  const registerItTicket = useRegisterItTicket();
  const markItResolved = useMarkItResolved();
  const terminateEmployee = useTerminateEmployee();
  const { toast } = useToast();

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const getEmployeeName = (id: string) => {
    return data?.employees.find(e => e.id === id)?.name || id;
  };

  const getCompanyName = (id: string) => {
    return data?.companies.find(c => c.id === id)?.name || id;
  };

  const getPrivilegeDetails = (privilegeIds: string[]) => {
    if (!data) return [];
    return privilegeIds.map(id => data.privileges.find(p => p.id === id)).filter(Boolean);
  };

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === "all") return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  const filteredEmployees = useMemo(() => {
    if (!data) return [];
    if (!employeeSearch) return data.employees;
    const q = employeeSearch.toLowerCase();
    return data.employees.filter(e => 
      e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    );
  }, [data, employeeSearch]);

  const selectedEmployee = useMemo(() => 
    data?.employees.find(e => e.id === selectedEmployeeId),
    [data, selectedEmployeeId]
  );

  const handleApprove = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId: adminId,
        data: {
          status: "active",
          adminComments: adminComments[request.id] || null,
        }
      });
      toast({ title: "GM approval recorded — sent to IT Support" });
      setExpandedRequestId(null);
    } catch (err) {
      toast({ 
        title: "Failed to approve request", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const handleReject = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId: adminId,
        data: {
          status: "rejected",
          adminComments: adminComments[request.id] || null,
        }
      });
      toast({ title: "Request rejected" });
      setExpandedRequestId(null);
    } catch (err) {
      toast({ 
        title: "Failed to reject request", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const handleRegisterTicket = async (request: PrivilegeRequest) => {
    const ticketId = itTicketInputs[request.id]?.trim();
    if (!ticketId) {
      toast({ title: "Enter a ticket ID", variant: "destructive" });
      return;
    }
    try {
      await registerItTicket.mutateAsync({ requestId: request.id, ticketId });
      toast({ title: "Ticket registered" });
    } catch (err) {
      toast({
        title: "Failed to register ticket",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    }
  };

  const handleMarkItResolved = async (request: PrivilegeRequest) => {
    try {
      await markItResolved.mutateAsync(request.id);
      toast({ title: "Request marked resolved — privileges applied" });
      setExpandedRequestId(null);
    } catch (err) {
      toast({
        title: "Failed to mark resolved",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    }
  };

  const handleTerminate = async () => {
    if (!selectedEmployeeId) return;
    try {
      await terminateEmployee.mutateAsync({
        employeeId: selectedEmployeeId,
        adminId: adminId,
      });
      toast({ title: "Employee terminated successfully" });
      setShowTerminateDialog(false);
      setSelectedEmployeeId("");
    } catch (err) {
      toast({ 
        title: "Failed to terminate employee", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  if (isBootstrapLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-2 shadow-lg overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap relative">
          <div className="flex items-center gap-3">
            <DallahLogo size={34} />
            <h1 className="text-base font-bold tracking-tight md:text-lg text-white" data-testid="text-admin-title">{t.title}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/90 hover:bg-white/20" data-testid="link-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t.backToDashboard}
              </Button>
            </Link>

            <Link href="/admin/contacts">
              <Button variant="ghost" size="sm" className="text-white/90 hover:bg-white/20 gap-1.5">
                <Users className="h-4 w-4" />
                Contacts
              </Button>
            </Link>

            <div className="h-5 w-px bg-white/30" />

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold" data-testid="text-request-management-title">{t.requestManagement}</h2>
          
          <div className="rounded-lg border border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 p-4">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
              <TabsList className="mb-4" data-testid="tabs-status-filter">
                <TabsTrigger value="all" data-testid="tab-all">{t.all}</TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">{t.pending}</TabsTrigger>
                <TabsTrigger value="approved_pending_it" data-testid="tab-awaiting-it">{t.awaitingIt}</TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active">{t.active}</TabsTrigger>
                <TabsTrigger value="rejected" data-testid="tab-rejected">{t.rejected}</TabsTrigger>
              </TabsList>

              <TabsContent value={statusFilter}>
                {isRequestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-requests">
                    {t.noRequests}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-300 dark:border-slate-600">
                          <th className="text-left py-2 px-3 font-medium">{t.employee}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.manager}</th>
                          <th className="text-left py-2 px-3 font-medium">Company</th>
                          <th className="text-left py-2 px-3 font-medium">{t.moduleFunction}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.rolesCount}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.startDate}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.endDate}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.status}</th>
                          <th className="text-left py-2 px-3 font-medium">{t.createdDate}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((request) => {
                          const isExpanded = expandedRequestId === request.id;
                          const privileges = getPrivilegeDetails(request.rolesSelected);
                          const isRevoke = (request.requestType ?? "grant") === "revoke";
                          const typeLabel = getRequestTypeLabel(request, {
                            grant: t.grant,
                            delete: t.delete,
                          });
                          const executionState = formatRevokeExecutionState(request, {
                            scheduled: t.scheduled,
                            revoked: t.revoked,
                            reinstated: t.reinstated,
                            revokedUntil: t.revokedUntil,
                            noEndDate: t.noEndDate,
                          });
                          
                          return (
                            <>
                              <tr 
                                key={request.id}
                                className="border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors"
                                onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                                data-testid={`row-request-${request.id}`}
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <div>
                                      <div>{getEmployeeName(request.employeeId)}</div>
                                      <div className="text-xs text-slate-400 font-mono">{request.employeeId}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div>{getEmployeeName(request.managerId)}</div>
                                  {request.managerUserId && (
                                    <div className="text-xs text-slate-400 font-mono">{request.managerUserId}</div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-xs font-medium text-teal-700 dark:text-teal-400" dir="rtl">
                                    {getCompanyName(request.companyId)}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                          isRevoke
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-teal-100 text-teal-800",
                                        )}
                                      >
                                        {typeLabel}
                                      </span>
                                      {executionState && (
                                        <span className="text-[10px] font-medium text-slate-500">
                                          {executionState}
                                        </span>
                                      )}
                                    </div>
                                    <span>{request.module} / {request.function}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">{request.rolesSelected.length}</td>
                                <td className="py-3 px-3">{formatDate(request.startDate)}</td>
                                <td className="py-3 px-3">{request.endDate ? formatDate(request.endDate) : t.noEndDate}</td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-col gap-1">
                                    <StatusBadge status={request.status} size="sm" />
                                    {getItTicketLabel(request) && (
                                      <span className="text-[10px] font-mono text-indigo-700">
                                        {getItTicketLabel(request)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">{formatDate(request.createdAt)}</td>
                              </tr>
                              
                              {isExpanded && (
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                  <td colSpan={8} className="p-4">
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-medium mb-2">{t.roles}:</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {privileges.map((priv) => (
                                            <Badge key={priv?.id} variant="secondary" data-testid={`badge-role-${priv?.id}`}>
                                              {priv?.role}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      {request.status === "pending" ? (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="text-sm font-medium">{t.adminComment}</label>
                                            <Textarea
                                              placeholder={t.addComment}
                                              value={adminComments[request.id] || ""}
                                              onChange={(e) => setAdminComments(prev => ({
                                                ...prev,
                                                [request.id]: e.target.value
                                              }))}
                                              className="mt-1"
                                              data-testid={`input-admin-comment-${request.id}`}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={(e) => { e.stopPropagation(); handleApprove(request); }}
                                              disabled={updateRequest.isPending}
                                              data-testid={`button-approve-${request.id}`}
                                            >
                                              {updateRequest.isPending ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.approving}</>
                                              ) : (
                                                <><Check className="h-4 w-4 mr-1" />{t.approve}</>
                                              )}
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={(e) => { e.stopPropagation(); handleReject(request); }}
                                              disabled={updateRequest.isPending}
                                              data-testid={`button-reject-${request.id}`}
                                            >
                                              {updateRequest.isPending ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.rejecting}</>
                                              ) : (
                                                <><X className="h-4 w-4 mr-1" />{t.reject}</>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : request.status === "approved_pending_it" ? (
                                        <div className="space-y-3">
                                          {request.supportRequestTitle && (
                                            <p className="text-xs text-slate-500">
                                              Support title: <span className="font-medium text-slate-700">{request.supportRequestTitle}</span>
                                            </p>
                                          )}
                                          <div>
                                            <label className="text-sm font-medium">{t.ticketId}</label>
                                            <Input
                                              placeholder={t.ticketPlaceholder}
                                              value={itTicketInputs[request.id] ?? request.supportTicketId ?? ""}
                                              onChange={(e) => setItTicketInputs((prev) => ({
                                                ...prev,
                                                [request.id]: e.target.value,
                                              }))}
                                              className="mt-1 max-w-xs font-mono text-sm"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              variant="outline"
                                              onClick={(e) => { e.stopPropagation(); handleRegisterTicket(request); }}
                                              disabled={registerItTicket.isPending}
                                            >
                                              {t.registerTicket}
                                            </Button>
                                            <Button
                                              onClick={(e) => { e.stopPropagation(); handleMarkItResolved(request); }}
                                              disabled={markItResolved.isPending}
                                            >
                                              {t.markItResolved}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : request.adminComments ? (
                                        <div>
                                          <h4 className="font-medium mb-1">{t.adminComment}:</h4>
                                          <p className="text-muted-foreground" data-testid={`text-admin-comment-${request.id}`}>
                                            {request.adminComments}
                                          </p>
                                        </div>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {data && (
          <DataImportCenter
            counts={{
              privileges: data.privileges.length,
              employees: data.employees.length,
              assignments: data.assignments.length,
              companies: data.companies.length,
              accessUsers: accessUsersList?.length,
            }}
            labels={{
              sectionTitle: t.dataImportTitle,
              sectionSubtitle: t.dataImportSubtitle,
              recommendedOrder: t.recommendedOrder,
              mergeNote: t.mergeNote,
              selectFile: t.selectFile,
              upload: t.uploadImport,
              uploading: t.uploading,
              summary: t.importSummary,
              errors: t.importErrors,
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
              queryClient.invalidateQueries({ queryKey: ["/api/access-users"] });
              toast({ title: "Import completed" });
            }}
          />
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold" data-testid="text-termination-title">{t.employeeTermination}</h2>
          
          <div className="rounded-lg border border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchEmployee}
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-9"
                data-testid="input-employee-search"
              />
            </div>

            <div className="max-w-md">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger data-testid="select-employee-termination">
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} data-testid={`option-employee-${emp.id}`}>
                      {emp.name} ({emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowTerminateDialog(true)}
              disabled={!selectedEmployeeId}
              data-testid="button-terminate-employee"
            >
              <UserX className="h-4 w-4 mr-2" />
              {t.terminateEmployee}
            </Button>
          </div>
        </section>
      </main>

      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t.terminateConfirm}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <span className="font-medium text-foreground">{selectedEmployee.name}</span>
              )}
              <br />
              {t.terminateWarning}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)} data-testid="button-cancel-terminate">
              {t.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleTerminate}
              disabled={terminateEmployee.isPending}
              data-testid="button-confirm-terminate"
            >
              {terminateEmployee.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.terminating}</>
              ) : (
                t.confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
