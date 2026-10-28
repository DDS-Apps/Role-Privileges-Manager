import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBootstrapData } from "@/hooks/use-app-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Search, Pencil, Trash2, Loader2, Building2, X, ShieldCheck, Globe,
} from "lucide-react";
import type { Contact, ContactCompany } from "@shared/schema";
import { useAppLanguage } from "@/contexts/app-language";
import { contactsT, type ContactsUi } from "@/lib/admin-contacts-i18n";
import { resolveCompanyLabel } from "@/lib/company-display";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiJson<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error("Invalid server response");
  }
  if (!res.ok) {
    const err = data as { message?: string } | null;
    throw new Error(err?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: () => apiJson("GET", "/api/contacts"),
  });
}

const ROLES = ["GM", "2nd", "3rd", "4th", "Admin"];

// ── Company picker inside the form ───────────────────────────────────────────
function CompanyRows({
  value,
  onChange,
  allCompanies,
  ui,
}: {
  value: ContactCompany[];
  onChange: (v: ContactCompany[]) => void;
  allCompanies: { id: string; name: string }[];
  ui: ContactsUi;
}) {
  const add = () => onChange([...value, { companyId: "", role: "GM" }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const update = (i: number, patch: Partial<ContactCompany>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={row.companyId}
            onChange={e => update(i, { companyId: e.target.value })}
            className="flex-1 h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{ui.selectCompany}</option>
            {allCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={row.role}
            onChange={e => update(i, { role: e.target.value })}
            className="w-24 h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={() => remove(i)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-xs gap-1">
        <Plus className="h-3 w-3" /> {ui.addCompany}
      </Button>
    </div>
  );
}

// ── Contact form dialog ───────────────────────────────────────────────────────
interface FormValues {
  userId: string; name: string; email: string;
  isAdmin: boolean; companies: ContactCompany[];
  managedModules: string[];
  authType: "sso" | "local";
  username: string;
  password: string;
}

const EMPTY: FormValues = {
  userId: "", name: "", email: "", isAdmin: false, companies: [],
  managedModules: [], authType: "sso", username: "", password: "",
};

function ModuleMultiSelect({
  value,
  onChange,
  allModules,
  ui,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  allModules: string[];
  ui: ContactsUi;
}) {
  const toggle = (module: string) => {
    onChange(
      value.includes(module)
        ? value.filter((m) => m !== module)
        : [...value, module],
    );
  };

  if (allModules.length === 0) {
    return <p className="text-xs text-slate-400">{ui.noModulesCatalog}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allModules.map((module) => (
        <label
          key={module}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs cursor-pointer hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50"
        >
          <input
            type="checkbox"
            checked={value.includes(module)}
            onChange={() => toggle(module)}
            className="accent-teal-600"
          />
          {module}
        </label>
      ))}
    </div>
  );
}

function ContactDialog({
  open, onClose, seedKey, initial, allCompanies, allModules, onSave, saving, ui,
}: {
  open: boolean;
  onClose: () => void;
  seedKey: string;
  initial: FormValues | null;
  allCompanies: { id: string; name: string }[];
  allModules: string[];
  onSave: (v: FormValues) => void;
  saving: boolean;
  ui: ContactsUi;
}) {
  const [form, setForm] = useState<FormValues>(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY);
    }
  }, [open, seedKey, initial]);

  const f = (patch: Partial<FormValues>) => setForm(p => ({ ...p, ...patch }));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? ui.editContact : ui.newContact}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">{ui.fullName}</Label>
              <Input value={form.name} onChange={e => f({ name: e.target.value })} placeholder={ui.fullNamePh} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">{ui.userId}</Label>
              <Input value={form.userId} onChange={e => f({ userId: e.target.value })} placeholder={ui.userIdPh} className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">{ui.workEmail}</Label>
            <Input type="email" value={form.email} onChange={e => f({ email: e.target.value })} placeholder={ui.workEmailPh} className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">{ui.authType}</Label>
              <select
                value={form.authType}
                onChange={(e) => f({ authType: e.target.value as "sso" | "local" })}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-2"
              >
                <option value="sso">{ui.authSso}</option>
                <option value="local">{ui.authLocal}</option>
              </select>
            </div>
            {form.authType === "local" && (
              <div>
                <Label className="text-xs font-medium mb-1 block">{ui.username}</Label>
                <Input
                  value={form.username}
                  onChange={(e) => f({ username: e.target.value })}
                  placeholder={ui.usernamePh}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          {form.authType === "local" && (
            <div>
              <Label className="text-xs font-medium mb-1 block">
                {initial ? ui.newPassword : ui.password}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => f({ password: e.target.value })}
                placeholder="••••••••"
                className="h-9 text-sm"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium mb-2 block">{ui.companiesRoles}</Label>
            <CompanyRows value={form.companies} onChange={v => f({ companies: v })} allCompanies={allCompanies} ui={ui} />
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">{ui.managedModules}</Label>
            <p className="text-[11px] text-slate-400 mb-2">
              {ui.managedModulesHint}
            </p>
            <ModuleMultiSelect
              value={form.managedModules}
              onChange={(v) => f({ managedModules: v })}
              allModules={allModules}
              ui={ui}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isAdmin} onChange={e => f({ isAdmin: e.target.checked })}
              className="w-4 h-4 accent-teal-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{ui.systemAdmin}</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>{ui.cancel}</Button>
          <Button onClick={() => onSave(form)} disabled={
            saving || !form.name || !form.email ||
            (form.authType === "local" && !initial && !form.password)
          }
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : null}
            {initial ? ui.saveChanges : ui.createContact}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminContactsPage() {
  const { language, isRtl, toggleLanguage } = useAppLanguage();
  const ui = contactsT(language);
  const { data: contacts = [], isLoading } = useContacts();
  const { data: bootstrap } = useBootstrapData();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [editTarget, setEditTarget] = useState<Contact | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const allCompanies = useMemo(() => bootstrap?.companies || [], [bootstrap]);
  const allModules = useMemo(() => {
    const modules = new Set((bootstrap?.privileges || []).map((p) => p.module));
    return Array.from(modules).sort((a, b) => a.localeCompare(b));
  }, [bootstrap]);

  // Mutations
  const createM = useMutation({
    mutationFn: (v: FormValues) => apiJson("POST", "/api/contacts", {
      ...v,
      companies: v.companies.filter(c => c.companyId),
      password: v.password || undefined,
      username: v.username || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: ui.toastCreated }); setEditTarget(null); },
    onError: (e: Error) => toast({ title: ui.toastError, description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FormValues }) => apiJson("POST", `/api/contacts/${id}/update`, {
      ...v,
      companies: v.companies.filter(c => c.companyId),
      password: v.password || undefined,
      username: v.username || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: ui.toastUpdated }); setEditTarget(null); },
    onError: (e: Error) => toast({ title: ui.toastError, description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => apiJson("DELETE", `/api/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: ui.toastDeleted }); setDeleteTarget(null); },
    onError: (e: Error) => toast({ title: ui.toastError, description: e.message, variant: "destructive" }),
  });

  // Filter
  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.userId.includes(q));
    }
    if (filterCompany) {
      list = list.filter(c => c.companies.some(cc => cc.companyId === filterCompany));
    }
    return list;
  }, [contacts, search, filterCompany]);

  const companiesForFilter = useMemo(() => {
    const ids = new Set(contacts.flatMap(c => c.companies.map(cc => cc.companyId)));
    return allCompanies.filter(c => ids.has(c.id));
  }, [contacts, allCompanies]);

  const getCompanyName = (id: string) =>
    resolveCompanyLabel(allCompanies, id, language);

  const handleSave = (v: FormValues) => {
    const payload: FormValues = {
      ...v,
      companies: v.companies.filter(c => c.companyId),
      password: v.password || "",
      username: v.authType === "local" ? (v.username || v.email.split("@")[0]) : "",
    };
    if (editTarget === "new") {
      createM.mutate(payload);
    } else if (editTarget) {
      updateM.mutate({ id: editTarget.id, v: payload });
    }
  };

  const contactSeedKey = editTarget === "new" ? "new" : editTarget?.id ?? "";

  const dialogInitial = useMemo<FormValues | null>(() => {
    if (!editTarget || editTarget === "new") return null;
    return {
      userId: editTarget.userId,
      name: editTarget.name,
      email: editTarget.email,
      isAdmin: editTarget.isAdmin,
      companies: editTarget.companies.map(c => ({ ...c })),
      managedModules: [...(editTarget.managedModules ?? [])],
      authType: editTarget.authType || "sso",
      username: editTarget.username || "",
      password: "",
    };
  }, [editTarget]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <button className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
              <ArrowLeft className="h-4 w-4" /> {ui.backAdmin}
            </button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            <h1 className="font-bold text-lg">{ui.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/20"
            aria-label={ui.language}
          >
            <Globe className="h-3.5 w-3.5" />
            {language.toUpperCase()}
          </button>
          <Button onClick={() => setEditTarget("new")} size="sm"
            className="bg-teal-500 hover:bg-teal-600 text-white gap-1.5">
            <Plus className="h-4 w-4" /> {ui.addContact}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={ui.searchPlaceholder}
              className="ps-9 h-9 text-sm bg-white dark:bg-slate-800" />
          </div>
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{ui.allCompanies}</option>
            {companiesForFilter.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="self-center text-xs text-slate-400">
            {filtered.length}{" "}
            {filtered.length === 1 ? ui.contactSingular : ui.contactsCount}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">{ui.noContacts}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table dir={isRtl ? "rtl" : "ltr"} className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colName}</th>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colEmail}</th>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colId}</th>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colCompanies}</th>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colModules}</th>
                  <th className="text-start px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{ui.colAdmin}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-semibold text-xs shrink-0">
                          {c.name.charAt(0) || "?"}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{c.name || <span className="text-slate-400 italic">–</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{c.userId || "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.companies.slice(0, 3).map((cc, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                            <Building2 className="h-2.5 w-2.5" />
                            <span dir="auto" className="max-w-[140px] truncate">{getCompanyName(cc.companyId)}</span>
                            <span className="text-slate-400">·{cc.role}</span>
                          </span>
                        ))}
                        {c.companies.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-400">
                            +{c.companies.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.managedModules?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {c.managedModules.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-xs text-teal-700 dark:text-teal-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{ui.allModulesGm}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.isAdmin && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium"><ShieldCheck className="h-3 w-3" /> {ui.adminBadge}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditTarget(c)}
                          className="p-1.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit / Create dialog */}
      <ContactDialog
        key={contactSeedKey || "closed"}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        seedKey={contactSeedKey}
        initial={dialogInitial}
        allCompanies={allCompanies}
        allModules={allModules}
        onSave={handleSave}
        saving={createM.isPending || updateM.isPending}
        ui={ui}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{ui.deleteTitle}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400 py-2">
            {ui.deleteBody
              .replace("{name}", deleteTarget?.name ?? "")
              .replace("{email}", deleteTarget?.email ?? "")}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{ui.cancel}</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)}
              disabled={deleteM.isPending}>
              {deleteM.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : null}
              {ui.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
