import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useSsoLogin, useAuth, useAuthConfig } from "@/hooks/use-auth";
import {
  completeEntraRedirectLogin,
  getMsalRedirectError,
  isMsalConfigured,
  isMsalRedirectReturn,
  startEntraRedirectLogin,
} from "@/lib/msal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, LogIn, Globe } from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";
import { MicrosoftSignInButton } from "@/components/ui/microsoft-sign-in-button";
import { useAppLanguage } from "@/contexts/app-language";
import { loginT } from "@/lib/login-i18n";

function redirectAfterLogin(user: { isAdmin: boolean; companies: unknown[] }) {
  return user.isAdmin && user.companies.length === 0 ? "/admin" : "/";
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { language, isRtl, toggleLanguage } = useAppLanguage();
  const t = loginT(language);
  const { data: authUser } = useAuth();
  const { data: authConfig } = useAuthConfig();
  const login = useLogin();
  const ssoLogin = useSsoLogin();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ssoPending, setSsoPending] = useState(false);

  const ssoAvailable = Boolean(authConfig?.ssoEnabled && isMsalConfigured());

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sso") === "failed") {
      toast({
        title: "Microsoft sign-in failed",
        description: "Could not complete sign-in. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, "/login");
    }
  }, [toast]);

  // Fallback: if MSAL returned from Microsoft but bootstrap did not exchange the token.
  useEffect(() => {
    if (!ssoAvailable || ssoLogin.isPending) return;
    if (!isMsalRedirectReturn()) return;

    let cancelled = false;
    (async () => {
      const msError = getMsalRedirectError();
      if (msError) {
        toast({
          title: "Microsoft sign-in failed",
          description: msError,
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, "/login");
        return;
      }

      try {
        const token = await completeEntraRedirectLogin();
        if (cancelled || !token) return;
        const user = await ssoLogin.mutateAsync(token);
        toast({ title: `Welcome, ${user.name}` });
        navigate(redirectAfterLogin(user));
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Microsoft sign-in failed",
          description: err instanceof Error ? err.message : "SSO failed",
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, "/login?sso=failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ssoAvailable, ssoLogin.mutateAsync, navigate, toast]);

  if (authUser) {
    if (authUser.selectedCompanyId || authUser.isAdmin) {
      navigate(redirectAfterLogin(authUser));
      return null;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-lg text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Signed in, but no access</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your account ({authUser.email}) is on the allow-list but has no company access assigned.
            Contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  const handleLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      const user = await login.mutateAsync({ username, password });
      toast({ title: `Welcome, ${user.name}` });
      navigate(redirectAfterLogin(user));
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleSso = async () => {
    setSsoPending(true);
    try {
      await startEntraRedirectLogin();
    } catch (err) {
      setSsoPending(false);
      toast({
        title: t.ssoFailedTitle,
        description: err instanceof Error ? err.message : t.ssoFailed,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <DallahLogo size={42} />
          <div>
            <p className="font-bold text-lg leading-tight">{t.productName}</p>
            <p className="text-teal-300 text-xs">{t.productTagline}</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-snug">
            {t.heroTitle1}<br />
            <span className="text-teal-400">{t.heroTitle2}</span><br />
            {t.heroTitle3}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
            {t.heroBody}
          </p>
        </div>

        <p className="relative z-10 text-slate-500 text-xs">{t.copyright}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <DallahLogo size={32} />
            <span className="font-bold text-slate-800 dark:text-slate-100">{t.productName}</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 relative">
            <button
              type="button"
              onClick={toggleLanguage}
              className="absolute top-6 end-6 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={t.language}
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{t.signInTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 pe-16">
              {t.signInSubtitle}
            </p>

            {ssoAvailable && (
              <>
                <MicrosoftSignInButton
                  onClick={handleSso}
                  disabled={ssoPending || ssoLogin.isPending}
                  loading={ssoPending || ssoLogin.isPending}
                />
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-400">{t.orLocal}</span>
                  </div>
                </div>
              </>
            )}

            {!ssoAvailable && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                {t.ssoNotConfigured}
              </p>
            )}

            <form onSubmit={handleLocal} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {t.username}
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.usernamePlaceholder}
                  className="h-10"
                  autoComplete="username"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {t.password}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="h-10 pe-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={login.isPending}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg mt-2"
              >
                {login.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin me-2" />{t.signingIn}</>
                ) : (
                  <><LogIn className="h-4 w-4 me-2" />{t.signInLocal}</>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
