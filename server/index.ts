import "./env.js";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getSessionSecret } from "./secrets.js";

const SessionStore = MemoryStore(session);

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const isProduction = process.env.NODE_ENV === "production";
// IIS/ARR terminates TLS and forwards to Node over HTTP — trust proxy for req.secure / client IP.
if (isProduction || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

function resolveCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  // Default false: IIS→Node is often plain HTTP on localhost even when users hit HTTPS.
  // Set COOKIE_SECURE=true only when X-Forwarded-Proto: https reaches Node (ARR configured).
  return false;
}

// Never cache authenticated API responses (IIS/WAF may otherwise serve one user's data to another).
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Vary", "Cookie");
  next();
});

const sessionSecret = getSessionSecret();

app.use(session({
  name: "rpm.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new SessionStore({ checkPeriod: 86400000 }),
  cookie: {
    secure: resolveCookieSecure(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000, // 8h
  },
}));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log(
      `session cookie: secure=${resolveCookieSecure()}, trustProxy=${app.get("trust proxy")}`,
    );
    import("./email.js").then(({ logItEmailConfigStatus }) => {
      logItEmailConfigStatus();
    }).catch(() => undefined);
    import("./it-email-poller.js").then(({ startItEmailPoller }) => {
      startItEmailPoller();
    }).catch((err) => {
      console.error("Failed to start IT email poller:", err);
    });
  });
})();
