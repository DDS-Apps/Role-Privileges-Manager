import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppLanguage } from "@shared/employee-display";
import {
  applyDocumentLanguage,
  getStoredLanguage,
  setStoredLanguage,
} from "@/lib/app-language";

interface AppLanguageContextValue {
  language: AppLanguage;
  isRtl: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    getStoredLanguage(),
  );

  useEffect(() => {
    applyDocumentLanguage(language);
    setStoredLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const value = useMemo(
    () => ({
      language,
      isRtl: language === "ar",
      setLanguage,
      toggleLanguage,
    }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage(): AppLanguageContextValue {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }
  return ctx;
}
