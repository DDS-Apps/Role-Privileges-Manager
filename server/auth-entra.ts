import { createRemoteJWKSet, jwtVerify } from "jose";

const tenantId = process.env.AZURE_AD_TENANT_ID || "";
const clientId = process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_AD_AUDIENCE || "";
const audience = process.env.AZURE_AD_AUDIENCE || clientId;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!tenantId) {
    throw new Error("AZURE_AD_TENANT_ID is not configured");
  }
  if (!jwks) {
    const url = new URL(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    );
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

export function isEntraConfigured(): boolean {
  return Boolean(tenantId && clientId);
}

/** Validate Entra ID token and return lowercase email, or throw. */
export async function verifyEntraIdToken(idToken: string): Promise<string> {
  if (!isEntraConfigured()) {
    throw new Error("Microsoft SSO is not configured on the server");
  }

  const { payload } = await jwtVerify(idToken, getJwks(), {
    audience,
    issuer: [
      `https://login.microsoftonline.com/${tenantId}/v2.0`,
      `https://sts.windows.net/${tenantId}/`,
    ],
  });

  const email = (
    (payload.preferred_username as string) ||
    (payload.email as string) ||
    (payload.upn as string) ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("ID token did not contain an email claim");
  }

  return email;
}
