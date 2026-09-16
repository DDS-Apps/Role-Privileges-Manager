import type { Contact, Employee, PrivilegeRequest, ViewerContext } from "@shared/schema";
import { isContactGMOfCompany } from "./viewer-context.js";

export function buildSessionOwnerIds(
  personId: string,
  contact?: Pick<Contact, "id" | "userId"> | null,
): Set<string> {
  const ids = new Set<string>([personId]);
  if (contact?.id) ids.add(contact.id);
  if (contact?.userId) ids.add(contact.userId);
  return ids;
}

function isRequestOwnedByUser(
  request: PrivilegeRequest,
  ownerIds: Set<string>,
): boolean {
  return (
    ownerIds.has(request.managerId) ||
    (request.managerUserId != null && ownerIds.has(request.managerUserId))
  );
}

function gmCompanyIds(contact: Contact | null | undefined): string[] {
  if (!contact) return [];
  return contact.companies
    .filter((c) => c.role.trim().toUpperCase() === "GM")
    .map((c) => c.companyId);
}

export function canViewerAccessRequest(
  request: PrivilegeRequest,
  viewer: ViewerContext,
  contact: Contact | null,
  employees: Employee[],
): boolean {
  if (viewer.isAdmin) return true;
  const ownerIds = buildSessionOwnerIds(viewer.actorId, contact);
  if (isRequestOwnedByUser(request, ownerIds)) return true;
  if (request.status !== "pending") {
    return viewer.isAdmin || viewer.isGM;
  }

  const stage = request.approvalStage ?? "none";
  const employee = employees.find((e) => e.id === request.employeeId);
  const gmIds = gmCompanyIds(contact);

  if (stage === "pending_requester_gm") {
    return gmIds.includes(request.managerLegalCompanyId);
  }

  if (stage === "pending_target_gm") {
    if (!employee) return false;
    return gmIds.includes(employee.legalCompanyId);
  }

  return Boolean(employee && gmIds.includes(employee.legalCompanyId));
}

export function filterRequestsForViewer(
  requests: PrivilegeRequest[],
  viewer: ViewerContext | null,
  contact: Contact | null,
  employees: Employee[],
): PrivilegeRequest[] {
  if (!viewer) return [];
  if (viewer.isAdmin || viewer.isGM) {
    return requests.filter((r) =>
      canViewerAccessRequest(r, viewer, contact, employees),
    );
  }
  const ownerIds = buildSessionOwnerIds(viewer.actorId, contact);
  return requests.filter(
    (r) =>
      isRequestOwnedByUser(r, ownerIds) ||
      canViewerAccessRequest(r, viewer, contact, employees),
  );
}

export function canViewerExportEmployee(
  employee: Employee,
  viewer: ViewerContext | null,
  contact: Contact | null,
  employees: Employee[],
): boolean {
  if (!viewer) return false;
  if (viewer.isAdmin) return true;

  const ownerIds = buildSessionOwnerIds(viewer.actorId, contact);
  if (viewer.isGM) {
    return isContactGMOfCompany(
      contact ? [contact] : [],
      viewer.actorId,
      employee.legalCompanyId,
    );
  }

  const manager = employees.find((e) => ownerIds.has(e.id));
  if (manager?.isManager && employee.managerId === manager.id) {
    return employee.legalCompanyId === manager.legalCompanyId;
  }

  return false;
}
