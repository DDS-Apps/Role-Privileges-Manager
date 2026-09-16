import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { completeEntraRedirectLogin, isMsalConfigured } from "./lib/msal";

/**
 * MSAL redirect responses arrive in the URL hash on the redirect URI.
 * Handle them before React routing can strip the hash (e.g. / → /login).
 */
async function bootstrap() {
  let ssoIdToken: string | null = null;
  if (isMsalConfigured()) {
    try {
      ssoIdToken = await completeEntraRedirectLogin();
    } catch (err) {
      console.error("[sso] redirect handling failed:", err);
    }
  }

  createRoot(document.getElementById("root")!).render(
    <App ssoIdToken={ssoIdToken} />,
  );
}

bootstrap();
