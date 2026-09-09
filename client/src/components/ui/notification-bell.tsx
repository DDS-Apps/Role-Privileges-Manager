import { useState, useMemo, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Clock, XCircle, Check, X, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUpdateRequest } from "@/hooks/use-app-data";
import { useToast } from "@/hooks/use-toast";
import type { PrivilegeRequest, Employee, Company, Privilege } from "@shared/schema";
import type { AuthUser } from "@/hooks/use-auth";
import { getRequestTypeLabel, formatRevokeExecutionState, buildOwnerIds, isRequestOwnedByUser, isPendingForUserApproval, getApprovalStepBadge, getItTicketLabel } from "@/lib/request-utils";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  requests: PrivilegeRequest[];
  employees: Employee[];
  companies: Company[];
  privileges: Privilege[];
  managerId: string;
  authUser: AuthUser | null;
}

const STATUS_ICON = {
  pending:  <Clock       className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  approved_pending_it: <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />,
  active:   <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />,
  rejected: <XCircle     className="h-3.5 w-3.5 text-rose-500 shrink-0" />,
};

const STATUS_ORDER = { pending: 0, approved_pending_it: 1, active: 2, rejected: 3 };

function dismissedStorageKey(userKey: string) {
  return `rpm-dismissed-notifications:${userKey}`;
}

function loadDismissedIds(userKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(userKey));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(userKey: string, ids: Set<string>) {
  localStorage.setItem(dismissedStorageKey(userKey), JSON.stringify(Array.from(ids)));
}

