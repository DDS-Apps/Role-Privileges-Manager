import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useSsoLogin } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function redirectAfterLogin(user: { isAdmin: boolean; companies: unknown[] }) {
  return user.isAdmin && user.companies.length === 0 ? "/admin" : "/";
}

/** Exchange an MSAL ID token for an RPM session (after Microsoft redirect). */
export function SsoTokenExchange({ idToken }: { idToken: string }) {
  const [, navigate] = useLocation();
  const ssoLogin = useSsoLogin();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ssoLogin.mutateAsync(idToken);
        if (cancelled) return;
        toast({ title: `Welcome, ${user.name}` });
        navigate(redirectAfterLogin(user));
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Microsoft sign-in failed",
          description: err instanceof Error ? err.message : "SSO failed",
          variant: "destructive",
        });
        navigate("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idToken, navigate, ssoLogin, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <span className="ml-3 text-slate-600">Signing in with Microsoft…</span>
    </div>
  );
}
