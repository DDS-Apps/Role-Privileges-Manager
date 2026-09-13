import type { Employee } from "./schema";

export type AppLanguage = "en" | "ar";

export function localizedField(
  english: string | undefined,
  arabic: string | undefined,
  language: AppLanguage,
  fallback = "",
): string {
  if (language === "ar" && arabic?.trim()) return arabic.trim();
  if (english?.trim()) return english.trim();
  if (arabic?.trim()) return arabic.trim();
  return fallback;
}

export function employeeDisplayName(
  employee: Pick<Employee, "id" | "name" | "nameAr">,
  language: AppLanguage,
): string {
  return localizedField(employee.name, employee.nameAr, language, employee.id);
}

export function employeeDisplayTitle(
  employee: Pick<Employee, "title" | "titleAr">,
  language: AppLanguage,
): string {
  return localizedField(employee.title, employee.titleAr, language);
}

export function employeeDisplayDepartment(
  employee: Pick<Employee, "department" | "departmentAr">,
  language: AppLanguage,
): string {
  return localizedField(employee.department, employee.departmentAr, language);
}
