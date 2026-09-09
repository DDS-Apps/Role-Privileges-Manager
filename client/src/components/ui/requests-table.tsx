import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Check, X, Loader2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { useUpdateRequest } from "@/hooks/use-app-data";
import { useToast } from "@/hooks/use-toast";
import type { PrivilegeRequest, Privilege, Company, Employee } from "@shared/schema";
import {
  getRequestTypeLabel,
  formatRevokeExecutionState,
  getApprovalStepBadge,
  getExternalApprovalLabel,
  getItTicketLabel,
} from "@/lib/request-utils";
import { cn } from "@/lib/utils";

interface RequestsTableProps {
  requests: PrivilegeRequest[];
  privileges: Privilege[];
  companies: Company[];
  employees?: Employee[];
  adminId?: string;
  canApproveRequest?: (request: PrivilegeRequest) => boolean;
  t: {
    moduleFunction: string;
    requestedRoles: string;
    startDate: string;
    endDate: string;
    status: string;
    noRequests: string;
    adminComment: string;
    noEndDate: string;
    employee: string;
    userId?: string;
    company: string;
    created: string;
    submittedBy?: string;
    grant?: string;
    delete?: string;
    scheduled?: string;
    revoked?: string;
    reinstated?: string;
    revokedUntil?: string;
    effectiveFrom?: string;
    reinstateAfter?: string;
    commentOptional?: string;
    addComment?: string;
    approve?: string;
    reject?: string;
    cancel?: string;
    requestApproved?: string;
    requestRejected?: string;
    approvalFailed?: string;
    externalGrant?: string;
    approvalStep1?: string;
    approvalStep2?: string;
    awaitingRequesterGm?: string;
    awaitingTargetGm?: string;
  };
}

