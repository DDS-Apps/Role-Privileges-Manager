import { useState } from "react";
import { Globe, Download, Building2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  language: "en" | "ar";
  onToggleLanguage: () => void;
  hasUnsavedChanges: boolean;
}

export function LayoutHeader({ language, onToggleLanguage, hasUnsavedChanges }: HeaderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Text dictionary
  const t = {
    en: {
      title: "Business Users Roles and Privileges",
      export: "Export to Excel",
      company: "Acme Corp",
      switchCompany: "Switch Company",
      unsavedTitle: "Unsaved Changes",
      unsavedDesc: "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
      cancel: "Cancel",
      proceed: "Discard Changes",
    },
    ar: {
      title: "أدوار وامتيازات مستخدمي الأعمال",
      export: "تصدير إلى Excel",
      company: "شركة القمة",
      switchCompany: "تغيير الشركة",
      unsavedTitle: "تغييرات غير محفوظة",
      unsavedDesc: "لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟ ستفقد تغييراتك.",
      cancel: "إلغاء",
      proceed: "تجاهل التغييرات",
    }
  };

  const text = t[language];

  const handleActionWithCheck = (action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      setShowWarning(true);
    } else {
      action();
    }
  };

  const confirmAction = () => {
    if (pendingAction) pendingAction();
    setShowWarning(false);
    setPendingAction(null);
  };

  const handleExport = () => {
    window.location.href = "/api/export/excel";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {text.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => handleActionWithCheck(onToggleLanguage)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{language}</span>
          </button>

          <div className="hidden h-6 w-px bg-border sm:block" />

          <button 
            onClick={() => handleActionWithCheck(() => console.log("Switch company"))}
            className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            <span>{text.company}</span>
          </button>

          <button
            onClick={handleExport}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 active:shadow-sm"
          >
            <Download className="h-4 w-4" />
            {text.export}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Warning Dialog */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md animate-in-fade rounded-2xl bg-card p-6 shadow-2xl border border-border">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{text.unsavedTitle}</h3>
            <p className="mt-2 text-muted-foreground">{text.unsavedDesc}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {text.cancel}
              </button>
              <button
                onClick={confirmAction}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                {text.proceed}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
