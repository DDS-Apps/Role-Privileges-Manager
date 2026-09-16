import type { Contact, PrivilegeRequest } from "@shared/schema";
import {
  signApprovalEmailToken,
  type EmailApprovalAction,
} from "./approval-email-token.js";
import {
  getPublicAppUrl,
  isOutboundMailConfigured,
  sendOutboundMail,
} from "./outbound-mail.js";
import { escapeHtml } from "./approval-email-pages.js";

export { getPublicAppUrl };

export interface ApproverEmailContext {
  managerName: string;
  employeeName: string;
  employeeId: string;
  companyName: string;
  roles: { module: string; function: string; role: string }[];
  approvalStepLabel: string;
}

async function buildActionUrl(
  request: PrivilegeRequest,
  approver: Contact,
  action: EmailApprovalAction,
): Promise<string> {
  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    throw new Error("APP_PUBLIC_URL is not configured");
  }
  const token = await signApprovalEmailToken({
    requestId: request.id,
    action,
    approverContactId: approver.id,
    approverEmail: approver.email.toLowerCase(),
    stage: request.approvalStage ?? "none",
  });
  return `${baseUrl}/api/requests/email-action?token=${encodeURIComponent(token)}`;
}

function buttonHtml(href: string, label: string, color: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;margin:8px 8px 8px 0;border-radius:8px;background:${color};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;
}

export async function sendApproverNotificationEmail(
  request: PrivilegeRequest,
  approver: Contact,
  ctx: ApproverEmailContext,
): Promise<void> {
  if (!isOutboundMailConfigured()) {
    throw new Error(
      "Outbound email is not configured (SMTP_USER/SMTP_PASS or Graph mail credentials)",
    );
  }

  const baseUrl = getPublicAppUrl();
  if (!baseUrl) {
    throw new Error("APP_PUBLIC_URL must be configured to build approval email links");
  }

  const approveUrl = await buildActionUrl(request, approver, "approve");
  const rejectUrl = await buildActionUrl(request, approver, "reject");
  const isRevoke = (request.requestType ?? "grant") === "revoke";
  const subject = `RPM — Approval needed: ${request.module} / ${request.function} (${ctx.employeeName})`;
  const roleLines = ctx.roles
    .map((r) => `• ${r.module} / ${r.function} / ${r.role}`)
    .join("<br />");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <h2 style="color: #0f766e;">Privilege request awaiting your approval</h2>
  <p>Hello ${escapeHtml(approver.name)},</p>
  <p>A new ${isRevoke ? "delete" : "grant"} request requires your action as GM (${escapeHtml(ctx.approvalStepLabel)}).</p>
  <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
    <tr><td style="padding: 6px 0; color: #64748b;">Submitted by</td><td><strong>${escapeHtml(ctx.managerName)}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Employee</td><td><strong>${escapeHtml(ctx.employeeName)}</strong> (${escapeHtml(ctx.employeeId)})</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Company</td><td>${escapeHtml(ctx.companyName)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Module / Function</td><td>${escapeHtml(request.module)} / ${escapeHtml(request.function)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Type</td><td>${isRevoke ? "Delete / Revoke" : "Grant"}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Effective</td><td>${request.startDate}${request.endDate ? ` → ${request.endDate}` : " (no end date)"}</td></tr>
  </table>
  <p style="margin-top: 16px;"><strong>Roles (${ctx.roles.length}):</strong><br />${roleLines || "(none)"}</p>
  <p style="margin-top: 24px;"><strong>Take action:</strong></p>
  <p>${buttonHtml(approveUrl, "Approve", "#0d9488")}${buttonHtml(rejectUrl, "Reject", "#dc2626")}</p>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
    These links expire in 14 days. You can also approve or reject from the RPM dashboard after signing in.
  </p>
  <p style="font-size: 12px; color: #94a3b8;">Request ID: ${request.id}</p>
</body>
</html>`;

  const text = [
    "Privilege request awaiting your approval",
    "",
    `Submitted by : ${ctx.managerName}`,
    `Employee     : ${ctx.employeeName} (${ctx.employeeId})`,
    `Company      : ${ctx.companyName}`,
    `Module       : ${request.module} / ${request.function}`,
    `Type         : ${isRevoke ? "Delete" : "Grant"}`,
    `Period       : ${request.startDate} → ${request.endDate || "No end date"}`,
    "",
    "Approve:",
    approveUrl,
    "",
    "Reject:",
    rejectUrl,
    "",
    `Request ID   : ${request.id}`,
  ].join("\n");

  await sendOutboundMail({
    to: approver.email,
    subject,
    text,
    html,
  });

  console.log(`[approval-email] Sent approval request → ${approver.email} (request ${request.id})`);
}
