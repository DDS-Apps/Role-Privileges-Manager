import type { Privilege } from "./schema";
import type { AppLanguage } from "./employee-display";
import {
  catalogFunctionLabel,
  catalogModuleLabel,
  catalogRoleLabel,
} from "./catalog-i18n";

export function privilegeModuleLabel(
  privilege: Pick<Privilege, "module" | "moduleAr">,
  language: AppLanguage,
): string {
  if (language === "ar" && privilege.moduleAr?.trim()) {
    return privilege.moduleAr.trim();
  }
  return catalogModuleLabel(privilege.module, language);
}

export function privilegeFunctionLabel(
  privilege: Pick<Privilege, "module" | "function" | "functionAr">,
  language: AppLanguage,
): string {
  if (language === "ar" && privilege.functionAr?.trim()) {
    return privilege.functionAr.trim();
  }
  return catalogFunctionLabel(privilege.module, privilege.function, language);
}

export function privilegeRoleLabel(
  privilege: Pick<Privilege, "role" | "roleAr">,
  language: AppLanguage,
): string {
  if (language === "ar" && privilege.roleAr?.trim()) {
    return privilege.roleAr.trim();
  }
  return catalogRoleLabel(privilege.role, language);
}

export function privilegeLabels(
  privilege: Pick<
    Privilege,
    "module" | "function" | "role" | "moduleAr" | "functionAr" | "roleAr"
  >,
  language: AppLanguage,
) {
  return {
    module: privilegeModuleLabel(privilege, language),
    function: privilegeFunctionLabel(privilege, language),
    role: privilegeRoleLabel(privilege, language),
  };
}
