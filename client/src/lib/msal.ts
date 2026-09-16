import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

const LOGIN_SCOPES = ["openid", "profile", "email"];

let pca: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication> | null = null;

export function isMsalConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_AZURE_AD_CLIENT_ID &&
      import.meta.env.VITE_AZURE_AD_TENANT_ID,
  );
}

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!isMsalConfigured()) {
    throw new Error("Microsoft SSO is not configured (missing VITE_AZURE_AD_* env)");
  }
  if (pca) return pca;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID;
    const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID;
    if (!clientId || !tenantId) {
      throw new Error("Microsoft SSO is not configured (missing VITE_AZURE_AD_* env)");
    }
    const config: Configuration = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri:
          import.meta.env.VITE_AZURE_AD_REDIRECT_URI ||
          `${window.location.origin}/login`,
      },
      cache: {
        // localStorage survives the full-page redirect back from Microsoft
        cacheLocation: "localStorage",
      },
    };
    const instance = new PublicClientApplication(config);
    await instance.initialize();
    pca = instance;
    return instance;
  })();

  return initPromise;
}

/** Full-page redirect to Microsoft (more reliable than popup behind IIS/WAF). */
export async function startEntraRedirectLogin(): Promise<void> {
  const instance = await getMsalInstance();
  await instance.loginRedirect({ scopes: LOGIN_SCOPES });
}

function isMsalRedirectReturn(): boolean {
  const hash = window.location.hash;
  if (hash && /(^|[&#])(id_token|code|error)=/.test(hash)) return true;
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

/** Clear cached Microsoft tokens on RPM logout (shared-browser safety). */
export async function clearEntraCache(): Promise<void> {
  if (!isMsalConfigured()) return;
  try {
    const instance = await getMsalInstance();
    await instance.clearCache();
  } catch {
    // MSAL may not be initialized yet
  }
}

/** Call on /login after Microsoft redirect; returns an ID token once per sign-in. */
export async function completeEntraRedirectLogin(): Promise<string | null> {
  if (!isMsalConfigured()) return null;
  const onLoginPage = window.location.pathname.endsWith("/login");
  if (!onLoginPage && !isMsalRedirectReturn()) return null;

  const instance = await getMsalInstance();
  const result = await instance.handleRedirectPromise();
  if (!result?.idToken) return null;
  return result.idToken;
}
