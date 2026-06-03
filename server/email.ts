import nodemailer from "nodemailer";

// ── Office 365 SMTP transport ──────────────────────────────────────────────
// Configure via environment variables:
//   SMTP_USER  – sender address (e.g. noreply@dallah.com)
//   SMTP_PASS  – account password or App Password
//   SMTP_FROM  – display name + address, defaults to SMTP_USER
//   SMTP_HOST  – override host (default: smtp.office365.com)
//   SMTP_PORT  – override port (default: 587)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,           // STARTTLS
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  tls: { ciphers: "SSLv3" },
});

const SUPPORT_EMAIL = "Support@dallah.com";
const FROM_ADDRESS  = process.env.SMTP_FROM || process.env.SMTP_USER || `RPM System <noreply@dallah.com>`;

// ── Send: new privilege request submitted ──────────────────────────────────
export async function sendRequestSubmittedEmail(params: {
  managerName: string;
  managerUserId?: string;
  employeeName: string;
  employeeId: string;
  companyName: string;
  module: string;
  functionName: string;
  rolesCount: number;
  startDate: string;
  endDate: string | null;
  requestId: string;
}) {
  const {
    managerName, managerUserId, employeeName, employeeId,
    companyName, module, functionName, rolesCount,
    startDate, endDate, requestId,
  } = params;

  const subject = `[RPM] New Privilege Request — ${employeeName} | ${module} / ${functionName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #134e4a 100%); padding: 28px 32px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; }
    .header p  { color: #5eead4; font-size: 13px; margin: 4px 0 0; }
    .body { padding: 28px 32px; }
    .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
    .value { font-size: 14px; color: #0f172a; margin-bottom: 16px; }
    .value.teal { color: #0d9488; font-weight: 600; }
    .row { border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 9999px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 16px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .mono { font-family: monospace; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🛡 New Privilege Request</h1>
      <p>Role & Privileges Manager — Dallah AlBarakah Group</p>
    </div>
    <div class="body">
      <p style="color:#475569;font-size:14px;margin-top:0">
        A new privilege request has been submitted and is awaiting admin approval.
      </p>

      <div class="label">Submitted By</div>
      <div class="value">
        ${managerName}
        ${managerUserId ? `<span class="mono">(${managerUserId})</span>` : ""}
      </div>

      <div class="row">
        <div class="label">Employee</div>
        <div class="value">
          ${employeeName} <span class="mono">${employeeId}</span>
        </div>
      </div>

      <div class="row">
        <div class="label">Company</div>
        <div class="value teal">${companyName}</div>
      </div>

      <div class="row">
        <div class="label">Module / Function</div>
        <div class="value">${module} &rsaquo; ${functionName}</div>
      </div>

      <div class="row">
        <div class="label">Roles Requested</div>
        <div class="value">${rolesCount} role${rolesCount !== 1 ? "s" : ""}</div>
      </div>

      <div class="row">
        <div class="label">Period</div>
        <div class="value">
          ${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          &nbsp;→&nbsp;
          ${endDate ? new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No end date"}
        </div>
      </div>

      <div class="row" style="margin-top:8px">
        <span class="badge">⏳ Pending Approval</span>
      </div>
    </div>
    <div class="footer">
      Request ID: <span class="mono">${requestId}</span><br/>
      This is an automated message from the RPM System. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;

  const text = [
    "New Privilege Request — RPM System",
    "",
    `Submitted by : ${managerName}${managerUserId ? ` (${managerUserId})` : ""}`,
    `Employee     : ${employeeName} (${employeeId})`,
    `Company      : ${companyName}`,
    `Module       : ${module} / ${functionName}`,
    `Roles        : ${rolesCount}`,
    `Period       : ${startDate} → ${endDate || "No end date"}`,
    `Status       : Pending Approval`,
    `Request ID   : ${requestId}`,
  ].join("\n");

  // Skip if SMTP credentials are not configured yet
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[email] Skipped — SMTP_USER / SMTP_PASS not configured");
    return;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: SUPPORT_EMAIL,
      subject,
      text,
      html,
    });
    console.log(`[email] Request notification sent → ${SUPPORT_EMAIL}`);
  } catch (err) {
    // Never fail the request creation because of an email error
    console.error("[email] Failed to send notification:", err);
  }
}
