import { useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee, Company } from "@shared/schema";

interface EmployeeSelectorProps {
  employees: Employee[];
  companies: Company[];
  selectedEmployeeId: string;
  onSelect: (employeeId: string) => void;
  managerLegalCompanyId: string;
  companyEmployeesOnly: boolean;
  onToggleCompanyEmployees: (checked: boolean) => void;
  t: {
    companyEmployees: string;
    allEmployees: string;
    selectEmployee: string;
    search: string;
  };
}

export function EmployeeSelector({
  employees,
  companies,
  selectedEmployeeId,
  onSelect,
  managerLegalCompanyId,
  companyEmployeesOnly,
  onToggleCompanyEmployees,
  t,
}: EmployeeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || companyId;
  };

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(e => !e.isManager);
    
    if (companyEmployeesOnly) {
      result = result.filter(e => e.legalCompanyId === managerLegalCompanyId);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.id.toLowerCase().includes(q) || 
        e.name.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [employees, companyEmployeesOnly, managerLegalCompanyId, searchQuery]);

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-md border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.selectEmployee}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="company-employees" 
            checked={companyEmployeesOnly}
            onCheckedChange={(checked) => onToggleCompanyEmployees(checked as boolean)}
            data-testid="checkbox-company-employees"
          />
          <Label 
            htmlFor="company-employees" 
            className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            {t.companyEmployees}
          </Label>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            data-testid="input-employee-search"
          />
        </div>

        <Select value={selectedEmployeeId} onValueChange={onSelect}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-900" data-testid="select-employee">
            <SelectValue placeholder={t.selectEmployee} />
          </SelectTrigger>
          <SelectContent>
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No employees found
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <SelectItem 
                  key={emp.id} 
                  value={emp.id}
                  data-testid={`option-employee-${emp.id}`}
                >
                  {companyEmployeesOnly ? (
                    emp.name
                  ) : (
                    <span>{emp.id} – {emp.name} – {getCompanyName(emp.legalCompanyId)}</span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
