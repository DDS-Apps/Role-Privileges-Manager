import type { PrivilegeRequest } from "@shared/schema";

export type RevokeExecutionState = "scheduled" | "revoked" | "reinstated" | null;

export function getRequestTypeLabel(
  request: PrivilegeRequest,
  t: { grant: string; delete: string },
): string {
  return (request.requestType ?? "grant") === "revoke" ? t.delete : t.grant;
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