export function NotificationBell({ requests, employees, companies, privileges, managerId, authUser }: NotificationBellProps) {
  const [open, setOpen]                   = useState(false);
  const [approvalReq, setApprovalReq]     = useState<PrivilegeRequest | null>(null);
  const [comment, setComment]             = useState("");
  const [dismissedIds, setDismissedIds]   = useState<Set<string>>(new Set());
  const updateRequest                     = useUpdateRequest();
  const { toast }                         = useToast();

  const userKey = authUser?.id || authUser?.userId || "anonymous";

  useEffect(() => {
    setDismissedIds(loadDismissedIds(userKey));
  }, [userKey]);

  const dismissNotification = useCallback(
    (requestId: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(requestId);
        saveDismissedIds(userKey, next);
        return next;
      });
      if (approvalReq?.id === requestId) {
        setApprovalReq(null);
        setComment("");
      }
    },
    [userKey, approvalReq?.id],
  );

  const dismissAllVisible = useCallback((ids: string[]) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveDismissedIds(userKey, next);
      return next;
    });
    setApprovalReq(null);
    setComment("");
  }, [userKey]);

  // GM companies for the logged-in user
  const gmCompanyIds = useMemo(() =>
    authUser?.companies.filter(c => c.role === "GM").map(c => c.companyId) ?? [],
    [authUser]
  );
  const isApprover = authUser?.isAdmin || gmCompanyIds.length > 0;

  // Requests the user can approve:
  // - pending status
  // - NOT submitted by this user (no self-approval)
  // - employee is in a company where this user is GM (or system admin sees all)
  const ownerIds = useMemo(
    () => buildOwnerIds(managerId, authUser?.id, authUser?.userId),
    [managerId, authUser?.id, authUser?.userId],
  );

  const accessibleCompanyIds = useMemo(
    () => new Set(authUser?.companies.map((c) => c.companyId) ?? []),
    [authUser],
  );

  const approvalOptions = useMemo(
    () => ({
      isAdmin: Boolean(authUser?.isAdmin),
      accessibleCompanyIds,
      gmLegalCompanyIds: gmCompanyIds,
      employees,
    }),
    [authUser?.isAdmin, accessibleCompanyIds, gmCompanyIds, employees],
  );

  const toApprove = useMemo(() => {
    if (!isApprover) return [];
    return requests
      .filter((r) => isPendingForUserApproval(r, ownerIds, approvalOptions))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [requests, isApprover, ownerIds, approvalOptions]);

  const visibleToApprove = useMemo(
    () => toApprove.filter((r) => !dismissedIds.has(r.id)),
    [toApprove, dismissedIds],
  );

  // My submitted requests
  const myRequests = useMemo(
    () =>
      [...requests]
        .filter((r) => isRequestOwnedByUser(r, ownerIds))
        .sort((a, b) => {
          const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          return d !== 0
            ? d
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [requests, ownerIds],
  );

  const visibleMyRequests = useMemo(
    () => myRequests.filter((r) => !dismissedIds.has(r.id)),
    [myRequests, dismissedIds],
  );

  const badgeCount =
    visibleToApprove.length ||
    visibleMyRequests.filter((r) => r.status === "pending" || r.status === "approved_pending_it").length;

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id;
  const getCompanyName  = (id: string) => companies.find(c => c.id === id)?.name || id;
  const formatDate      = (s: string)  =>
    new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const canApproveReq = (req: PrivilegeRequest) =>
    isPendingForUserApproval(req, ownerIds, approvalOptions);

  const handleApprove = async () => {
    if (!approvalReq) return;
    try {
      await updateRequest.mutateAsync({
        requestId: approvalReq.id,
        adminId: authUser?.id || "",
        data: { status: "active", adminComments: comment || null },
      });
      toast({ title: "GM approved — sent to IT Support" });
      setApprovalReq(null);
      setComment("");
    } catch (err) {
      toast({ title: "Failed to approve", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!approvalReq) return;
    try {
      await updateRequest.mutateAsync({
        requestId: approvalReq.id,
        adminId: authUser?.id || "",
        data: { status: "rejected", adminComments: comment || null },
      });
      toast({ title: "Request rejected" });
      setApprovalReq(null);
      setComment("");
    } catch (err) {
      toast({ title: "Failed to reject", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const RequestRow = ({
    req,
    showApproveHint,
    onDismiss,
  }: {
    req: PrivilegeRequest;
    showApproveHint?: boolean;
    onDismiss: (id: string) => void;
  }) => {
    const clickable = req.status === "pending" && showApproveHint;
    const isRevoke = (req.requestType ?? "grant") === "revoke";
    const typeLabel = getRequestTypeLabel(req, { grant: "Grant", delete: "Delete" });
    const stepBadge = getApprovalStepBadge(req, employees, {
      external: "External",
      step1of2: "Step 1/2",
      step2of2: "Step 2/2",
    });
    const itTicket = getItTicketLabel(req);
    const executionState = formatRevokeExecutionState(req, {
      scheduled: "Scheduled",
      revoked: "Revoked",
      reinstated: "Reinstated",
      revokedUntil: "Revoked until {date}",
      noEndDate: "No end date",
    });
    return (
      <div
        onClick={() => { if (clickable) { setOpen(false); setTimeout(() => { setApprovalReq(req); setComment(""); }, 150); } }}
        className={`group px-4 py-3 transition-colors ${
          req.status === "pending" ? "border-l-2 border-amber-400" :
          req.status === "active"  ? "border-l-2 border-teal-500" : "border-l-2 border-rose-400"
        } ${clickable ? "cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {STATUS_ICON[req.status]}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {getEmployeeName(req.employeeId)}
              </span>
              <span className="text-xs text-slate-400 font-mono shrink-0">{req.employeeId}</span>
            </div>
            <div className="ml-5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  isRevoke ? "bg-rose-100 text-rose-800" : "bg-teal-100 text-teal-800",
                )}
              >
                {typeLabel}
              </span>
              {stepBadge && (
                <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                  {stepBadge}
                </span>
              )}
              {executionState && (
                <span className="text-[10px] font-medium text-slate-500">{executionState}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 ml-5">{req.module} · {req.function}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 ml-5 truncate" dir="rtl">{getCompanyName(req.companyId)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(req.id);
              }}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-700"
              title="Dismiss notification"
              aria-label="Dismiss notification"
              data-testid={`dismiss-notification-${req.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <StatusBadge status={req.status} size="sm" />
            {itTicket && (
              <p className="text-[10px] font-mono text-indigo-600">{itTicket}</p>
            )}
            <p className="text-xs text-slate-400">{formatDate(req.createdAt)}</p>
            {clickable && (
              <p className="text-[10px] font-medium text-amber-600">Tap to review →</p>
            )}
          </div>
        </div>
        {req.adminComments && (
          <p className="mt-1.5 ml-5 text-xs italic text-slate-500 bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 truncate">
            "{req.adminComments}"
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Bell trigger ─────────────────────────────────────────────────── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center leading-none">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8}
          className="w-96 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Bell className="h-4 w-4 text-teal-400" />
              <span className="font-semibold text-sm">Notifications</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {visibleToApprove.length > 0 && (
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 font-medium text-amber-300">
                  {visibleToApprove.length} to approve
                </span>
              )}
              {(visibleToApprove.length > 0 || visibleMyRequests.length > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    dismissAllVisible([
                      ...visibleToApprove.map((r) => r.id),
                      ...visibleMyRequests.map((r) => r.id),
                    ])
                  }
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  data-testid="button-dismiss-all-notifications"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">

            {/* ── To Approve section (GMs/admins) ──────────────────────── */}
            {visibleToApprove.length > 0 && (
              <>
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Pending your approval ({visibleToApprove.length})
                  </p>
                </div>
                {visibleToApprove.map(req => (
                  <RequestRow key={req.id} req={req} showApproveHint onDismiss={dismissNotification} />
                ))}
              </>
            )}

            {/* ── My Requests section ──────────────────────────────────── */}
            {visibleMyRequests.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">My submitted requests ({visibleMyRequests.length})</p>
                </div>
                {visibleMyRequests.map(req => (
                  <RequestRow key={req.id} req={req} showApproveHint={false} onDismiss={dismissNotification} />
                ))}
              </>
            )}

            {visibleToApprove.length === 0 && visibleMyRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Approval Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!approvalReq} onOpenChange={v => { if (!v) { setApprovalReq(null); setComment(""); } }}>
        {approvalReq && (
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                {(approvalReq.requestType ?? "grant") === "revoke"
                  ? "Review Delete Request"
                  : "Review Request"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Employee */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Employee</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{getEmployeeName(approvalReq.employeeId)}</p>
                  <p className="text-xs text-slate-400 font-mono">{approvalReq.employeeId}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Company</p>
                  <p className="font-semibold text-teal-700 dark:text-teal-400 text-xs" dir="rtl">
                    {getCompanyName(approvalReq.companyId)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm">
                <p className="text-xs text-slate-400 mb-1">
                  {(approvalReq.requestType ?? "grant") === "revoke" ? "Effective period" : "Module / Function"}
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{approvalReq.module} · {approvalReq.function}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(approvalReq.requestType ?? "grant") === "revoke" ? "Remove from" : "Start"} {approvalReq.startDate}
                  {approvalReq.endDate
                    ? (approvalReq.requestType === "revoke" ? ` · Reinstate after ${approvalReq.endDate}` : ` → ${approvalReq.endDate}`)
                    : " (no end date)"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-2">
                  {(approvalReq.requestType ?? "grant") === "revoke" ? "Roles to remove" : "Roles"} ({approvalReq.rolesSelected.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {approvalReq.rolesSelected.map(id => {
                    const priv = privileges.find(p => p.id === id);
                    return (
                      <span key={id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300">
                        {priv?.role ?? id}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm">
                <p className="text-xs text-slate-400 mb-1">Submitted by</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {getEmployeeName(approvalReq.managerId)}
                  {approvalReq.managerUserId && (
                    <span className="ml-2 text-xs font-mono text-slate-400">{approvalReq.managerUserId}</span>
                  )}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comment (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setApprovalReq(null); setComment(""); }}
                disabled={updateRequest.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={updateRequest.isPending}
                className="bg-rose-500 hover:bg-rose-600">
                {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1.5" />Reject</>}
              </Button>
              <Button onClick={handleApprove} disabled={updateRequest.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white">
                {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" />Approve</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
