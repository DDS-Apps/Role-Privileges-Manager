import { useState, useMemo } from "react";
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
  ArrowLeft, Plus, Search, Pencil, Trash2, Loader2, Building2, X, ShieldCheck,
} from "lucide-react";
import type { Contact, ContactCompany } from "@shared/schema";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiJson(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Request failed"); }
  return res.json();
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
}: {
  value: ContactCompany[];
  onChange: (v: ContactCompany[]) => void;
  allCompanies: { id: string; name: string }[];
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
            <option value="">Select company…</option>
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
        <Plus className="h-3 w-3" /> Add company
      </Button>
    </div>
  );
}

// ── Contact form dialog ───────────────────────────────────────────────────────
interface FormValues {
  userId: string; name: string; email: string;
  isAdmin: boolean; companies: ContactCompany[];
}

const EMPTY: FormValues = { userId: "", name: "", email: "", isAdmin: false, companies: [] };

function ContactDialog({
  open, onClose, initial, allCompanies, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: FormValues | null;
  allCompanies: { id: string; name: string }[];
  onSave: (v: FormValues) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormValues>(initial || EMPTY);

  // reset on open
  useState(() => { setForm(initial || EMPTY); });

  const f = (patch: Partial<FormValues>) => setForm(p => ({ ...p, ...patch }));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Contact" : "New Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">Full Name *</Label>
              <Input value={form.name} onChange={e => f({ name: e.target.value })} placeholder="Full name" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Employee / User ID</Label>
              <Input value={form.userId} onChange={e => f({ userId: e.target.value })} placeholder="e.g. 82523" className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Work Email *</Label>
            <Input type="email" value={form.email} onChange={e => f({ email: e.target.value })} placeholder="name@company.com" className="h-9 text-sm" />
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">Companies & Roles</Label>
            <CompanyRows value={form.companies} onChange={v => f({ companies: v })} allCompanies={allCompanies} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isAdmin} onChange={e => f({ isAdmin: e.target.checked })}
              className="w-4 h-4 accent-teal-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">System Admin (can access Admin Panel)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name || !form.email}
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {initial ? "Save Changes" : "Create Contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: bootstrap } = useBootstrapData();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [editTarget, setEditTarget] = useState<Contact | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const allCompanies = useMemo(() => bootstrap?.companies || [], [bootstrap]);

  // Mutations
  const createM = useMutation({
    mutationFn: (v: FormValues) => apiJson("POST", "/api/contacts", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: "Contact created" }); setEditTarget(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FormValues }) => apiJson("PUT", `/api/contacts/${id}`, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: "Contact updated" }); setEditTarget(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => apiJson("DELETE", `/api/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: "Contact deleted" }); setDeleteTarget(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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

  const getCompanyName = (id: string) => allCompanies.find(c => c.id === id)?.name || id;

  const handleSave = (v: FormValues) => {
    if (editTarget === "new") {
      createM.mutate(v);
    } else if (editTarget) {
      updateM.mutate({ id: editTarget.id, v });
    }
  };

  const dialogInitial = useMemo<FormValues | null>(() => {
    if (!editTarget || editTarget === "new") return null;
    return {
      userId: editTarget.userId,
      name: editTarget.name,
      email: editTarget.email,
      isAdmin: editTarget.isAdmin,
      companies: editTarget.companies,
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
              <ArrowLeft className="h-4 w-4" /> Admin Panel
            </button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            <h1 className="font-bold text-lg">Contacts Management</h1>
          </div>
        </div>
        <Button onClick={() => setEditTarget("new")} size="sm"
          className="bg-teal-500 hover:bg-teal-600 text-white gap-1.5">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID…"
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800" />
          </div>
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All companies</option>
            {companiesForFilter.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="self-center text-xs text-slate-400">{filtered.length} contact{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No contacts found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Companies</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Admin</th>
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
                            <span dir="rtl" className="max-w-[140px] truncate">{getCompanyName(cc.companyId)}</span>
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
                      {c.isAdmin && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium"><ShieldCheck className="h-3 w-3" /> Admin</span>}
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
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        initial={dialogInitial}
        allCompanies={allCompanies}
        onSave={handleSave}
        saving={createM.isPending || updateM.isPending}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Contact</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400 py-2">
            Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)}
              disabled={deleteM.isPending}>
              {deleteM.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
