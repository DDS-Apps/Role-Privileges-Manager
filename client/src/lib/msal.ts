import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

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
          import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin,
      },
      cache: {
        cacheLocation: "sessionStorage",
      },
    };
    const instance = new PublicClientApplication(config);
    await instance.initialize();
    pca = instance;
    return instance;
  })();

  return initPromise;
}

/** Interactive login; returns ID token string. */
export async function acquireEntraIdToken(): Promise<string> {
  const instance = await getMsalInstance();
  const result = await instance.loginPopup({
    scopes: ["openid", "profile", "email"],
  });
  if (!result.idToken) {
    throw new Error("Microsoft sign-in did not return an ID token");
  }
  return result.idToken;
}
