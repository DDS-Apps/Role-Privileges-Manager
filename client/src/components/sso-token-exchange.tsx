import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

function redirectAfterLogin(user: { isAdmin: boolean; companies: unknown[] }) {
  return user.isAdmin && user.companies.length === 0 ? "/admin" : "/";
}

/** Exchange an MSAL ID token for an RPM session (after Microsoft redirect). */
export function SsoTokenExchange({ idToken }: { idToken: string }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/sso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("SSO login failed");
        }
        const user = await res.json();
        window.location.replace(redirectAfterLogin(user));
      } catch {
        window.location.replace("/login?sso=failed");
      }
    })();
  }, [idToken]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <span className="ml-3 text-slate-600">Signing in with Microsoft…</span>
    </div>
  );
}
