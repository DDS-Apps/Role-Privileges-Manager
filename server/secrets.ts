const DEFAULT_SESSION_SECRET = "dallah-rpm-secret-2025";

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret === DEFAULT_SESSION_SECRET) {
    if (isProd) {
      throw new Error(
        "SESSION_SECRET must be set to a strong random value (min 32 chars) in production",
      );
    }
    console.warn(
      "[security] SESSION_SECRET unset — using dev default. Never deploy this to production.",
    );
    return secret || DEFAULT_SESSION_SECRET;
  }

  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  return secret;
}

export function getApprovalEmailSecretKey(): Uint8Array {
  const secret =
    process.env.APPROVAL_EMAIL_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  if (!secret || secret === DEFAULT_SESSION_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "APPROVAL_EMAIL_SECRET or SESSION_SECRET must be set in production",
      );
    }
  }
  const key = secret || DEFAULT_SESSION_SECRET;
  return new TextEncoder().encode(key);
}
