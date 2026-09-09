const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface GraphMailMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  receivedDateTime: string;
}

function graphConfig() {
  const tenantId =
    process.env.GRAPH_TENANT_ID || process.env.AZURE_AD_TENANT_ID || "";
  const clientId =
    process.env.GRAPH_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID || "";
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || "";
  const mailbox =
    process.env.GRAPH_MAILBOX ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "";

  return { tenantId, clientId, clientSecret, mailbox };
}

export function isGraphMailConfigured(): boolean {
  const { tenantId, clientId, clientSecret, mailbox } = graphConfig();
  return Boolean(tenantId && clientId && clientSecret && mailbox);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getGraphAccessToken(): Promise<string> {
  const { tenantId, clientId, clientSecret } = graphConfig();
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Graph mail credentials not configured");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: GRAPH_SCOPE,
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || `Graph token request failed (${res.status})`,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getGraphAccessToken();
  const { mailbox } = graphConfig();
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  return res;
}

export async function listRecentInboxMessages(
  since: Date,
  top = 25,
): Promise<GraphMailMessage[]> {
  const sinceIso = since.toISOString();
  const query = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,body,bodyPreview,from,isRead,receivedDateTime",
    $filter: `receivedDateTime ge ${sinceIso}`,
  });

  const res = await graphFetch(`/mailFolders/inbox/messages?${query}`);
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      body?: { content?: string; contentType?: string };
      bodyPreview?: string;
      from?: { emailAddress?: { address?: string } };
      isRead?: boolean;
      receivedDateTime?: string;
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Graph mail list failed (${res.status})`);
  }

  return (data.value || [])
    .filter((m) => !m.isRead)
    .map((m) => {
      const rawBody =
        m.body?.contentType?.toLowerCase() === "html"
          ? stripHtml(m.body?.content || "")
          : m.body?.content || m.bodyPreview || "";

      return {
        id: m.id,
        subject: m.subject || "",
        body: rawBody,
        from: m.from?.emailAddress?.address || "",
        receivedDateTime: m.receivedDateTime || "",
      };
    });
}

export async function markGraphMessageRead(messageId: string): Promise<void> {
  const res = await graphFetch(`/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      data.error?.message || `Graph mark read failed (${res.status})`,
    );
  }
}

export async function verifyGraphMailAccess(): Promise<{
  mailbox: string;
  unreadCount: number;
}> {
  const { mailbox } = graphConfig();
  const res = await graphFetch("/mailFolders/inbox");
  const data = (await res.json()) as {
    unreadItemCount?: number;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Graph inbox access failed (${res.status})`);
  }

  return {
    mailbox,
    unreadCount: data.unreadItemCount ?? 0,
  };
}
