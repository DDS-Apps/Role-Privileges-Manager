import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { data: authUser } = useAuth();
  const login = useLogin();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Already logged-in → redirect
  if (authUser?.selectedCompanyId) {
    navigate("/");
    return null;
  }

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      const user = await login.mutateAsync({ email, password });
      toast({ title: `Welcome, ${user.name}` });
      navigate(user.isAdmin && user.companies.length === 0 ? "/admin" : "/");
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex" dir="ltr">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <DallahLogo size={42} />
          <div>
            <p className="font-bold text-lg leading-tight">RPM System</p>
            <p className="text-teal-300 text-xs">Role & Privileges Manager</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-snug">
            Business Users<br />
            <span className="text-teal-400">Roles & Privileges</span><br />
            Management
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
            Manage employee access, privileges, and roles across all Dallah AlBarakah companies — securely and efficiently.
          </p>
        </div>

        <p className="relative z-10 text-slate-500 text-xs">© 2025 Dallah AlBarakah Group. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <DallahLogo size={32} />
            <span className="font-bold text-slate-800 dark:text-slate-100">RPM System</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">

            {/* ── Credentials ── */}
            <>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Sign in</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Enter your work email to continue</p>

                <form onSubmit={handleCredentials} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Work Email
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-10"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="h-10 pr-10"
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={login.isPending}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg mt-2">
                    {login.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in…</>
                      : <><LogIn className="h-4 w-4 mr-2" />Sign in</>}
                  </Button>
                </form>

                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Demo credentials</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Any registered email · password: <span className="font-mono">password</span>
                  </p>
                </div>
            </>

          </div>
        </div>
      </div>
    </div>
  );
}
