import { ImapFlow } from "imapflow";

import fs from "fs/promises";

import path from "path";

import { storage } from "./storage.js";

import {

  isGraphMailConfigured,

  listRecentInboxMessages,

  markGraphMessageRead,

} from "./graph-mail-client.js";



const LOG_SOURCE = "it-email";



function pollerLog(message: string) {

  const formattedTime = new Date().toLocaleTimeString("en-US", {

    hour: "numeric",

    minute: "2-digit",

    second: "2-digit",

    hour12: true,

  });

  console.log(`${formattedTime} [${LOG_SOURCE}] ${message}`);

}



const PROCESSED_PATH = path.join(process.cwd(), "it-processed-emails.json");



async function loadProcessedIds(): Promise<Set<string>> {

  try {

    const raw = await fs.readFile(PROCESSED_PATH, "utf-8");

    const parsed = JSON.parse(raw) as string[];

    return new Set(Array.isArray(parsed) ? parsed : []);

  } catch {

    return new Set();

  }

}



async function saveProcessedIds(ids: Set<string>): Promise<void> {

  const temp = PROCESSED_PATH + ".tmp";

  await fs.writeFile(temp, JSON.stringify(Array.from(ids), null, 2));

  await fs.rename(temp, PROCESSED_PATH);

}



function getPlainBody(source: unknown): string {

  if (typeof source === "string") return source;

  if (source && typeof source === "object" && "text" in source) {

    return String((source as { text?: string }).text || "");

  }

  return String(source ?? "");

}



async function processMessage(

  id: string,

  subject: string,

  body: string,

  from: string,

  processed: Set<string>,

): Promise<boolean> {

  if (processed.has(id)) return false;



  let handled = false;

  if (/##RE-\d+##/i.test(subject) || /The title of the request is/i.test(body)) {

    handled = await storage.processItAckEmail(subject, body, from);

  }

  if (!handled && /\bResolved\b/i.test(body)) {

    handled = await storage.processItResolvedEmail(subject, body, from);

  }



  if (handled) {

    processed.add(id);

  }



  return handled;

}



async function pollItEmailsViaGraph(): Promise<void> {

  const processed = await loadProcessedIds();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const messages = await listRecentInboxMessages(since);



  for (const msg of messages) {

    const handled = await processMessage(

      msg.id,

      msg.subject,

      msg.body,

      msg.from,

      processed,

    );



    if (handled) {

      try {

        await markGraphMessageRead(msg.id);

      } catch {

        // non-fatal

      }

    }

  }



  await saveProcessedIds(processed);

}



async function pollItEmailsViaImap(): Promise<void> {

  const user = process.env.IMAP_USER || process.env.SMTP_USER;

  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;

  if (!user || !pass) return;



  const host = process.env.IMAP_HOST || "outlook.office365.com";

  const port = Number(process.env.IMAP_PORT || "993");

  const processed = await loadProcessedIds();



  const client = new ImapFlow({

    host,

    port,

    secure: port === 993,

    auth: { user, pass },

    logger: false,

  });



  try {

    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for await (const msg of client.fetch(

        { seen: false, since },

        { envelope: true, source: true, uid: true },

      )) {

        const uid = String(msg.uid);

        const subject = msg.envelope?.subject || "";

        const from = msg.envelope?.from?.[0]?.address || "";

        const body = getPlainBody(msg.source);



        const handled = await processMessage(uid, subject, body, from, processed);



        if (handled) {

          try {

            await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);

          } catch {

            // non-fatal

          }

        }

      }

    } finally {

      lock.release();

    }

  } finally {

    await client.logout().catch(() => undefined);

  }



  await saveProcessedIds(processed);

}



export async function pollItEmailsOnce(): Promise<void> {

  if (isGraphMailConfigured()) {

    await pollItEmailsViaGraph();

    return;

  }

  await pollItEmailsViaImap();

}



export function startItEmailPoller(): void {

  const useGraph = isGraphMailConfigured();

  const imapUser = process.env.IMAP_USER || process.env.SMTP_USER;

  const imapPass = process.env.IMAP_PASS || process.env.SMTP_PASS;



  if (!useGraph && (!imapUser || !imapPass)) {

    pollerLog(

      "IT email poller disabled — configure GRAPH_* or IMAP/SMTP credentials",

    );

    return;

  }



  const intervalMs = Number(process.env.IT_EMAIL_POLL_INTERVAL_MS || "60000");

  const mailbox =

    process.env.GRAPH_MAILBOX ||

    process.env.SMTP_FROM ||

    imapUser ||

    "mailbox";

  pollerLog(

    useGraph

      ? `IT email poller started via Microsoft Graph (${mailbox}, every ${intervalMs}ms)`

      : `IT email poller started via IMAP (every ${intervalMs}ms)`,

  );



  const tick = () => {

    pollItEmailsOnce().catch((err) => {

      console.error("[it-email] Poll error:", err);

    });

  };



  tick();

  setInterval(tick, intervalMs);

}


