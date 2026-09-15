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

  const logged = text.match(/logged with request id\s*##RE-(\d+)##/i);
  if (logged) return `RE-${logged[1]}`;

  const createdWithId = text.match(
    /(?:request\s+)?has been created with id\s+(\d+)/i,
  );
  if (createdWithId) return `RE-${createdWithId[1]}`;

  const resolvedBody = text.match(/Request with ID\s*:\s*\*{0,2}(\d+)\*{0,2}/i);
  if (resolvedBody) return `RE-${resolvedBody[1]}`;

  const bracketId = text.match(/\[ID:(\d+)\]/i);
  if (bracketId) return `RE-${bracketId[1]}`;

  return null;
}

/** Extract ticket title from ServiceDesk ack body */
export function parseAckRequestTitle(body: string): string | null {
  const match = body.match(
    /The title of the request is\s*:?\s*(.+?)(?=\s*View Request|\s*={2,}|(?:\r?\n){2,}|<\/|$)/i,
  );
  if (match) return match[1].replace(/\*+/g, "").replace(/&nbsp;/gi, " ").trim();

  const titleLine = body.match(/Title\s*:\s*(.+?)(?=\s*Description\s*:|$)/i);
  return titleLine?.[1]?.replace(/&nbsp;/gi, " ").trim() || null;
}

/** RPM request UUID echoed in ServiceDesk ack/resolved emails */
export function parseRequestIdFromAckBody(body: string): string | null {
  const match = body.match(
    /\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
  );
  return match?.[1] || null;
}

export function isAckEmail(subject: string, body: string): boolean {
  const combined = `${subject}\n${body}`;
  return (
    /##RE-\d+##/i.test(subject) ||
    /The title of the request is/i.test(body) ||
    /acknowledgement mail/i.test(body) ||
    /has been created with id/i.test(body) ||
    /logged with request id/i.test(combined)
  );
}

export function isResolvedEmail(subject: string, body: string): boolean {
  return (
    /\bResolved\b/i.test(body) ||
    /has been resolved/i.test(body) ||
    /raised by you was closed/i.test(subject)
  );
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
