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
    .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15,42,77,.08); text-align: center; }
    h1 { font-size: 24px; margin: 0 0 12px; color: #0f2a4d; }
    p { margin: 0 0 16px; line-height: 1.5; color: #475569; }
    a.button { display: inline-block; margin-top: 8px; padding: 10px 18px; border-radius: 8px; background: #0d9488; color: #fff; text-decoration: none; font-weight: 600; }
    .success { color: #0f766e; }
    .error { color: #b91c1c; }
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
    `<h1 class="success">${title}</h1><p>${message}</p><a class="button" href="/">Open RPM</a>`,
  );
}

export function renderApprovalInfoPage(title: string, message: string): string {
  return pageShell(title, `<h1>${title}</h1><p>${message}</p><a class="button" href="/">Open RPM</a>`);
}

export function renderApprovalErrorPage(message: string): string {
  return pageShell(
    "Action failed",
    `<h1 class="error">Action failed</h1><p>${escapeHtml(message)}</p><a class="button" href="/">Open RPM</a>`,
  );
}

export function renderApprovalConfirmPage(options: {
  action: "approve" | "reject";
  employeeName: string;
  module: string;
  functionName: string;
  token: string;
}): string {
  const actionLabel = options.action === "approve" ? "Approve" : "Reject";
  const actionColor = options.action === "approve" ? "#0d9488" : "#dc2626";
  const summary = `${options.module} / ${options.functionName} for ${options.employeeName}`;
  return pageShell(
    `Confirm ${actionLabel}`,
    `<h1>Confirm ${actionLabel}</h1>
     <p>You are about to <strong>${actionLabel.toLowerCase()}</strong> this privilege request:</p>
     <p><strong>${escapeHtml(summary)}</strong></p>
     <form method="POST" action="/api/requests/email-action" style="margin-top:24px;">
       <input type="hidden" name="token" value="${escapeHtml(options.token)}" />
       <button type="submit" style="padding:12px 24px;border:none;border-radius:8px;background:${actionColor};color:#fff;font-weight:600;font-size:15px;cursor:pointer;">
         ${actionLabel} request
       </button>
     </form>
     <p style="font-size:12px;color:#94a3b8;margin-top:16px;">If you did not expect this email, close this page.</p>`,
  );
}
