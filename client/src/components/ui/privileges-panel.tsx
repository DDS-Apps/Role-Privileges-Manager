import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ShieldCheck, Building2 } from "lucide-react";
import type { Privilege, Company, PrivilegeRequest } from "@shared/schema";

interface PrivilegesPanelProps {
  allPrivileges: Privilege[];
  companyAssignments: { company: Company; privilegeIds: string[] }[];
  activeRequests: PrivilegeRequest[];
  t: {
    currentPrivilege: string;
    noPrivileges: string;
    rolesAssigned: string;
    noEndDate: string;
  };
}

export function PrivilegesPanel({ 
  allPrivileges, 
  companyAssignments,
  activeRequests,
  t 
}: PrivilegesPanelProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleModule = (key: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  const toggleFunction = (key: string) => {
    setExpandedFunctions(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  const moduleGroups = useMemo(() => {
    const groups: Record<string, Record<string, Privilege[]>> = {};
    for (const priv of allPrivileges) {
      if (!groups[priv.module]) groups[priv.module] = {};
      if (!groups[priv.module][priv.function]) groups[priv.module][priv.function] = [];
      groups[priv.module][priv.function].push(priv);
    }
    return groups;
  }, [allPrivileges]);

  const totalRoles = companyAssignments.reduce((sum, ca) => sum + ca.privilegeIds.length, 0);

  if (companyAssignments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t.currentPrivilege}</h3>
        </div>
        <div className="text-center py-12 px-4">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">{t.noPrivileges}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t.currentPrivilege}</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-medium">
          {totalRoles} {t.rolesAssigned}
        </span>
      </div>

      {/* Body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {companyAssignments.map(({ company, privilegeIds }) => {
          const isExpanded = expandedCompanies.has(company.id);
          
          return (
            <div key={company.id}>
              <button
                onClick={() => toggleCompany(company.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
                data-testid={`toggle-company-${company.id}`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-teal-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-teal-600" />
                  )}
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{company.name}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {privilegeIds.length}
                </span>
              </button>

              {isExpanded && (
                <div className="bg-slate-50/50 dark:bg-slate-900/30">
                  {Object.entries(moduleGroups).sort(([a], [b]) => a.localeCompare(b)).map(([moduleName, functionGroups]) => {
                    const moduleKey = `${company.id}-${moduleName}`;
                    const isModuleExpanded = expandedModules.has(moduleKey);
                    
                    const moduleCount = Object.values(functionGroups)
                      .flat()
                      .filter(p => privilegeIds.includes(p.id)).length;
                    
                    if (moduleCount === 0) return null;

                    return (
                      <div key={moduleKey} className="border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => toggleModule(moduleKey)}
                          className="w-full flex items-center gap-2 px-4 py-2 pl-8 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                          data-testid={`toggle-module-${moduleKey}`}
                        >
                          {isModuleExpanded ? (
                            <ChevronDown className="h-3 w-3 text-teal-600" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-teal-600" />
                          )}
                          <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-medium">
                            {moduleName}
                          </span>
                          <span className="text-xs text-slate-400">({moduleCount})</span>
                        </button>

                        {isModuleExpanded && Object.entries(functionGroups).sort(([a], [b]) => a.localeCompare(b)).map(([funcName, funcPrivs]) => {
                          const funcKey = `${moduleKey}-${funcName}`;
                          const isFuncExpanded = expandedFunctions.has(funcKey);
                          
                          const assignedRoles = funcPrivs.filter(p => privilegeIds.includes(p.id));
                          if (assignedRoles.length === 0) return null;

                          const matchingRequest = activeRequests.find(
                            r => r.companyId === company.id && r.module === moduleName && r.function === funcName
                          );

                          return (
                            <div key={funcKey}>
                              <button
                                onClick={() => toggleFunction(funcKey)}
                                className="w-full flex items-center gap-2 px-4 py-2 pl-12 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                data-testid={`toggle-function-${funcKey}`}
                              >
                                {isFuncExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-600 dark:text-slate-400">{funcName}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {assignedRoles.length}
                                </span>
                                {matchingRequest && (
                                  <span className="text-xs text-teal-600 dark:text-teal-400 ml-auto">
                                    {matchingRequest.startDate} - {matchingRequest.endDate || t.noEndDate}
                                  </span>
                                )}
                              </button>

                              {isFuncExpanded && (
                                <div className="pl-16 pr-4 pb-2 space-y-1">
                                  {assignedRoles.sort((a, b) => a.role.localeCompare(b.role)).map(role => (
                                    <div 
                                      key={role.id}
                                      className="flex items-center gap-2 py-1.5 text-sm text-slate-600 dark:text-slate-300"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                                      {role.role}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
