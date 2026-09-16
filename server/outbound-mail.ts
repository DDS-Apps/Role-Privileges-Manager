import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import {
  getGraphAccessToken,
  isGraphMailConfigured,
  sendGraphMail,
  verifyGraphMailAccess,
} from "./graph-mail-client.js";

function smtpUser(): string {
  return process.env.SMTP_USER?.trim() || "";
}

function smtpPass(): string {
  return process.env.SMTP_PASS?.trim() || "";
}

export function isSmtpConfigured(): boolean {
  return Boolean(smtpUser() && smtpPass());
}

export function isOutboundMailConfigured(): boolean {
  return isSmtpConfigured() || isGraphMailConfigured();
}

let cachedTransporter: Mail | null = null;

function getSmtpTransporter(): Mail {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    throw new Error("SMTP_USER/SMTP_PASS are not set");
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.office365.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user, pass },
      requireTLS: true,
    });
  }
  return cachedTransporter;
}

/** Prefer Graph when SMTP is misconfigured or explicitly disabled. */
function preferGraphMail(): boolean {
  return process.env.OUTBOUND_MAIL?.trim().toLowerCase() === "graph";
}

export function getFromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GRAPH_MAILBOX ||
    "RPM System <noreply@dallah.com>"
  );
}

export interface OutboundMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  cc?: string[];
}

export async function sendOutboundMail(options: OutboundMailOptions): Promise<void> {
  const from = getFromAddress();
  let smtpError: string | undefined;

  const trySmtp = isSmtpConfigured() && !preferGraphMail();
  if (trySmtp) {
    try {
      await getSmtpTransporter().sendMail({
        from,
        to: options.to,
        ...(options.cc?.length ? { cc: options.cc } : {}),
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`[outbound-mail] Sent via SMTP → ${options.to}`);
      return;
    } catch (err) {
      smtpError = err instanceof Error ? err.message : String(err);
      console.error("[outbound-mail] SMTP send failed:", smtpError);
      if (!isGraphMailConfigured()) {
        throw new Error(`Failed to send email via SMTP: ${smtpError}`);
      }
      console.warn("[outbound-mail] Falling back to Microsoft Graph sendMail");
    }
  }

  if (isGraphMailConfigured()) {
    try {
      await sendGraphMail({
        to: options.to,
        cc: options.cc,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return;
    } catch (err) {
      const graphError = err instanceof Error ? err.message : String(err);
      if (smtpError) {
        throw new Error(
          `SMTP failed (${smtpError}); Graph sendMail failed (${graphError})`,
        );
      }
      throw new Error(`Graph sendMail failed: ${graphError}`);
    }
  }

  if (smtpError) {
    throw new Error(`Failed to send email via SMTP: ${smtpError}`);
  }

  throw new Error(
    "Outbound email is not configured — set SMTP_USER/SMTP_PASS or Graph mail credentials",
  );
}

export function logOutboundMailConfigStatus(): void {
  const publicUrl = getPublicAppUrl();
  if (!publicUrl) {
    console.warn(
      "[outbound-mail] APP_PUBLIC_URL is not set — approval email links will fail",
    );
  }
  if (preferGraphMail() && isGraphMailConfigured()) {
    console.log(
      `[outbound-mail] Using Graph sendMail (${process.env.GRAPH_MAILBOX || "mailbox"})`,
    );
  } else if (isSmtpConfigured()) {
    console.log(`[outbound-mail] SMTP configured (${getFromAddress()})`);
    if (isGraphMailConfigured()) {
      console.log("[outbound-mail] Graph sendMail available as fallback");
    }
  } else if (isGraphMailConfigured()) {
    console.log(
      `[outbound-mail] Graph sendMail configured (${process.env.GRAPH_MAILBOX || "mailbox"})`,
    );
  } else {
    console.warn(
      "[outbound-mail] No outbound email configured — set SMTP_USER/SMTP_PASS or Graph credentials",
    );
  }
}

export function getPublicAppUrl(): string {
  const configured =
    process.env.APP_PUBLIC_URL ||
    process.env.VITE_AZURE_AD_REDIRECT_URI?.replace(/\/login\/?$/, "") ||
    "";
  return configured.replace(/\/$/, "");
}

export async function verifyOutboundMail(): Promise<{
  ok: boolean;
  method: "smtp" | "graph" | "none";
  error?: string;
  smtpError?: string;
  graphError?: string;
}> {
  if (preferGraphMail() && isGraphMailConfigured()) {
    try {
      await getGraphAccessToken();
      await verifyGraphMailAccess();
      return { ok: true, method: "graph" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, method: "graph", error: message, graphError: message };
    }
  }

  let smtpError: string | undefined;
  if (isSmtpConfigured()) {
    try {
      await getSmtpTransporter().verify();
      return { ok: true, method: "smtp" };
    } catch (err) {
      smtpError = err instanceof Error ? err.message : String(err);
    }
  }

  if (isGraphMailConfigured()) {
    try {
      await getGraphAccessToken();
      await verifyGraphMailAccess();
      return {
        ok: true,
        method: "graph",
        ...(smtpError ? { smtpError, error: `SMTP unavailable (${smtpError}); using Graph` } : {}),
      };
    } catch (err) {
      const graphError = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        method: smtpError ? "smtp" : "graph",
        error: smtpError
          ? `SMTP: ${smtpError}; Graph: ${graphError}`
          : graphError,
        smtpError,
        graphError,
      };
    }
  }

  if (smtpError) {
    return { ok: false, method: "smtp", error: smtpError, smtpError };
  }
  return { ok: false, method: "none", error: "No outbound mail configured" };
}

export function getOutboundMailStatus() {
  return {
    appPublicUrl: getPublicAppUrl() || null,
    smtpConfigured: isSmtpConfigured(),
    smtpPassConfigured: Boolean(smtpPass()),
    graphConfigured: isGraphMailConfigured(),
    preferGraph: preferGraphMail(),
    fromAddress: getFromAddress(),
    smtpHost: process.env.SMTP_HOST || "smtp.office365.com",
    smtpUser: smtpUser() || null,
    graphMailbox: process.env.GRAPH_MAILBOX || null,
  };
}
