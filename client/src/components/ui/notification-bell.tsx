import { useState, useMemo } from "react";
import { Bell, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PrivilegeRequest, Employee, Company } from "@shared/schema";

interface NotificationBellProps {
  requests: PrivilegeRequest[];
  employees: Employee[];
  companies: Company[];
  managerId: string; // current user's employee SAP id
}

const STATUS_ICON = {
  pending: <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  active:  <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />,
  rejected:<XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />,
};

const STATUS_ORDER = { pending: 0, active: 1, rejected: 2 };

export function NotificationBell({
  requests,
  employees,
  companies,
  managerId,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  // My requests only
  const myRequests = useMemo(() =>
    [...requests]
      .filter(r => r.managerId === managerId)
      .sort((a, b) => {
        // Pending first, then by created date desc
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [requests, managerId]
  );

  const pendingCount = useMemo(
    () => myRequests.filter(r => r.status === "pending").length,
    [myRequests]
  );

  const getEmployeeName = (id: string) =>
    employees.find(e => e.id === id)?.name || id;

  const getCompanyName = (id: string) =>
    companies.find(c => c.id === id)?.name || id;

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          title="My Requests"
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center leading-none">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Bell className="h-4 w-4 text-teal-400" />
            <span className="font-semibold text-sm">My Requests</span>
            <span className="text-xs text-white/50">({myRequests.length})</span>
          </div>
          <div className="flex gap-2 text-xs">
            {[
              { label: "Pending",  count: myRequests.filter(r => r.status === "pending").length,  color: "bg-amber-400/20 text-amber-300" },
              { label: "Active",   count: myRequests.filter(r => r.status === "active").length,   color: "bg-teal-400/20 text-teal-300" },
              { label: "Rejected", count: myRequests.filter(r => r.status === "rejected").length, color: "bg-rose-400/20 text-rose-300" },
            ].map(s => s.count > 0 && (
              <span key={s.label} className={`px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>
                {s.count} {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No requests yet</p>
            </div>
          ) : (
            myRequests.map(req => (
              <div
                key={req.id}
                className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  req.status === "pending" ? "border-l-2 border-amber-400" :
                  req.status === "active"  ? "border-l-2 border-teal-500" :
                                             "border-l-2 border-rose-400"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {STATUS_ICON[req.status]}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {getEmployeeName(req.employeeId)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono shrink-0">{req.employeeId}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 ml-5">
                      {req.module} · {req.function}
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 ml-5 truncate" dir="rtl">
                      {getCompanyName(req.companyId)}
                    </p>
                  </div>
                  {/* Right */}
                  <div className="text-right shrink-0">
                    <StatusBadge status={req.status} size="sm" />
                    <p className="text-xs text-slate-400 mt-1">{formatDate(req.createdAt)}</p>
                  </div>
                </div>

                {/* Admin comment if present */}
                {req.adminComments && (
                  <p className="mt-1.5 ml-5 text-xs italic text-slate-500 bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 truncate">
                    "{req.adminComments}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
