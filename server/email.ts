import nodemailer from "nodemailer";
import type { PrivilegeRequest } from "@shared/schema";
import { buildItRequestTitle } from "./it-email-parser.js";

export { buildItRequestTitle };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  tls: { ciphers: "SSLv3" },
});

export const SUPPORT_EMAIL = "Support@dallah.com";
const FROM_ADDRESS =
  process.env.SMTP_FROM || process.env.SMTP_USER || `RPM System <noreply@dallah.com>`;

export interface ItFulfillmentEmailContext {
  managerName: string;
  managerUserId?: string;
  employeeName: string;
  employeeId: string;
  companyName: string;
  roles: { module: string; function: string; role: string }[];
  approverName?: string;
  approverComments?: string | null;
}

export function buildItFulfillmentSubject(
  request: PrivilegeRequest,
  employeeName: string,
): string {
  return buildItRequestTitle(request, employeeName);
}

export async function sendItFulfillmentEmail(
  request: PrivilegeRequest,
  ctx: ItFulfillmentEmailContext,
): Promise<string> {
  const subject = buildItFulfillmentSubject(request, ctx.employeeName);
  const isRevoke = (request.requestType ?? "grant") === "revoke";
  const roleLines = ctx.roles
    .map((r) => `  • ${r.module} / ${r.function} / ${r.role}`)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color: #1e293b;">
  <h2 style="color: #0f766e;">RPM — ${isRevoke ? "Delete Privilege Request" : "Grant Privilege Request"}</h2>
  <p>GM approval complete. Please process this request in ServiceDesk.</p>
  <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
    <tr><td style="padding: 6px 0; color: #64748b;">Submitted by</td><td><strong>${ctx.managerName}</strong>${ctx.managerUserId ? ` (${ctx.managerUserId})` : ""}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Employee</td><td><strong>${ctx.employeeName}</strong> (${ctx.employeeId})</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Company</td><td>${ctx.companyName}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Module / Function</td><td>${request.module} / ${request.function}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Type</td><td>${isRevoke ? "Delete / Revoke" : "Grant"}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Effective</td><td>${request.startDate}${request.endDate ? ` → ${request.endDate}` : " (no end date)"}</td></tr>
    ${ctx.approverName ? `<tr><td style="padding: 6px 0; color: #64748b;">Approved by</td><td>${ctx.approverName}</td></tr>` : ""}
    ${ctx.approverComments ? `<tr><td style="padding: 6px 0; color: #64748b;">GM comment</td><td>${ctx.approverComments}</td></tr>` : ""}
  </table>
  <p style="margin-top: 16px;"><strong>Roles (${ctx.roles.length}):</strong></p>
  <pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px;">${roleLines || "  (none)"}</pre>
  <p style="font-size: 12px; color: #94a3b8;">Request ID: ${request.id}</p>
</body>
</html>`;

  const text = [
    `RPM ${isRevoke ? "Delete" : "Grant"} Privilege Request — GM approved`,
    "",
    `Submitted by : ${ctx.managerName}${ctx.managerUserId ? ` (${ctx.managerUserId})` : ""}`,
    `Employee     : ${ctx.employeeName} (${ctx.employeeId})`,
    `Company      : ${ctx.companyName}`,
    `Module       : ${request.module} / ${request.function}`,
    `Type         : ${isRevoke ? "Delete" : "Grant"}`,
    `Period       : ${request.startDate} → ${request.endDate || "No end date"}`,
    ctx.approverName ? `Approved by  : ${ctx.approverName}` : "",
    ctx.approverComments ? `GM comment   : ${ctx.approverComments}` : "",
    "",
    "Roles:",
    roleLines || "  (none)",
    "",
    `Request ID   : ${request.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[email] IT fulfillment skipped — SMTP_USER / SMTP_PASS not configured");
    return subject;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: SUPPORT_EMAIL,
      subject,
      text,
      html,
    });
    console.log(`[email] IT fulfillment request sent → ${SUPPORT_EMAIL}`);
  } catch (err) {
    console.error("[email] Failed to send IT fulfillment email:", err);
  }

  return subject;
}
