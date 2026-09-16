export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — RPM</title>
  <style>
    body { font-family: Arial, sans-serif; background: #ecf1f6; color: #1e293b; margin: 0; padding: 40px 16px; }
    .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15,42,77,.08); }
    h1 { font-size: 24px; margin: 0 0 12px; color: #0f2a4d; text-align: center; }
    p { margin: 0 0 16px; line-height: 1.5; color: #475569; }
    a.button { display: inline-block; margin-top: 8px; padding: 10px 18px; border-radius: 8px; background: #0d9488; color: #fff; text-decoration: none; font-weight: 600; }
    .success { color: #0f766e; }
    .error { color: #b91c1c; }
    label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    textarea { width: 100%; min-height: 96px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 14px; box-sizing: border-box; resize: vertical; }
    .actions { text-align: center; margin-top: 20px; }
    .submit-btn { padding: 12px 24px; border: none; border-radius: 8px; color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; }
    .meta { font-size: 12px; color: #94a3b8; margin-top: 16px; text-align: center; }
    table.details { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    table.details td { padding: 6px 0; vertical-align: top; }
    table.details td:first-child { color: #64748b; width: 38%; padding-right: 12px; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`;
}

export function renderApprovalSuccessPage(action: "approve" | "reject"): string {
  const title = action === "approve" ? "Request approved" : "Request rejected";
  const message =
    action === "approve"
      ? "The privilege request has been approved and sent to IT Support for fulfillment."
      : "The privilege request has been rejected.";
  return pageShell(
    title,
    `<h1 class="success">${title}</h1><p style="text-align:center">${message}</p><p class="actions"><a class="button" href="/">Open RPM</a></p>`,
  );
}

export function renderApprovalInfoPage(title: string, message: string): string {
  return pageShell(
    title,
    `<h1>${title}</h1><p style="text-align:center">${message}</p><p class="actions"><a class="button" href="/">Open RPM</a></p>`,
  );
}

export function renderApprovalErrorPage(message: string): string {
  return pageShell(
    "Action failed",
    `<h1 class="error">Action failed</h1><p style="text-align:center">${escapeHtml(message)}</p><p class="actions"><a class="button" href="/">Open RPM</a></p>`,
  );
}

export function renderApprovalConfirmPage(options: {
  action: "approve" | "reject";
  employeeName: string;
  employeeId: string;
  managerName: string;
  employeeCompanyName: string;
  accessCompanyName: string;
  isExternal: boolean;
  module: string;
  functionName: string;
  requestType: "grant" | "revoke";
  approvalStepLabel: string;
  token: string;
}): string {
  const actionLabel = options.action === "approve" ? "Approve" : "Reject";
  const actionColor = options.action === "approve" ? "#0d9488" : "#dc2626";
  const typeLabel = options.requestType === "revoke" ? "Delete / Revoke" : "Grant";
  const companyRows = options.isExternal
    ? `<tr><td>Company</td><td>${escapeHtml(options.employeeCompanyName)}</td></tr>
       <tr><td>Access to</td><td>${escapeHtml(options.accessCompanyName)}</td></tr>`
    : `<tr><td>Company</td><td>${escapeHtml(options.accessCompanyName)}</td></tr>`;

  const commentBlock =
    options.action === "reject"
      ? `<label for="adminComments">Comments</label>
         <textarea id="adminComments" name="adminComments" placeholder="Add a reason for rejection (optional but recommended)"></textarea>`
      : `<label for="adminComments">Comments (optional)</label>
         <textarea id="adminComments" name="adminComments" placeholder="Add an optional comment"></textarea>`;

  return pageShell(
    `Confirm ${actionLabel}`,
    `<h1>Confirm ${actionLabel}</h1>
     <p style="text-align:center">A ${typeLabel.toLowerCase()} request requires your action as GM (${escapeHtml(options.approvalStepLabel)}).</p>
     <table class="details">
       <tr><td>Submitted by</td><td><strong>${escapeHtml(options.managerName)}</strong></td></tr>
       <tr><td>Employee</td><td><strong>${escapeHtml(options.employeeName)}</strong> (${escapeHtml(options.employeeId)})</td></tr>
       ${companyRows}
       <tr><td>Module / Function</td><td>${escapeHtml(options.module)} / ${escapeHtml(options.functionName)}</td></tr>
       <tr><td>Type</td><td>${typeLabel}</td></tr>
     </table>
     <form method="POST" action="/api/requests/email-action">
       <input type="hidden" name="token" value="${escapeHtml(options.token)}" />
       ${commentBlock}
       <p class="actions">
         <button type="submit" class="submit-btn" style="background:${actionColor}">
           ${actionLabel} request
         </button>
       </p>
     </form>
     <p class="meta">If you did not expect this email, close this page.</p>`,
  );
}
