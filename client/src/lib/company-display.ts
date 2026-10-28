import type { Company } from "@shared/schema";
import { companyDisplayName, type AppLanguage } from "@shared/employee-display";

export function resolveCompanyLabel(
  companies: Pick<Company, "id" | "name" | "nameAr">[] | undefined,
  companyId: string,
  language: AppLanguage,
): string {
  const c = companies?.find((x) => x.id === companyId);
  if (!c) return companyId;
  return companyDisplayName(c, language);
}

export function authCompanyLabel(
  company: { companyId: string; name: string; nameAr?: string },
  language: AppLanguage,
): string {
  return companyDisplayName(
    { id: company.companyId, name: company.name, nameAr: company.nameAr },
    language,
  );
}
