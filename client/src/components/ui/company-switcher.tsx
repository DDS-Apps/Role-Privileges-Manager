import { useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSelectCompany } from "@/hooks/use-auth";
import type { AuthCompany } from "@/hooks/use-auth";

interface CompanySwitcherProps {
  companies: AuthCompany[];
  selectedCompanyId: string | null;
}

export function CompanySwitcher({ companies, selectedCompanyId }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false);
  const selectCompany = useSelectCompany();

  if (!companies || companies.length <= 1) return null;

  const current = companies.find(c => c.companyId === selectedCompanyId);

  const handleSelect = async (companyId: string) => {
    if (companyId === selectedCompanyId) { setOpen(false); return; }
    await selectCompany.mutateAsync(companyId);
    setOpen(false);
    // Reload so all data refreshes with new company context
    window.location.reload();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors max-w-[220px]">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-400" />
          <span className="truncate" dir="rtl">
            {current?.name ?? "Select Company"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-white/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-3">
          <p className="text-white font-semibold text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-400" />
            Switch Company
          </p>
          <p className="text-white/50 text-xs mt-0.5">{companies.length} companies accessible</p>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
          {companies.map(c => {
            const isActive = c.companyId === selectedCompanyId;
            return (
              <button
                key={c.companyId}
                onClick={() => handleSelect(c.companyId)}
                disabled={selectCompany.isPending}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors group
                  ${isActive
                    ? "bg-teal-50 dark:bg-teal-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-teal-700 dark:text-teal-300" : "text-slate-800 dark:text-slate-100"}`} dir="rtl">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{c.role}</p>
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-teal-500 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
