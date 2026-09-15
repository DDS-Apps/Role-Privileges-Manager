import { Fragment, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useBootstrapData,
  useRequests,
  useUpdateRequest,
  useRegisterItTicket,
  useMarkItResolved,
} from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  Globe,
  ArrowLeft,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PrivilegeRequest, RequestStatus, RequestType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  getRequestTypeLabel,
  formatRevokeExecutionState,
  getItTicketLabel,
} from "@/lib/request-utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type Language = "en" | "ar";
type StatusFilter = RequestStatus | "all";
type TypeFilter = RequestType | "all";

const DICT = {
  en: {
    title: "Request Management",
    backToAdmin: "Admin Panel",
    all: "All",
    pending: "Pending",
    active: "Approved",
    rejected: "Rejected",
    awaitingIt: "Awaiting IT",
    employee: "Employee",
    manager: "Manager",
    company: "Company",
    moduleFunction: "Module / Function",
    rolesCount: "Roles",
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
    createdDate: "Created",
    noRequests: "No requests found",
    noMatches: "No requests match your filters",
    roles: "Roles",
    adminComment: "Admin Comment",
    addComment: "Add comment (optional)...",
    approve: "Approve",
    reject: "Reject",
    approving: "Approving...",
    rejecting: "Rejecting...",
    noEndDate: "No end date",
    grant: "Grant",
    delete: "Delete",
    scheduled: "Scheduled",
    revoked: "Revoked",
    reinstated: "Reinstated",
    revokedUntil: "Revoked until {date}",
    ticketId: "Ticket ID",
    registerTicket: "Register ticket",
    markItResolved: "Mark IT resolved",
    ticketPlaceholder: "##RE-20217##",
    searchPlaceholder: "Search employee, manager, module, company, ticket…",
    allCompanies: "All companies",
    allModules: "All modules",
    allTypes: "All types",
    typeGrant: "Grant",
    typeRevoke: "Delete",
    results: "{count} request(s)",
    clearFilters: "Clear filters",
  },
  ar: {
    title: "إدارة الطلبات",
    backToAdmin: "لوحة الإدارة",
    all: "الكل",
    pending: "معلق",
    active: "معتمد",
    rejected: "مرفوض",
    awaitingIt: "بانتظار IT",
    employee: "الموظف",
    manager: "المدير",
    company: "الشركة",
    moduleFunction: "الوحدة / الوظيفة",
    rolesCount: "الأدوار",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    status: "الحالة",
    createdDate: "تاريخ الإنشاء",
    noRequests: "لا توجد طلبات",
    noMatches: "لا توجد طلبات مطابقة للتصفية",
    roles: "الأدوار",
    adminComment: "تعليق المسؤول",
    addComment: "أضف تعليق (اختياري)...",
    approve: "موافقة",
    reject: "رفض",
    approving: "جاري الموافقة...",
    rejecting: "جاري الرفض...",
    noEndDate: "لا يوجد تاريخ انتهاء",
    grant: "منح",
    delete: "حذف",
    scheduled: "مجدول",
    revoked: "ملغى",
    reinstated: "مُستعاد",
    revokedUntil: "ملغى حتى {date}",
    ticketId: "رقم التذكرة",
    registerTicket: "تسجيل التذكرة",
    markItResolved: "تأكيد إنجاز IT",
    ticketPlaceholder: "##RE-20217##",
    searchPlaceholder: "ابحث بالموظف أو المدير أو الوحدة أو الشركة أو التذكرة…",
    allCompanies: "جميع الشركات",
    allModules: "جميع الوحدات",
    allTypes: "جميع الأنواع",
    typeGrant: "منح",
    typeRevoke: "حذف",
    results: "{count} طلب",
    clearFilters: "مسح التصفية",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

function requestMatchesSearch(
  request: PrivilegeRequest,
  query: string,
  getEmployeeName: (id: string) => string,
  getCompanyName: (id: string) => string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const ticket = getItTicketLabel(request) ?? "";
  const haystack = [
    request.employeeId,
    getEmployeeName(request.employeeId),
    request.managerId,
    request.managerUserId ?? "",
    getEmployeeName(request.managerId),
    request.companyId,
    getCompanyName(request.companyId),
    request.module,
    request.function,
    request.supportTicketId ?? "",
    request.supportRequestTitle ?? "",
    ticket,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function AdminRequestsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [adminComments, setAdminComments] = useState<Record<string, string>>({});
  const [itTicketInputs, setItTicketInputs] = useState<Record<string, string>>({});

  const { data: authUser } = useAuth();
  const { data, isLoading: isBootstrapLoading } = useBootstrapData();
  const adminId = authUser?.id || "";

  const gmCompanyIds = authUser?.isAdmin
    ? undefined
    : authUser?.companies.filter((c) => c.role === "GM").map((c) => c.companyId);

  const { data: requests, isLoading: isRequestsLoading } = useRequests(
    statusFilter === "all"
      ? gmCompanyIds?.length
        ? { targetCompanyIds: gmCompanyIds }
        : undefined
      : {
          status: statusFilter,
          ...(gmCompanyIds?.length ? { targetCompanyIds: gmCompanyIds } : {}),
        },
  );

  const updateRequest = useUpdateRequest();
  const registerItTicket = useRegisterItTicket();
  const markItResolved = useMarkItResolved();
  const { toast } = useToast();

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const getEmployeeName = (id: string) =>
    data?.employees.find((e) => e.id === id)?.name || id;

  const getCompanyName = (id: string) =>
    data?.companies.find((c) => c.id === id)?.name || id;

  const getPrivilegeDetails = (privilegeIds: string[]) => {
    if (!data) return [];
    return privilegeIds
      .map((id) => data.privileges.find((p) => p.id === id))
      .filter(Boolean);
  };

  const moduleOptions = useMemo(() => {
    if (!requests) return [];
    return Array.from(new Set(requests.map((r) => r.module))).sort((a, b) =>
      a.localeCompare(b, language),
    );
  }, [requests, language]);

  const companyOptions = useMemo(() => {
    if (!data || !requests) return [];
    const ids = new Set(requests.map((r) => r.companyId));
    return data.companies
      .filter((c) => ids.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }, [data, requests, language]);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((request) => {
      if (companyFilter && request.companyId !== companyFilter) return false;
      if (moduleFilter && request.module !== moduleFilter) return false;
      if (typeFilter !== "all" && (request.requestType ?? "grant") !== typeFilter) {
        return false;
      }
      return requestMatchesSearch(
        request,
        searchQuery,
        getEmployeeName,
        getCompanyName,
      );
    });
  }, [
    requests,
    companyFilter,
    moduleFilter,
    typeFilter,
    searchQuery,
    data,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(companyFilter) ||
    Boolean(moduleFilter) ||
    typeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setCompanyFilter("");
    setModuleFilter("");
    setTypeFilter("all");
  };

  const handleApprove = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId,
        data: {
          status: "active",
          adminComments: adminComments[request.id] || null,
        },
      });
      toast({ title: "GM approval recorded — sent to IT Support" });
      setExpandedRequestId(null);
    } catch (err) {
      toast({
        title: "Failed to approve request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId,
        data: {
          status: "rejected",
          adminComments: adminComments[request.id] || null,
        },
      });
      toast({ title: "Request rejected" });
      setExpandedRequestId(null);
    } catch (err) {
      toast({
        title: "Failed to reject request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
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
            <Link href="/admin">
              <button className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
                <ArrowLeft className="h-4 w-4" />
                {t.backToAdmin}
              </button>
            </Link>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-400" />
              <h1 className="text-base font-bold tracking-tight md:text-lg text-white">
                {t.title}
              </h1>
            </div>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {language.toUpperCase()}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-9 h-9 text-sm"
                data-testid="input-request-search"
              />
            </div>

            <Select
              value={companyFilter || "__all__"}
              onValueChange={(v) => setCompanyFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-[180px] text-sm" data-testid="select-company-filter">
                <SelectValue placeholder={t.allCompanies} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t.allCompanies}</SelectItem>
                {companyOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={moduleFilter || "__all__"}
              onValueChange={(v) => setModuleFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-[160px] text-sm" data-testid="select-module-filter">
                <SelectValue placeholder={t.allModules} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t.allModules}</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            >
              <SelectTrigger className="h-9 w-[140px] text-sm" data-testid="select-type-filter">
                <SelectValue placeholder={t.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allTypes}</SelectItem>
                <SelectItem value="grant">{t.typeGrant}</SelectItem>
                <SelectItem value="revoke">{t.typeRevoke}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>
                {t.clearFilters}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <TabsList data-testid="tabs-status-filter">
                <TabsTrigger value="all">{t.all}</TabsTrigger>
                <TabsTrigger value="pending">{t.pending}</TabsTrigger>
                <TabsTrigger value="approved_pending_it">{t.awaitingIt}</TabsTrigger>
                <TabsTrigger value="active">{t.active}</TabsTrigger>
                <TabsTrigger value="rejected">{t.rejected}</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-xs text-slate-500">
              {t.results.replace("{count}", String(filteredRequests.length))}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Tabs value={statusFilter}>
            <TabsContent value={statusFilter} className="m-0">
              {isRequestsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-requests">
                  {hasActiveFilters || statusFilter !== "all" ? t.noMatches : t.noRequests}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-2.5 px-3 font-medium">{t.employee}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.manager}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.company}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.moduleFunction}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.rolesCount}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.startDate}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.endDate}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.status}</th>
                        <th className="text-left py-2.5 px-3 font-medium">{t.createdDate}</th>
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
                          <Fragment key={request.id}>
                            <tr
                              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() =>
                                setExpandedRequestId(isExpanded ? null : request.id)
                              }
                              data-testid={`row-request-${request.id}`}
                            >
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                  )}
                                  <div>
                                    <div>{getEmployeeName(request.employeeId)}</div>
                                    <div className="text-xs text-slate-400 font-mono">
                                      {request.employeeId}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div>{getEmployeeName(request.managerId)}</div>
                                {request.managerUserId && (
                                  <div className="text-xs text-slate-400 font-mono">
                                    {request.managerUserId}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className="text-xs font-medium text-teal-700"
                                  dir="auto"
                                >
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
                                  <span>
                                    {request.module} / {request.function}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">{request.rolesSelected.length}</td>
                              <td className="py-3 px-3">{formatDate(request.startDate)}</td>
                              <td className="py-3 px-3">
                                {request.endDate
                                  ? formatDate(request.endDate)
                                  : t.noEndDate}
                              </td>
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
                              <tr className="bg-slate-50">
                                <td colSpan={9} className="p-4">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-2">{t.roles}:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {privileges.map((priv) => (
                                          <Badge
                                            key={priv?.id}
                                            variant="secondary"
                                            data-testid={`badge-role-${priv?.id}`}
                                          >
                                            {priv?.role}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {request.status === "pending" ? (
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium">
                                            {t.adminComment}
                                          </label>
                                          <Textarea
                                            placeholder={t.addComment}
                                            value={adminComments[request.id] || ""}
                                            onChange={(e) =>
                                              setAdminComments((prev) => ({
                                                ...prev,
                                                [request.id]: e.target.value,
                                              }))
                                            }
                                            className="mt-1"
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`input-admin-comment-${request.id}`}
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApprove(request);
                                            }}
                                            disabled={updateRequest.isPending}
                                            data-testid={`button-approve-${request.id}`}
                                          >
                                            {updateRequest.isPending ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                {t.approving}
                                              </>
                                            ) : (
                                              <>
                                                <Check className="h-4 w-4 mr-1" />
                                                {t.approve}
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleReject(request);
                                            }}
                                            disabled={updateRequest.isPending}
                                            data-testid={`button-reject-${request.id}`}
                                          >
                                            {updateRequest.isPending ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                {t.rejecting}
                                              </>
                                            ) : (
                                              <>
                                                <X className="h-4 w-4 mr-1" />
                                                {t.reject}
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : request.status === "approved_pending_it" ? (
                                      <div className="space-y-3">
                                        {request.supportRequestTitle && (
                                          <p className="text-xs text-slate-500">
                                            Support title:{" "}
                                            <span className="font-medium text-slate-700">
                                              {request.supportRequestTitle}
                                            </span>
                                          </p>
                                        )}
                                        <div>
                                          <label className="text-sm font-medium">
                                            {t.ticketId}
                                          </label>
                                          <Input
                                            placeholder={t.ticketPlaceholder}
                                            value={
                                              itTicketInputs[request.id] ??
                                              request.supportTicketId ??
                                              ""
                                            }
                                            onChange={(e) =>
                                              setItTicketInputs((prev) => ({
                                                ...prev,
                                                [request.id]: e.target.value,
                                              }))
                                            }
                                            className="mt-1 max-w-xs font-mono text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRegisterTicket(request);
                                            }}
                                            disabled={registerItTicket.isPending}
                                          >
                                            {t.registerTicket}
                                          </Button>
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMarkItResolved(request);
                                            }}
                                            disabled={markItResolved.isPending}
                                          >
                                            {t.markItResolved}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : request.adminComments ? (
                                      <div>
                                        <h4 className="font-medium mb-1">
                                          {t.adminComment}:
                                        </h4>
                                        <p
                                          className="text-muted-foreground"
                                          data-testid={`text-admin-comment-${request.id}`}
                                        >
                                          {request.adminComments}
                                        </p>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
