import nodemailer from "nodemailer";
import { isGraphMailConfigured, sendGraphMail } from "./graph-mail-client.js";

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isOutboundMailConfigured(): boolean {
  return isSmtpConfigured() || isGraphMailConfigured();
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  requireTLS: true,
});

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

  if (isSmtpConfigured()) {
    try {
      await transporter.sendMail({
        from,
        to: options.to,
        ...(options.cc?.length ? { cc: options.cc } : {}),
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[outbound-mail] SMTP send failed:", message);
      if (!isGraphMailConfigured()) {
        throw new Error(`Failed to send email via SMTP: ${message}`);
      }
      console.warn("[outbound-mail] Falling back to Microsoft Graph sendMail");
    }
  }

  if (isGraphMailConfigured()) {
    await sendGraphMail({
      from,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return;
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
  if (isSmtpConfigured()) {
    console.log(
      `[outbound-mail] SMTP configured (${getFromAddress()})`,
    );
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
}> {
  if (isSmtpConfigured()) {
    try {
      await transporter.verify();
      return { ok: true, method: "smtp" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isGraphMailConfigured()) {
        return { ok: false, method: "smtp", error: message };
      }
      return { ok: false, method: "smtp", error: message };
    }
  }
  if (isGraphMailConfigured()) {
    return { ok: true, method: "graph" };
  }
  return { ok: false, method: "none", error: "No outbound mail configured" };
}

export function getOutboundMailStatus() {
  return {
    appPublicUrl: getPublicAppUrl() || null,
    smtpConfigured: isSmtpConfigured(),
    graphConfigured: isGraphMailConfigured(),
    fromAddress: getFromAddress(),
    smtpHost: process.env.SMTP_HOST || "smtp.office365.com",
    smtpUser: process.env.SMTP_USER || null,
  };
}
