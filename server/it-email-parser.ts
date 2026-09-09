import type { PrivilegeRequest } from "@shared/schema";

/** Canonical subject sent to Support — echoed in ServiceDesk ack body as ticket title */
export function buildItRequestTitle(
  request: PrivilegeRequest,
  employeeName: string,
): string {
  const typeLabel = (request.requestType ?? "grant") === "revoke" ? "Delete" : "Grant";
  return `[RPM] ${typeLabel} — ${employeeName} | ${request.module} / ${request.function} [${request.id}]`;
}

/** Parse ##RE-20217## or RE-20217 from subject/body */
export function parseSupportTicketId(text: string): string | null {
  const wrapped = text.match(/##RE-(\d+)##/i);
  if (wrapped) return `RE-${wrapped[1]}`;

  const plain = text.match(/\bRE-(\d+)\b/i);
  if (plain) return `RE-${plain[1]}`;

  const resolvedBody = text.match(/Request with ID\s*:\s*\*{0,2}(\d+)\*{0,2}/i);
  if (resolvedBody) return `RE-${resolvedBody[1]}`;

  return null;
}

/** Extract ticket title from ServiceDesk ack body */
export function parseAckRequestTitle(body: string): string | null {
  const match = body.match(
    /The title of the request is\s*:?\s*\*{0,2}(.+?)\*{0,2}(?:\s|$|\r|\n|<)/i,
  );
  return match?.[1]?.trim() || null;
}

export function isResolvedEmail(body: string): boolean {
  return /\bResolved\b/i.test(body);
}

export function bodyContainsRequestId(body: string, requestId: string): boolean {
  return body.includes(requestId) || body.includes(`[${requestId}]`);
}

export function ticketIdMatches(stored: string, parsed: string): boolean {
  const a = stored.replace(/^RE-/i, "");
  const b = parsed.replace(/^RE-/i, "");
  return a === b;
}

export function isAllowedSupportSender(from: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  const lower = from.toLowerCase();
  return allowlist.some((entry) => lower.includes(entry.toLowerCase()));
}
