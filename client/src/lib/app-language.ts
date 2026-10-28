import type { AppLanguage } from "@shared/employee-display";

const STORAGE_KEY = "rpm.language";

export function getStoredLanguage(): AppLanguage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function setStoredLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore quota / private mode
  }
}

export function applyDocumentLanguage(language: AppLanguage): void {
  const root = document.documentElement;
  root.lang = language === "ar" ? "ar" : "en";
  root.dir = language === "ar" ? "rtl" : "ltr";
}

export function formatAppDate(
  dateStr: string,
  language: AppLanguage,
): string {
  const locale = language === "ar" ? "ar-SA" : "en-GB";
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
