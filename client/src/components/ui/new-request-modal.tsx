import { useState, useEffect, useMemo } from "react";
import { Loader2, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import type { Privilege, Company } from "@shared/schema";

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    companyId: string;
    module: string;
    function: string;
    rolesSelected: string[];
    startDate: string;
    endDate: string | null;
  }) => Promise<void>;
  privileges: Privilege[];
  companies: Company[];
  isSubmitting: boolean;
  t: {
    newRequest: string;
    company: string;
    module: string;
    function: string;
    role: string;
    startDate: string;
    endDate: string;
    submitRequest: string;
    submitting: string;
    cancel: string;
    selectAll: string;
    unselectAll: string;
  };
}

export function NewRequestModal({
  open,
  onClose,
  onSubmit,
  privileges,
  companies,
  isSubmitting,
  t,
}: NewRequestModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [roleSelections, setRoleSelections] = useState<Record<string, boolean>>({});
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");

  const modules = useMemo(() => {
    const mods = new Set(privileges.map(p => p.module));
    return Array.from(mods).sort();
  }, [privileges]);

  const functions = useMemo(() => {
    if (!selectedModule) return [];
    const funcs = new Set(
      privileges
        .filter(p => p.module === selectedModule)
        .map(p => p.function)
    );
    return Array.from(funcs).sort();
  }, [privileges, selectedModule]);

  const roles = useMemo(() => {
    if (!selectedModule || !selectedFunction) return [];
    return privileges
      .filter(p => p.module === selectedModule && p.function === selectedFunction)
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [privileges, selectedModule, selectedFunction]);

  useEffect(() => {
    if (roles.length > 0) {
      const selections: Record<string, boolean> = {};
      roles.forEach(r => { selections[r.id] = true; });
      setRoleSelections(selections);
    }
  }, [roles]);

  useEffect(() => {
    setSelectedFunction("");
    setRoleSelections({});
  }, [selectedModule]);

  const handleSelectAll = () => {
    const selections: Record<string, boolean> = {};
    roles.forEach(r => { selections[r.id] = true; });
    setRoleSelections(selections);
  };

  const handleUnselectAll = () => {
    const selections: Record<string, boolean> = {};
    roles.forEach(r => { selections[r.id] = false; });
    setRoleSelections(selections);
  };

  const handleSubmit = async () => {
    const selectedRoles = Object.entries(roleSelections)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    await onSubmit({
      companyId: selectedCompanyId,
      module: selectedModule,
      function: selectedFunction,
      rolesSelected: selectedRoles,
      startDate,
      endDate: endDate || null,
    });
  };

  const selectedCount = Object.values(roleSelections).filter(Boolean).length;
  const canSubmit = selectedCompanyId && selectedModule && selectedFunction && selectedCount > 0 && startDate;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {t.newRequest}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t.company}</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger data-testid="modal-select-company">
                <SelectValue placeholder={`Select ${t.company.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t.module}</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger data-testid="modal-select-module">
                <SelectValue placeholder={`Select ${t.module.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {modules.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t.function}</Label>
            <Select 
              value={selectedFunction} 
              onValueChange={setSelectedFunction}
              disabled={!selectedModule}
            >
              <SelectTrigger data-testid="modal-select-function">
                <SelectValue placeholder={`Select ${t.function.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {functions.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  {t.role} ({selectedCount}/{roles.length})
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAll}
                    className="text-xs h-7"
                  >
                    {t.selectAll}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUnselectAll}
                    className="text-xs h-7"
                  >
                    {t.unselectAll}
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 space-y-1">
                {roles.map(role => (
                  <label 
                    key={role.id}
                    className="flex items-start gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Checkbox
                      checked={roleSelections[role.id] || false}
                      onCheckedChange={(checked) => 
                        setRoleSelections(prev => ({ ...prev, [role.id]: checked as boolean }))
                      }
                      data-testid={`modal-checkbox-role-${role.id}`}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{role.role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{t.startDate}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                  data-testid="modal-input-start-date"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{t.endDate}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                  data-testid="modal-input-end-date"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} data-testid="modal-button-cancel">
            {t.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || isSubmitting}
            data-testid="modal-button-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                {t.submitting}
              </>
            ) : (
              t.submitRequest
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
