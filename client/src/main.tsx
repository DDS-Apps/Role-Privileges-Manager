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
  const onLoginPage = window.location.pathname.endsWith("/login");
  // Only exchange Microsoft tokens on the login redirect URI — never on dashboard refresh.
  if (isMsalConfigured() && onLoginPage) {
    try {
      ssoIdToken = await completeEntraRedirectLogin();
      if (ssoIdToken && window.location.hash) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search,
        );
      }
    } catch (err) {
      console.error("[sso] redirect handling failed:", err);
    }
  }

  createRoot(document.getElementById("root")!).render(
    <App ssoIdToken={ssoIdToken} />,
  );
}

bootstrap();
