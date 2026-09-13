import type { Employee } from "@shared/schema";
import { employeeDisplayName } from "@shared/employee-display";
import type { AppLanguage } from "@shared/employee-display";

export function employeeMatchesQuery(
  employee: Employee,
  query: string,
  language: AppLanguage = "en",
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    employee.id.toLowerCase().includes(q) ||
    employee.name.toLowerCase().includes(q) ||
    (employee.nameAr?.toLowerCase().includes(q) ?? false) ||
    (employee.email?.toLowerCase().includes(q) ?? false) ||
    employeeDisplayName(employee, language).toLowerCase().includes(q)
  );
}

export function filterEmployeesByCompanyContext(
  employees: Employee[],
  companyId: string,
  externalOnly: boolean,
): Employee[] {
  if (!companyId) return employees;
  return employees.filter((employee) =>
    externalOnly
      ? employee.legalCompanyId !== companyId
      : employee.legalCompanyId === companyId,
  );
}

export function searchCompanyEmployees(
  employees: Employee[],
  options: {
    companyId?: string;
    externalOnly?: boolean;
    query?: string;
    language?: AppLanguage;
    limitWithoutQuery?: number;
    limitWithQuery?: number;
  } = {},
): Employee[] {
  const {
    companyId = "",
    externalOnly = false,
    query = "",
    language = "en",
    limitWithoutQuery = 50,
    limitWithQuery = 200,
  } = options;

  let result = filterEmployeesByCompanyContext(employees, companyId, externalOnly);
  result.sort((a, b) => a.name.localeCompare(b.name, language));

  const trimmed = query.trim();
  if (trimmed) {
    result = result.filter((employee) => employeeMatchesQuery(employee, trimmed, language));
    return result.slice(0, limitWithQuery);
  }

  // Large rosters: require search so employees without prior access are discoverable.
  if (result.length > limitWithoutQuery) {
    return [];
  }

  return result;
}