export function RequestsTable({
  requests,
  privileges,
  companies,
  employees = [],
  adminId = "",
  canApproveRequest,
  t,
}: RequestsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const updateRequest = useUpdateRequest();
  const { toast } = useToast();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getPrivilegeDetails = (ids: string[]) => {
    return ids.map((id) => privileges.find((p) => p.id === id)).filter(Boolean) as Privilege[];
  };

  const getCompanyName = (id: string) => {
    return companies.find((c) => c.id === id)?.name || id;
  };

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || id;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleApprove = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId,
        data: { status: "active", adminComments: comments[request.id] || null },
      });
      toast({ title: t.requestApproved ?? "Request approved" });
      setComments((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    } catch (err) {
      toast({
        title: t.approvalFailed ?? "Action failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (request: PrivilegeRequest) => {
    try {
      await updateRequest.mutateAsync({
        requestId: request.id,
        adminId,
        data: { status: "rejected", adminComments: comments[request.id] || null },
      });
      toast({ title: t.requestRejected ?? "Request rejected" });
      setComments((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    } catch (err) {
      toast({
        title: t.approvalFailed ?? "Action failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    }
  };

  if (requests.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 dark:text-slate-400">
        {t.noRequests}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left dark:border-slate-700">
            <th className="w-8 px-3 py-3 font-medium text-slate-600 dark:text-slate-400" />
            <th className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
              {t.company}
            </th>
            <th className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
              {t.moduleFunction}
            </th>
            <th className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
              {t.startDate}
            </th>
            <th className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
              {t.endDate}
            </th>
            <th className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
              {t.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const isExpanded = expandedIds.has(request.id);
            const roleDetails = getPrivilegeDetails(request.rolesSelected);
            const showApproval = canApproveRequest?.(request) ?? false;
            const isRevoke = (request.requestType ?? "grant") === "revoke";
            const typeLabel = getRequestTypeLabel(request, {
              grant: t.grant ?? "Grant",
              delete: t.delete ?? "Delete",
            });
            const executionState = formatRevokeExecutionState(request, {
              scheduled: t.scheduled ?? "Scheduled",
              revoked: t.revoked ?? "Revoked",
              reinstated: t.reinstated ?? "Reinstated",
              revokedUntil: t.revokedUntil ?? "Revoked until {date}",
              noEndDate: t.noEndDate,
            });
            const stepBadge = getApprovalStepBadge(request, employees, {
              external: t.externalGrant ?? "External",
              step1of2: t.approvalStep1 ?? "Step 1 of 2",
              step2of2: t.approvalStep2 ?? "Step 2 of 2",
            });
            const approvalHint = getExternalApprovalLabel(request, employees, {
              external: t.externalGrant ?? "External",
              step1: t.approvalStep1 ?? "Step 1 of 2",
              step2: t.approvalStep2 ?? "Step 2 of 2",
              awaitingRequesterGm: t.awaitingRequesterGm ?? "Awaiting GM (your company)",
              awaitingTargetGm: t.awaitingTargetGm ?? "Awaiting GM (employee's company)",
            });
            const itTicket = getItTicketLabel(request);
            const startLabel = isRevoke ? (t.effectiveFrom ?? t.startDate) : t.startDate;
            const endLabel = isRevoke ? (t.reinstateAfter ?? t.endDate) : t.endDate;

            return (
              <Fragment key={request.id}>
                <tr
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  onClick={() => toggleExpand(request.id)}
                  data-testid={`request-row-${request.id}`}
                >
                  <td className="px-3 py-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-xs font-medium text-teal-700 dark:text-teal-400"
                      dir="rtl"
                    >
                      {getCompanyName(request.companyId)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            isRevoke
                              ? "bg-rose-100 text-rose-800"
                              : "bg-teal-100 text-teal-800",
                          )}
                        >
                          {typeLabel}
                        </span>
                        {stepBadge && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                            {stepBadge}
                          </span>
                        )}
                        {executionState && (
                          <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {executionState}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {request.module}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {request.function}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                    <span className="sr-only">{startLabel}: </span>
                    {formatDate(request.startDate)}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                    <span className="sr-only">{endLabel}: </span>
                    {request.endDate ? (
                      formatDate(request.endDate)
                    ) : (
                      <span className="italic text-slate-400 dark:text-slate-500">
                        {t.noEndDate}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={request.status} size="sm" />
                      {itTicket && (
                        <span className="text-[10px] font-mono text-indigo-700">{itTicket}</span>
                      )}
                      {approvalHint && request.status === "pending" && (
                        <span className="text-[10px] text-amber-700">{approvalHint}</span>
                      )}
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="bg-slate-50 dark:bg-slate-800/30">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t.employee}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {getEmployeeName(request.employeeId)}
                              <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">
                                {request.employeeId}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t.moduleFunction}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {request.module}
                              <span className="font-normal text-slate-400"> · </span>
                              {request.function}
                            </p>
                          </div>
                          {t.submittedBy && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t.submittedBy}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {getEmployeeName(request.managerId)}
                                <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">
                                  {request.managerUserId ?? request.managerId}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {t.company}:
                            </span>
                            <span
                              className="font-medium text-teal-700 dark:text-teal-400"
                              dir="rtl"
                            >
                              {getCompanyName(request.companyId)}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {t.created}:
                            </span>
                            <span>{formatDate(request.createdAt)}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t.requestedRoles} ({roleDetails.length})
                          </h4>
                          <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-700 marker:font-medium marker:text-slate-500 dark:text-slate-300 dark:marker:text-slate-400">
                            {roleDetails.map((role) => (
                              <li
                                key={role.id}
                                className="w-fit whitespace-nowrap rounded border border-slate-200 bg-slate-100 px-2 py-1 leading-none dark:border-slate-600 dark:bg-slate-700/60"
                              >
                                {role.role}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {request.adminComments && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                            <div className="mb-1 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                {t.adminComment}
                              </span>
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              {request.adminComments}
                            </p>
                          </div>
                        )}

                        {showApproval && (
                          <div
                            className="rounded-xl border border-amber-200/80 bg-white p-4 dark:border-amber-800/50 dark:bg-slate-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {t.commentOptional}
                              </label>
                              <Textarea
                                value={comments[request.id] ?? ""}
                                onChange={(e) =>
                                  setComments((prev) => ({
                                    ...prev,
                                    [request.id]: e.target.value,
                                  }))
                                }
                                placeholder={t.addComment}
                                rows={2}
                                className="resize-none text-sm"
                                data-testid={`request-approval-comment-${request.id}`}
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={updateRequest.isPending}
                                onClick={() => {
                                  setComments((prev) => {
                                    const next = { ...prev };
                                    delete next[request.id];
                                    return next;
                                  });
                                  setExpandedIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(request.id);
                                    return next;
                                  });
                                }}
                              >
                                {t.cancel}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={updateRequest.isPending}
                                onClick={() => handleReject(request)}
                                className="bg-rose-500 hover:bg-rose-600"
                                data-testid={`request-reject-${request.id}`}
                              >
                                {updateRequest.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="mr-1.5 h-4 w-4" />
                                    {t.reject}
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={updateRequest.isPending}
                                onClick={() => handleApprove(request)}
                                className="bg-teal-600 text-white hover:bg-teal-700"
                                data-testid={`request-approve-${request.id}`}
                              >
                                {updateRequest.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="mr-1.5 h-4 w-4" />
                                    {t.approve}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
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
  );
}
