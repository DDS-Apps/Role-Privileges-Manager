import { useState, useMemo } from "react";
import { Search, Users, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee, Privilege, Assignment, Company } from "@shared/schema";

interface AccessSearchCardProps {
  privileges: Privilege[];
  assignments: Assignment[];
  employees: Employee[];
  companies: Company[];
  companyId: string; // The manager's selected company
  onSelectEmployee?: (id: string) => void;
}

export function AccessSearchCard({
  privileges,
  assignments,
  employees,
  companies,
  companyId,
  onSelectEmployee,
}: AccessSearchCardProps) {
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [companyOnly, setCompanyOnly] = useState(false);

  const modules = useMemo(() => {
    return [...new Set(privileges.map(p => p.module))].sort();
  }, [privileges]);

  const functions = useMemo(() => {
    if (!selectedModule) return [];
    return [...new Set(
      privileges.filter(p => p.module === selectedModule).map(p => p.function)
    )].sort();
  }, [privileges, selectedModule]);

  // Privilege IDs matching selected module + function
  const matchingPrivIds = useMemo(() => {
    if (!selectedModule || !selectedFunction) return new Set<string>();
    return new Set(
      privileges
        .filter(p => p.module === selectedModule && p.function === selectedFunction)
        .map(p => p.id)
    );
  }, [privileges, selectedModule, selectedFunction]);

  // Employees who have at least one of those privileges in companyId
  const matchingEmployees = useMemo(() => {
    if (matchingPrivIds.size === 0) return [];

    // Find assignments for this company that contain matching privileges
    const empIds = new Set<string>();
    for (const a of assignments) {
      if (a.companyId !== companyId) continue;
      if (a.privilegeIds.some(id => matchingPrivIds.has(id))) {
        empIds.add(a.employeeId);
      }
    }

    // Fetch employee objects
    const result = employees.filter(e => empIds.has(e.id));

    // Apply company toggle
    if (companyOnly) {
      return result.filter(e => e.legalCompanyId === companyId);
    }
    return result;
  }, [assignments, employees, companyId, matchingPrivIds, companyOnly]);

  const companyName = companies.find(c => c.id === companyId)?.name ?? companyId;
  const externalCount = matchingEmployees.filter(e => e.legalCompanyId !== companyId).length;
  const internalCount = matchingEmployees.filter(e => e.legalCompanyId === companyId).length;

  const handleModuleChange = (v: string) => {
    setSelectedModule(v);
    setSelectedFunction("");
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <Search className="h-4 w-4 text-teal-600" />
          Access Search
        </h3>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 flex-1">
        {/* Module */}
        <Select value={selectedModule} onValueChange={handleModuleChange}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
            <SelectValue placeholder="Select Module" />
          </SelectTrigger>
          <SelectContent>
            {modules.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Function */}
        <Select
          value={selectedFunction}
          onValueChange={setSelectedFunction}
          disabled={!selectedModule}
        >
          <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
            <SelectValue placeholder="Select Function" />
          </SelectTrigger>
          <SelectContent>
            {functions.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="access-company-only"
            checked={companyOnly}
            onCheckedChange={v => setCompanyOnly(v as boolean)}
          />
          <Label htmlFor="access-company-only" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            Company Employees only
          </Label>
        </div>

        {/* Results */}
        {selectedFunction && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Has access to <span className="text-teal-600 font-semibold" dir="rtl">{companyName}</span>
              </span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Building2 className="h-2.5 w-2.5 mr-1" />
                  {internalCount}
                </Badge>
                {!companyOnly && externalCount > 0 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-teal-300 text-teal-700">
                    <Users className="h-2.5 w-2.5 mr-1" />
                    +{externalCount} ext.
                  </Badge>
                )}
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700">
              {matchingEmployees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No employees found</p>
              ) : (
                matchingEmployees.map(emp => {
                  const isExternal = emp.legalCompanyId !== companyId;
                  const empCompany = companies.find(c => c.id === emp.legalCompanyId);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => onSelectEmployee?.(emp.id)}
                      className="w-full px-3 py-2 flex items-start justify-between gap-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-700 dark:group-hover:text-teal-300">{emp.name}</p>
                        {isExternal && empCompany && (
                          <p className="text-xs text-teal-600 truncate" dir="rtl">{empCompany.name}</p>
                        )}
                      </div>
                      {isExternal && (
                        <Badge variant="outline" className="text-xs border-teal-300 text-teal-700 shrink-0 px-1.5 py-0">ext</Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedFunction && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
            <p className="text-xs text-slate-400">Select a module and function<br />to see who has access</p>
          </div>
        )}
      </div>
    </div>
  );
}
