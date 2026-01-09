import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { PrivilegeRequest, Privilege, Company } from "@shared/schema";

interface RequestsTableProps {
  requests: PrivilegeRequest[];
  privileges: Privilege[];
  companies: Company[];
  t: {
    moduleFunction: string;
    requestedRoles: string;
    startDate: string;
    endDate: string;
    status: string;
    noRequests: string;
    adminComment: string;
    roles: string;
    noEndDate: string;
  };
}

export function RequestsTable({ requests, privileges, companies, t }: RequestsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
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
    return ids.map(id => privileges.find(p => p.id === id)).filter(Boolean) as Privilege[];
  };

  const getCompanyName = (id: string) => {
    return companies.find(c => c.id === id)?.name || id;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        {t.noRequests}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400 w-8"></th>
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">Module & Function</th>
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">Requested Roles</th>
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">{t.startDate}</th>
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">{t.endDate}</th>
            <th className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const isExpanded = expandedIds.has(request.id);
            const roleDetails = getPrivilegeDetails(request.rolesSelected);
            
            return (
              <>
                <tr 
                  key={request.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(request.id)}
                  data-testid={`request-row-${request.id}`}
                >
                  <td className="py-3 px-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{request.module}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{request.function}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {roleDetails.slice(0, 2).map(role => (
                        <span 
                          key={role.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300"
                        >
                          {role.role.length > 25 ? role.role.substring(0, 25) + '...' : role.role}
                        </span>
                      ))}
                      {roleDetails.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-xs text-indigo-600 dark:text-indigo-300">
                          +{roleDetails.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {formatDate(request.startDate)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {request.endDate ? formatDate(request.endDate) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">{t.noEndDate}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={request.status} size="sm" />
                  </td>
                </tr>
                
                {isExpanded && (
                  <tr key={`${request.id}-expanded`} className="bg-slate-50 dark:bg-slate-800/30">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {t.roles} ({roleDetails.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {roleDetails.map(role => (
                              <span 
                                key={role.id}
                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300"
                              >
                                {role.role}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {request.adminComments && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
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

                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Company: {getCompanyName(request.companyId)} • 
                          Created: {formatDate(request.createdAt)}
                        </div>
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
  );
}
