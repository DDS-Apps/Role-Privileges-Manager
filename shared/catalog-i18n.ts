import type { AppLanguage } from "./employee-display";
import { FUNCTION_AR, MODULE_AR } from "./catalog-i18n-maps";
import { ROLE_AR } from "./catalog-role-ar";
import { REPORTS_ROLE_AR } from "./catalog-reports-role-ar";

export { FUNCTION_AR, MODULE_AR, ROLE_AR, REPORTS_ROLE_AR };

export function catalogModuleLabel(
  module: string,
  language: AppLanguage,
): string {
  if (language !== "ar") return module;
  return MODULE_AR[module] ?? module;
}

export function catalogFunctionLabel(
  module: string,
  functionName: string,
  language: AppLanguage,
): string {
  if (language !== "ar") return functionName;
  const key = `${module}::${functionName}`;
  return FUNCTION_AR[key] ?? functionName;
}

export function catalogRoleLabel(role: string, language: AppLanguage): string {
  if (language !== "ar") return role;
  return ROLE_AR[role] ?? REPORTS_ROLE_AR[role] ?? role;
}

/** All searchable text for a catalog triple (English + Arabic when applicable). */
export function catalogSearchText(
  module: string,
  functionName: string,
  role: string,
): string {
  const fnKey = `${module}::${functionName}`;
  return [
    module,
    functionName,
    role,
    MODULE_AR[module],
    FUNCTION_AR[fnKey],
    ROLE_AR[role],
    REPORTS_ROLE_AR[role],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
