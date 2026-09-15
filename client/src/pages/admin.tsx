import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useBootstrapData, useTerminateEmployee } from "@/hooks/use-app-data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataImportCenter } from "@/components/ui/data-import-center";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2, Globe, ArrowLeft, Search, Users,
  UserX, AlertTriangle, ClipboardList,
} from "lucide-react";
import { DallahLogo } from "@/components/ui/dallah-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Language = "en" | "ar";

const DICT = {
  en: {
    title: "Admin Panel",
    backToDashboard: "Back to Dashboard",
    requestManagement: "Request Management",
    requestManagementDesc: "Search, filter, approve, and track privilege requests.",
    employeeTermination: "Employee Termination",
    searchEmployee: "Search by name or ID...",
    selectEmployee: "Select Employee",
    terminateEmployee: "Terminate Employee",
    terminateConfirm: "Confirm Termination",
    terminateWarning: "This action will revoke all privileges from the selected employee. This cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    terminating: "Terminating...",
    dataImportTitle: "Data import center",
    dataImportSubtitle: "Upload each Excel file in order. All imports merge into existing data unless noted.",
    recommendedOrder: "Recommended order: 1 Catalog → 2 Companies → 3 User roles → 4 Employee roster → 5 Login users. After replacing the catalog, re-import user roles so assignments stay linked.",
    mergeNote: "Imports merge by default. Use replace options when the Excel file should fully overwrite existing catalog entries or assignment privileges for each employee–company pair in the file.",
    replaceCatalog: "Replace entire catalog (clears existing privileges — re-import user roles after)",
    replaceCompanies: "Replace entire company master (clears existing companies — re-import user roles and roster after)",
    replaceUserRoles: "Replace and update assignments (file becomes source of truth per employee–company; removes privileges not in the file for those pairs)",
    selectFile: "Select Excel file",
    uploadImport: "Upload & import",
    uploading: "Importing...",
    importSummary: "Import summary",
    importErrors: "Import errors",
    exportSkipped: "Export skipped reasons",
    exportErrors: "Export import errors",
    clearRoster: "Clear all roster data",
    clearingRoster: "Clearing...",
    resetApp: "Reset all application data",
    resettingApp: "Resetting...",
    resetAppTitle: "Reset application (dev)",
    resetAppWarning:
      "Deletes all companies, employees, privileges, assignments, requests, contacts, audit log, and login users — including demo seed data. Keeps bootstrap login spadmin / password. Re-import Steps 1–5 afterward.",
    resetAppConfirm: 'Type RESET to confirm',
  },
  ar: {
    title: "لوحة الإدارة",
    backToDashboard: "العودة إلى لوحة التحكم",
    requestManagement: "إدارة الطلبات",
    requestManagementDesc: "ابحث وصفِّ ووافق على طلبات الامتيازات وتتبعها.",
    employeeTermination: "إنهاء خدمة الموظف",
    searchEmployee: "ابحث بالاسم أو الرقم...",
    selectEmployee: "اختر موظف",
    terminateEmployee: "إنهاء خدمة الموظف",
    terminateConfirm: "تأكيد الإنهاء",
    terminateWarning: "هذا الإجراء سيلغي جميع الامتيازات من الموظف المحدد. لا يمكن التراجع عن هذا.",
    cancel: "إلغاء",
    confirm: "تأكيد",
    terminating: "جاري الإنهاء...",
    dataImportTitle: "مركز استيراد البيانات",
    dataImportSubtitle: "ارفع كل ملف Excel بالترتيب. جميع الاستيرادات تُدمج مع البيانات الحالية ما لم يُذكر خلاف ذلك.",
    recommendedOrder: "الترتيب الموصى به: 1 الكatalog → 2 الشركات → 3 أدوار المستخدمين → 4 سجل الموظفين → 5 مستخدمو الدخول. بعد استبدال الكatalog، أعد استيراد أدوار المستخدمين.",
    mergeNote: "الاستيراد يدمج افتراضياً. استخدم خيارات الاستبدال عندما يجب أن يحل ملف Excel محل الكatalog أو صلاحيات التعيينات الحالية.",
    replaceCatalog: "استبدال الكatalog بالكامل (يمسح الامتيازات الحالية — أعد استيراد أدوار المستخدمين بعد ذلك)",
    replaceCompanies: "استبدال قائمة الشركات بالكامل (يمسح الشركات الحالية — أعد استيراد الأدوار والسجل بعد ذلك)",
    replaceUserRoles: "استبدال وتحديث التعيينات (الملف مصدر الحقيقة لكل موظف–شركة؛ يزيل الامتيازات غير الموجودة في الملف لتلك الأزواج)",
    selectFile: "اختر ملف Excel",
    uploadImport: "رفع واستيراد",
    uploading: "جاري الاستيراد...",
    importSummary: "ملخص الاستيراد",
    importErrors: "أخطاء الاستيراد",
    exportSkipped: "تصدير أسباب التخطي",
    exportErrors: "تصدير أخطاء الاستيراد",
    clearRoster: "مسح جميع بيانات السجل",
    clearingRoster: "جاري المسح...",
    resetApp: "إعادة تعيين جميع بيانات التطبيق",
    resettingApp: "جاري إعادة التعيين...",
    resetAppTitle: "إعادة تعيين التطبيق (تطوير)",
    resetAppWarning:
      "يحذف جميع الشركات والموظفين والامتيازات والتعيينات والطلبات وجهات الاتصال وسجل التدقيق ومستخدمي الدخول — بما في ذلك بيانات العرض التجريبية. يبقى حساب spadmin / password. أعد الاستيراد من الخطوات 1–4.",
    resetAppConfirm: 'اكتب RESET للتأكيد',
  }
};

