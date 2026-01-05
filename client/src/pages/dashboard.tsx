import { useState } from "react";
import { LayoutHeader } from "@/components/layout-header";
import { UserFormDialog } from "@/components/user-form-dialog";
import { useAppData, useDeleteUser } from "@/hooks/use-app-data";
import { 
  Loader2, 
  Pencil, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Search,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

type Language = "en" | "ar";

const DICTIONARY = {
  en: {
    editMode: "Edit Mode",
    viewMode: "View Only",
    addUser: "Add User",
    editUser: "Edit User",
    searchPlaceholder: "Search users...",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    role: "Role",
    company: "Company",
    status: "Status",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    save: "Save",
    cancel: "Cancel",
    confirmDeleteTitle: "Delete User",
    confirmDeleteDesc: "Are you sure you want to delete this user? This action cannot be undone.",
    delete: "Delete",
    noUsers: "No users found matching your search.",
  },
  ar: {
    editMode: "وضع التعديل",
    viewMode: "عرض فقط",
    addUser: "إضافة مستخدم",
    editUser: "تعديل المستخدم",
    searchPlaceholder: "بحث عن مستخدمين...",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني",
    role: "الدور",
    company: "الشركة",
    status: "الحالة",
    actions: "إجراءات",
    active: "نشط",
    inactive: "غير نشط",
    save: "حفظ",
    cancel: "إلغاء",
    confirmDeleteTitle: "حذف المستخدم",
    confirmDeleteDesc: "هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.",
    delete: "حذف",
    noUsers: "لم يتم العثور على مستخدمين مطابقين للبحث.",
  }
};

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null); // Use actual type
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, error } = useAppData();
  const deleteUser = useDeleteUser();
  
  const text = DICTIONARY[language];

  // Language Toggle
  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
        <div className="rounded-2xl bg-destructive/5 p-8 text-center border border-destructive/20">
          <h2 className="text-xl font-bold">Failed to load data</h2>
          <p className="mt-2 text-muted-foreground">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  const { users, roles, companies } = data;

  // Filter users
  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleName = (id: number) => roles.find(r => r.id === id)?.name || "Unknown";
  const getCompanyName = (id: number) => companies.find(c => c.id === id)?.name || "Unknown";

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteUser.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans transition-colors duration-300">
      <LayoutHeader 
        language={language} 
        onToggleLanguage={toggleLanguage} 
        hasUnsavedChanges={isEditMode} // Simplistic unsaved tracking for demo
      />

      <main className="mx-auto max-w-7xl p-6">
        
        {/* Toolbar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 rtl:pl-4 rtl:pr-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                isEditMode 
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Pencil className="h-4 w-4" />
              {isEditMode ? text.viewMode : text.editMode}
            </button>

            <AnimatePresence>
              {isEditMode && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleCreateClick}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  {text.addUser}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm rtl:text-right">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">{text.firstName}</th>
                  <th className="px-6 py-4 font-semibold">{text.lastName}</th>
                  <th className="px-6 py-4 font-semibold">{text.email}</th>
                  <th className="px-6 py-4 font-semibold">{text.role}</th>
                  <th className="px-6 py-4 font-semibold">{text.company}</th>
                  <th className="px-6 py-4 font-semibold text-center">{text.status}</th>
                  {isEditMode && <th className="px-6 py-4 font-semibold text-end">{text.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isEditMode ? 7 : 6} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-muted-foreground font-medium">{text.noUsers}</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="dashboard-table-row group">
                      <td className="px-6 py-4 font-medium text-foreground">{user.firstName}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{user.lastName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30">
                          {getRoleName(user.roleId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{getCompanyName(user.companyId)}</td>
                      <td className="px-6 py-4 text-center">
                        {user.isActive ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {text.active}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-400/10 dark:text-gray-400">
                            <XCircle className="h-3.5 w-3.5" />
                            {text.inactive}
                          </div>
                        )}
                      </td>
                      
                      {isEditMode && (
                        <td className="px-6 py-4 text-end">
                          <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                              title={text.editUser}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(user.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title={text.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <UserFormDialog 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        user={editingUser}
        roles={roles}
        companies={companies}
        dictionary={text}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md animate-in-fade rounded-2xl bg-card p-6 shadow-2xl border border-border">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{text.confirmDeleteTitle}</h3>
            <p className="mt-2 text-muted-foreground">{text.confirmDeleteDesc}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                {text.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
