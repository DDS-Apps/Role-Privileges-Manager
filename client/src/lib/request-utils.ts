import type { ApprovalStage, PrivilegeRequest } from "@shared/schema";

export type RevokeExecutionState = "scheduled" | "revoked" | "reinstated" | null;

export interface ApprovalActorOptions {
  isAdmin: boolean;
  accessibleCompanyIds: Set<string>;
  gmLegalCompanyIds: string[];
  employees: { id: string; legalCompanyId: string }[];
}

export function getRequestTypeLabel(
  request: PrivilegeRequest,
  t: { grant: string; delete: string },
): string {
  return (request.requestType ?? "grant") === "revoke" ? t.delete : t.grant;
}

export function getApprovalStage(request: PrivilegeRequest): ApprovalStage {
  return request.approvalStage ?? "none";
}

export function isExternalGrantRequest(
  request: PrivilegeRequest,
  employees: { id: string; legalCompanyId: string }[],
): boolean {
  if ((request.requestType ?? "grant") !== "grant") return false;
  const employee = employees.find((e) => e.id === request.employeeId);
  return Boolean(employee && employee.legalCompanyId !== request.companyId);
}

export function buildOwnerIds(
  actingEmployeeId: string | undefined,
  authId: string | undefined,
  authUserId: string | undefined,
): Set<string> {
  return new Set(
    [actingEmployeeId, authId, authUserId].filter((id): id is string => Boolean(id)),
  );
}

export function isRequestOwnedByUser(
  request: PrivilegeRequest,
  ownerIds: Set<string>,
): boolean {
  return (
    ownerIds.has(request.managerId) ||
    (request.managerUserId != null && ownerIds.has(request.managerUserId))
  );
}

export function isPendingForUserApproval(
  request: PrivilegeRequest,
  ownerIds: Set<string>,
  options: ApprovalActorOptions,
): boolean {
  if (request.status !== "pending") return false;
  if (isRequestOwnedByUser(request, ownerIds)) return false;

  const stage = getApprovalStage(request);
  const employee = options.employees.find((e) => e.id === request.employeeId);

  if (stage === "pending_requester_gm") {
    if (options.isAdmin) {
      return options.accessibleCompanyIds.has(request.managerLegalCompanyId);
    }
    return options.gmLegalCompanyIds.includes(request.managerLegalCompanyId);
  }

  if (stage === "pending_target_gm") {
    if (!employee) return false;
    if (options.isAdmin) {
      return options.accessibleCompanyIds.has(employee.legalCompanyId);
    }
    return options.gmLegalCompanyIds.includes(employee.legalCompanyId);
  }

  if (options.isAdmin) {
    return options.accessibleCompanyIds.has(request.companyId);
  }

  return Boolean(
    employee && options.gmLegalCompanyIds.includes(employee.legalCompanyId),
  );
}

export function getExternalApprovalLabel(
  request: PrivilegeRequest,
  employees: { id: string; legalCompanyId: string }[],
  t: {
    external: string;
    step1: string;
    step2: string;
    awaitingRequesterGm: string;
    awaitingTargetGm: string;
  },
): string | null {
  if (!isExternalGrantRequest(request, employees)) return null;
  const stage = getApprovalStage(request);
  if (request.status !== "pending") return t.external;
  if (stage === "pending_requester_gm") return t.awaitingRequesterGm;
  if (stage === "pending_target_gm") return t.awaitingTargetGm;
  return t.external;
}

export function getApprovalStepBadge(
  request: PrivilegeRequest,
  employees: { id: string; legalCompanyId: string }[],
  t: { external: string; step1of2: string; step2of2: string },
): string | null {
  if (!isExternalGrantRequest(request, employees)) return null;
  if (request.status !== "pending") return t.external;
  const stage = getApprovalStage(request);
  if (stage === "pending_requester_gm") return t.step1of2;
  if (stage === "pending_target_gm") return t.step2of2;
  return t.external;
}

export function getRevokeExecutionState(request: PrivilegeRequest): RevokeExecutionState {
  if ((request.requestType ?? "grant") !== "revoke" || request.status !== "active") {
    return null;
  }
  if (request.reinstatedAt) return "reinstated";
  if (!request.executedAt) return "scheduled";
  return "revoked";
}

export function formatRevokeExecutionState(
  request: PrivilegeRequest,
  t: {
    scheduled: string;
    revoked: string;
    reinstated: string;
    revokedUntil: string;
    noEndDate: string;
  },
): string | null {
  const state = getRevokeExecutionState(request);
  if (!state) return null;
  if (state === "scheduled") return t.scheduled;
  if (state === "reinstated") return t.reinstated;
  if (request.endDate) {
    return t.revokedUntil.replace("{date}", formatShortDate(request.endDate));
  }
  return t.revoked;
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getItTicketLabel(request: PrivilegeRequest): string | null {
  if (!request.supportTicketId) return null;
  return request.supportTicketId;
}

export function getRequestStatusLabel(
  status: PrivilegeRequest["status"],
  t: { pending: string; awaitingIt: string; active: string; rejected: string },
): string {
  switch (status) {
    case "approved_pending_it":
      return t.awaitingIt;
    case "active":
      return t.active;
    case "rejected":
      return t.rejected;
    default:
      return t.pending;
  }
}
