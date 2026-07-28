import { useMemo } from "react";
import type { Privilege } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CurrentPrivilegesPanelProps {
  privileges: Privilege[];
  assignedPrivilegeIds: Set<string>;
  title: string;
  emptyMessage: string;
  variant?: "teal" | "rose";
  className?: string;
}

export function CurrentPrivilegesPanel({
  privileges,
  assignedPrivilegeIds,
  title,
  emptyMessage,
  variant = "teal",
  className,
}: CurrentPrivilegesPanelProps) {
  const grouped = useMemo(() => {
    const assigned = privileges.filter((p) => assignedPrivilegeIds.has(p.id));
    const byModule = new Map<string, Map<string, Privilege[]>>();

    for (const priv of assigned) {
      if (!byModule.has(priv.module)) {
        byModule.set(priv.module, new Map());
      }
      const fnMap = byModule.get(priv.module)!;
      if (!fnMap.has(priv.function)) {
        fnMap.set(priv.function, []);
      }
      fnMap.get(priv.function)!.push(priv);
    }

    return Array.from(byModule.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, fnMap]) => ({
        module,
        functions: Array.from(fnMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([functionName, roles]) => ({
            function: functionName,
            roles: roles.sort((a, b) => a.role.localeCompare(b.role)),
          })),
      }));
  }, [privileges, assignedPrivilegeIds]);

  const totalCount = assignedPrivilegeIds.size;
  const borderClass =
    variant === "rose" ? "border-rose-200 bg-rose-50/40" : "border-teal-200 bg-teal-50/40";
  const moduleClass =
    variant === "rose" ? "bg-rose-100 text-rose-800" : "bg-teal-100 text-teal-800";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", borderClass, className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
        {totalCount > 0 && (
          <span className="ml-1.5 font-normal normal-case text-slate-400">
            ({totalCount})
          </span>
        )}
      </p>

      {totalCount === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
          {grouped.map(({ module, functions }) => (
            <div key={module}>
              <span
                className={cn(
                  "inline-block rounded px-1.5 py-0.5 text-[11px] font-medium",
                  moduleClass,
                )}
              >
                {module}
              </span>
              <ul className="mt-1 space-y-1.5 pl-1">
                {functions.map(({ function: fn, roles }) => (
                  <li key={`${module}|${fn}`}>
                    <p className="text-xs font-medium text-slate-600">{fn}</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {roles.map((role) => (
                        <li
                          key={role.id}
                          className="flex items-start gap-1.5 text-xs text-slate-600"
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-1 w-1 shrink-0 rounded-full",
                              variant === "rose" ? "bg-rose-500" : "bg-teal-500",
                            )}
                          />
                          <span>{role.role}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
