import { useState, useEffect } from "react";
import { User, Role, Company, InsertUser } from "@shared/schema";
import { X, Check } from "lucide-react";
import { useCreateUser, useUpdateUser } from "@/hooks/use-app-data";

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User; // If provided, we are editing
  roles: Role[];
  companies: Company[];
  dictionary: any;
}

export function UserFormDialog({ isOpen, onClose, user, roles, companies, dictionary }: UserFormDialogProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  
  const isEditing = !!user;

  const [formData, setFormData] = useState<Partial<InsertUser>>({
    firstName: "",
    lastName: "",
    email: "",
    roleId: roles[0]?.id,
    companyId: companies[0]?.id,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roleId: user.roleId,
        companyId: user.companyId,
        isActive: user.isActive,
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        roleId: roles[0]?.id,
        companyId: companies[0]?.id,
        isActive: true,
      });
    }
    setErrors({});
  }, [user, isOpen, roles, companies]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email!)) newErrors.email = "Invalid email";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({ id: user.id, ...formData });
      } else {
        await createUser.mutateAsync(formData as InsertUser);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg animate-in-fade rounded-2xl bg-card shadow-2xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-bold">
            {isEditing ? dictionary.editUser : dictionary.addUser}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dictionary.firstName}</label>
              <input
                value={formData.firstName}
                onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                className={`w-full rounded-xl border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all ${errors.firstName ? 'border-destructive' : 'border-input'}`}
                placeholder="John"
              />
              {errors.firstName && <span className="text-xs text-destructive">{errors.firstName}</span>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{dictionary.lastName}</label>
              <input
                value={formData.lastName}
                onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                className={`w-full rounded-xl border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all ${errors.lastName ? 'border-destructive' : 'border-input'}`}
                placeholder="Doe"
              />
              {errors.lastName && <span className="text-xs text-destructive">{errors.lastName}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dictionary.email}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all ${errors.email ? 'border-destructive' : 'border-input'}`}
              placeholder="john@example.com"
            />
            {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dictionary.role}</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData(p => ({ ...p, roleId: Number(e.target.value) }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dictionary.company}</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData(p => ({ ...p, companyId: Number(e.target.value) }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                formData.isActive ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium">{dictionary.status}: {formData.isActive ? dictionary.active : dictionary.inactive}</span>
          </div>
        </form>

        <div className="border-t p-6 bg-muted/20 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {dictionary.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:translate-y-[1px] disabled:opacity-50"
          >
            {isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {dictionary.save}
          </button>
        </div>
      </div>
    </div>
  );
}