export default function AdminPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const { data: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading: isBootstrapLoading } = useBootstrapData();
  const { data: accessUsersList } = useQuery({
    queryKey: ["/api/access-users"],
    queryFn: async () => {
      const res = await fetch("/api/access-users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<unknown[]>;
    },
  });

  const adminId = authUser?.id || "";
  const terminateEmployee = useTerminateEmployee();
  const { toast } = useToast();

  const t = DICT[language];

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const filteredEmployees = useMemo(() => {
    if (!data) return [];
    if (!employeeSearch) return data.employees;
    const q = employeeSearch.toLowerCase();
    return data.employees.filter(e => 
      e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    );
  }, [data, employeeSearch]);

  const selectedEmployee = useMemo(() => 
    data?.employees.find(e => e.id === selectedEmployeeId),
    [data, selectedEmployeeId]
  );

  const handleTerminate = async () => {
    if (!selectedEmployeeId) return;
    try {
      await terminateEmployee.mutateAsync({
        employeeId: selectedEmployeeId,
        adminId: adminId,
      });
      toast({ title: "Employee terminated successfully" });
      setShowTerminateDialog(false);
      setSelectedEmployeeId("");
    } catch (err) {
      toast({ 
        title: "Failed to terminate employee", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  if (isBootstrapLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-2 shadow-lg overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap relative">
          <div className="flex items-center gap-3">
            <DallahLogo size={34} />
            <h1 className="text-base font-bold tracking-tight md:text-lg text-white" data-testid="text-admin-title">{t.title}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/90 hover:bg-white/20" data-testid="link-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t.backToDashboard}
              </Button>
            </Link>

            <Link href="/admin/requests">
              <Button variant="ghost" size="sm" className="text-white/90 hover:bg-white/20 gap-1.5">
                <ClipboardList className="h-4 w-4" />
                {t.requestManagement}
              </Button>
            </Link>

            <Link href="/admin/contacts">
              <Button variant="ghost" size="sm" className="text-white/90 hover:bg-white/20 gap-1.5">
                <Users className="h-4 w-4" />
                Contacts
              </Button>
            </Link>

            <div className="h-5 w-px bg-white/30" />

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
              data-testid="button-language-toggle"
            >
              <Globe className="h-3.5 w-3.5" />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-8">
        <Link href="/admin/requests">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-teal-100 p-3">
                <ClipboardList className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t.requestManagement}</h2>
                <p className="mt-1 text-sm text-slate-500">{t.requestManagementDesc}</p>
              </div>
            </div>
          </div>
        </Link>

        {data && (
          <DataImportCenter
            counts={{
              privileges: data.privileges.length,
              employees: data.employees.length,
              assignments: data.assignments.length,
              companies: data.companies.length,
              accessUsers: accessUsersList?.length,
            }}
            labels={{
              sectionTitle: t.dataImportTitle,
              sectionSubtitle: t.dataImportSubtitle,
              recommendedOrder: t.recommendedOrder,
              mergeNote: t.mergeNote,
              replaceCatalog: t.replaceCatalog,
              replaceCompanies: t.replaceCompanies,
              replaceUserRoles: t.replaceUserRoles,
              selectFile: t.selectFile,
              upload: t.uploadImport,
              uploading: t.uploading,
              summary: t.importSummary,
              errors: t.importErrors,
              exportSkipped: t.exportSkipped,
              exportErrors: t.exportErrors,
              clearRoster: t.clearRoster,
              clearingRoster: t.clearingRoster,
              resetApp: t.resetApp,
              resettingApp: t.resettingApp,
              resetAppTitle: t.resetAppTitle,
              resetAppWarning: t.resetAppWarning,
              resetAppConfirm: t.resetAppConfirm,
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
              queryClient.invalidateQueries({ queryKey: ["/api/access-users"] });
              toast({ title: "Import completed" });
            }}
            onReset={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
              queryClient.invalidateQueries({ queryKey: ["/api/access-users"] });
              queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
              toast({
                title: "Application reset",
                description: "All data cleared. Bootstrap spadmin kept. Re-import Steps 1–5.",
              });
            }}
          />
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold" data-testid="text-termination-title">{t.employeeTermination}</h2>
          
          <div className="rounded-lg border border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 p-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchEmployee}
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-9"
                data-testid="input-employee-search"
              />
            </div>

            <div className="max-w-md">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger data-testid="select-employee-termination">
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} data-testid={`option-employee-${emp.id}`}>
                      {emp.name} ({emp.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowTerminateDialog(true)}
              disabled={!selectedEmployeeId}
              data-testid="button-terminate-employee"
            >
              <UserX className="h-4 w-4 mr-2" />
              {t.terminateEmployee}
            </Button>
          </div>
        </section>
      </main>

      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t.terminateConfirm}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <span className="font-medium text-foreground">{selectedEmployee.name}</span>
              )}
              <br />
              {t.terminateWarning}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)} data-testid="button-cancel-terminate">
              {t.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleTerminate}
              disabled={terminateEmployee.isPending}
              data-testid="button-confirm-terminate"
            >
              {terminateEmployee.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t.terminating}</>
              ) : (
                t.confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
