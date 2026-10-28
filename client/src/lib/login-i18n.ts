import type { AppLanguage } from "@shared/employee-display";

const LOGIN = {
  en: {
    productName: "RPM System",
    productTagline: "Role & Privileges Manager",
    heroTitle1: "Business Users",
    heroTitle2: "Roles & Privileges",
    heroTitle3: "Management",
    heroBody:
      "Only allow-listed contacts can sign in. Microsoft proves who you are; this app decides who is allowed.",
    copyright: "© 2025 Dallah AlBarakah Group. All rights reserved.",
    signInTitle: "Sign in",
    signInSubtitle: "Access is limited to contacts defined in the allow-list.",
    orLocal: "or local account",
    ssoNotConfigured:
      "Microsoft SSO is not configured. Use a local allow-list account, or set AZURE_AD_* / VITE_AZURE_AD_* environment variables.",
    username: "Username",
    usernamePlaceholder: "local username",
    password: "Password",
    passwordPlaceholder: "Enter password",
    signingIn: "Signing in…",
    signInLocal: "Sign in locally",
    ssoFailedTitle: "Microsoft sign-in failed",
    ssoFailed: "SSO failed",
    language: "Language",
  },
  ar: {
    productName: "نظام RPM",
    productTagline: "إدارة الأدوار والامتيازات",
    heroTitle1: "مستخدمو الأعمال",
    heroTitle2: "الأدوار والامتيازات",
    heroTitle3: "الإدارة",
    heroBody:
      "يمكن فقط لجهات الاتصال المدرجة في القائمة المسموحة تسجيل الدخول. مايكروسوفت تثبت هويتك؛ هذا التطبيق يحدد من يُسمح له بالدخول.",
    copyright: "© 2025 مجموعة دلة البركة. جميع الحقوق محفوظة.",
    signInTitle: "تسجيل الدخول",
    signInSubtitle: "الوصول مقصور على جهات الاتصال المعرّفة في القائمة المسموحة.",
    orLocal: "أو حساب محلي",
    ssoNotConfigured:
      "لم يُضبط تسجيل الدخول الموحد لمايكروسوفت. استخدم حساباً محلياً من القائمة المسموحة، أو اضبط متغيرات AZURE_AD_* / VITE_AZURE_AD_*.",
    username: "اسم المستخدم",
    usernamePlaceholder: "اسم المستخدم المحلي",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    signingIn: "جاري تسجيل الدخول…",
    signInLocal: "تسجيل الدخول محلياً",
    ssoFailedTitle: "فشل تسجيل الدخول عبر مايكروسوفت",
    ssoFailed: "فشل SSO",
    language: "اللغة",
  },
} as const;

export function loginT(language: AppLanguage) {
  return LOGIN[language];
}
