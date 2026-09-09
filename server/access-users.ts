import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type {
  AccessUser,
  AccessCompany,
  AuthType,
  Contact,
  ContactCompany,
  ResolvedAccessUser,
  AppData,
  AccessUserImportResult,
} from "@shared/schema";
import {
  groupAccessUserRows,
  type AccessUserImportRow,
} from "./access-users-import.js";
import { resolveViewerFromContact } from "./viewer-context.js";

const DATA_FILE = path.join(process.cwd(), "access-users.json");
const APP_DATA_FILE = path.join(process.cwd(), "data.json");
const BCRYPT_ROUNDS = 10;

function stripSecrets(row: AccessUser): AccessUser {
  const { passwordHash: _, ...rest } = row;
  return { ...rest, passwordHash: undefined };
}

export class AccessUserStore {
  private rows: AccessUser[] = [];
  private ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      this.rows = JSON.parse(raw) as AccessUser[];
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        await this.migrateFromContacts();
      } else {
        throw err;
      }
    }
  }

  private async save(): Promise<void> {
    await fs.writeFile(DATA_FILE, JSON.stringify(this.rows, null, 2), "utf-8");
  }

  private async migrateFromContacts(): Promise<void> {
    let contacts: Contact[] = [];
    let companies: { id: string; name: string }[] = [];
    try {
      const raw = await fs.readFile(APP_DATA_FILE, "utf-8");
      const data = JSON.parse(raw) as AppData;
      contacts = data.contacts || [];
      companies = data.companies || [];
    } catch {
      contacts = [];
    }

    const companyName = (id: string) =>
      companies.find((c) => c.id === id)?.name || id;

    const localAdminEmails = new Set([
      "spadmin@dallah.onmicrosoft.com",
      "spadmin@dallah.com",
    ]);

    const passwordHash = await bcrypt.hash("password", BCRYPT_ROUNDS);
    const rows: AccessUser[] = [];
    let seq = 1;

    for (const contact of contacts) {
      const email = contact.email.trim().toLowerCase();
      const isLocal = localAdminEmails.has(email);
      const authType: AuthType = isLocal ? "local" : "sso";
      const username = isLocal ? "spadmin" : undefined;
      const hash = isLocal ? passwordHash : undefined;
      const modules = contact.managedModules ?? [];

      const base = {
        personId: contact.id,
        email,
        name: contact.name,
        userId: contact.userId || "",
        authType,
        isAdmin: contact.isAdmin,
        isActive: true,
        managedModules: modules,
        username,
        passwordHash: hash,
      };

      if (contact.companies.length === 0) {
        rows.push({
          id: `AU${String(seq++).padStart(3, "0")}`,
          ...base,
          companyCode: null,
          companyName: null,
          contactRole: null,
        });
        continue;
      }

      for (const cc of contact.companies) {
        rows.push({
          id: `AU${String(seq++).padStart(3, "0")}`,
          ...base,
          companyCode: cc.companyId,
          companyName: companyName(cc.companyId),
          contactRole: cc.role,
        });
      }
    }

    this.rows = rows;
    await this.save();
    console.log(`[access-users] Migrated ${contacts.length} contacts → ${rows.length} allow-list rows`);
  }

  async ensureReady(): Promise<void> {
    await this.ready;
  }

  async list(): Promise<AccessUser[]> {
    await this.ready;
    return this.rows.map(stripSecrets);
  }

  async listRaw(): Promise<AccessUser[]> {
    await this.ready;
    return [...this.rows];
  }

  getActiveByEmail(email: string): AccessUser[] {
    const lower = email.trim().toLowerCase();
    return this.rows.filter((r) => r.isActive && r.email === lower);
  }

  findLocalByUsername(username: string): AccessUser | undefined {
    const lower = username.trim().toLowerCase();
    return this.rows.find(
      (r) =>
        r.isActive &&
        r.authType === "local" &&
        r.username?.toLowerCase() === lower,
    );
  }

  buildContactFromRows(rows: AccessUser[]): Contact | null {
    if (rows.length === 0) return null;
    const first = rows[0];
    const companies: ContactCompany[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.companyCode) continue;
      const key = `${r.companyCode}:${r.contactRole || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      companies.push({
        companyId: r.companyCode,
        role: r.contactRole || "Manager",
      });
    }
    return {
      id: first.personId,
      userId: first.userId || "",
      name: first.name,
      email: first.email,
      isAdmin: rows.some((r) => r.isAdmin),
      companies,
      managedModules: first.managedModules ?? [],
      authType: first.authType,
    };
  }

  resolveByEmail(email: string): ResolvedAccessUser | null {
    const rows = this.getActiveByEmail(email);
    if (rows.length === 0) return null;

    const authTypes = new Set(rows.map((r) => r.authType));
    if (authTypes.size > 1) {
      throw new Error("Inconsistent authType for this email in allow-list");
    }

    const contact = this.buildContactFromRows(rows)!;
    const viewer = resolveViewerFromContact(contact);
    const isAdmin = contact.isAdmin;

    const accesses: AccessCompany[] = isAdmin
      ? []
      : rows
          .filter((r) => r.companyCode)
          .map((r) => ({
            companyCode: r.companyCode!,
            companyName: r.companyName || r.companyCode!,
            contactRole: r.contactRole || "Manager",
          }));

    // Deduplicate accesses by company
    const accessMap = new Map<string, AccessCompany>();
    for (const a of accesses) {
      if (!accessMap.has(a.companyCode)) accessMap.set(a.companyCode, a);
    }

    return {
      personId: contact.id,
      email: contact.email,
      name: contact.name,
      userId: contact.userId,
      authType: rows[0].authType,
      isAdmin,
      accesses: Array.from(accessMap.values()),
      managedModules: viewer.managedModules,
      isUnrestrictedViewer: viewer.managedModules === null,
      contact,
    };
  }

  toAuthUser(
    resolved: ResolvedAccessUser,
    selectedCompanyId: string | null,
  ) {
    const companies = resolved.isAdmin
      ? resolved.contact.companies.map((cc) => ({
          companyId: cc.companyId,
          role: cc.role,
          name:
            resolved.accesses.find((a) => a.companyCode === cc.companyId)
              ?.companyName ||
            this.rows.find((r) => r.companyCode === cc.companyId)?.companyName ||
            cc.companyId,
        }))
      : resolved.accesses.map((a) => ({
          companyId: a.companyCode,
          role: a.contactRole,
          name: a.companyName,
        }));

    // Admins with company rows still need company list for portal if they have companies
    const companyList =
      resolved.isAdmin && resolved.contact.companies.length > 0
        ? resolved.contact.companies.map((cc) => {
            const row = this.rows.find(
              (r) =>
                r.personId === resolved.personId &&
                r.companyCode === cc.companyId,
            );
            return {
              companyId: cc.companyId,
              role: cc.role,
              name: row?.companyName || cc.companyId,
            };
          })
        : companies;

    return {
      id: resolved.personId,
      userId: resolved.userId,
      name: resolved.name,
      email: resolved.email,
      isAdmin: resolved.isAdmin,
      authType: resolved.authType,
      companies: companyList,
      accesses: resolved.accesses,
      selectedCompanyId,
      managedModules: resolved.managedModules,
      isUnrestrictedViewer: resolved.isUnrestrictedViewer,
    };
  }

  getAllContacts(): Contact[] {
    const byPerson = new Map<string, AccessUser[]>();
    for (const row of this.rows.filter((r) => r.isActive)) {
      const list = byPerson.get(row.personId) || [];
      list.push(row);
      byPerson.set(row.personId, list);
    }
    const contacts: Contact[] = [];
    for (const rows of Array.from(byPerson.values())) {
      const c = this.buildContactFromRows(rows);
      if (c) contacts.push(c);
    }
    return contacts.sort((a, b) => a.name.localeCompare(b.name));
  }

  findContactByEmail(email: string): Contact | undefined {
    const resolved = this.resolveByEmail(email);
    return resolved?.contact;
  }

  getGMsForCompany(companyId: string): Contact[] {
    return this.getAllContacts().filter((c) =>
      c.companies.some((cc) => cc.companyId === companyId && cc.role === "GM"),
    );
  }

  private nextId(): string {
    let max = 0;
    for (const r of this.rows) {
      const m = /^AU(\d+)$/.exec(r.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `AU${String(max + 1).padStart(3, "0")}`;
  }

  private nextPersonId(): string {
    let max = 0;
    for (const r of this.rows) {
      const m = /^C(\d+)$/.exec(r.personId);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `C${String(max + 1).padStart(3, "0")}`;
  }

  async upsertPerson(input: {
    personId?: string;
    email: string;
    name: string;
    userId?: string;
    authType: AuthType;
    isAdmin: boolean;
    isActive?: boolean;
    managedModules?: string[];
    companies: { companyId: string; role: string; companyName?: string }[];
    username?: string;
    password?: string;
  }): Promise<Contact> {
    await this.ready;
    const email = input.email.trim().toLowerCase();
    const personId =
      input.personId ||
      this.rows.find((r) => r.email === email)?.personId ||
      this.nextPersonId();

    // Remove existing rows for this person
    this.rows = this.rows.filter((r) => r.personId !== personId);

    let passwordHash: string | undefined;
    let username = input.username;
    if (input.authType === "local") {
      username = (input.username || email.split("@")[0]).toLowerCase();
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      } else {
        const prev = this.rows.find(
          (r) => r.personId === personId || r.email === email,
        );
        passwordHash = prev?.passwordHash;
        if (!passwordHash) {
          throw new Error("Password required for new local accounts");
        }
      }
    }

    const modules = input.managedModules ?? [];
    const base = {
      personId,
      email,
      name: input.name,
      userId: input.userId || "",
      authType: input.authType,
      isAdmin: input.isAdmin,
      isActive: input.isActive !== false,
      managedModules: modules,
      username,
      passwordHash,
    };

    if (input.isAdmin && input.companies.length === 0) {
      this.rows.push({
        id: this.nextId(),
        ...base,
        companyCode: null,
        companyName: null,
        contactRole: null,
      });
    } else {
      for (const cc of input.companies) {
        this.rows.push({
          id: this.nextId(),
          ...base,
          companyCode: cc.companyId,
          companyName: cc.companyName || cc.companyId,
          contactRole: cc.role,
        });
      }
      if (input.companies.length === 0) {
        this.rows.push({
          id: this.nextId(),
          ...base,
          companyCode: null,
          companyName: null,
          contactRole: null,
        });
      }
    }

    await this.save();
    return this.buildContactFromRows(this.getActiveByEmail(email))!;
  }

  async updatePerson(
    personId: string,
    updates: {
      email?: string;
      name?: string;
      userId?: string;
      authType?: AuthType;
      isAdmin?: boolean;
      isActive?: boolean;
      managedModules?: string[];
      companies?: { companyId: string; role: string; companyName?: string }[];
      username?: string;
      password?: string;
    },
  ): Promise<Contact> {
    await this.ready;
    const existing = this.rows.filter((r) => r.personId === personId);
    if (existing.length === 0) throw new Error("Contact not found");

    const first = existing[0];
    const email = (updates.email ?? first.email).trim().toLowerCase();
    const authType = updates.authType ?? first.authType;
    const isAdmin = updates.isAdmin ?? first.isAdmin;
    const companies =
      updates.companies ??
      existing
        .filter((r) => r.companyCode)
        .map((r) => ({
          companyId: r.companyCode!,
          role: r.contactRole || "Manager",
          companyName: r.companyName || r.companyCode!,
        }));

    let passwordHash = first.passwordHash;
    let username = updates.username ?? first.username;
    if (authType === "local") {
      username = (username || email.split("@")[0]).toLowerCase();
      if (updates.password) {
        passwordHash = await bcrypt.hash(updates.password, BCRYPT_ROUNDS);
      } else if (!passwordHash) {
        throw new Error("Password required for local accounts");
      }
    } else {
      username = undefined;
      passwordHash = undefined;
    }

    this.rows = this.rows.filter((r) => r.personId !== personId);
    const modules = updates.managedModules ?? first.managedModules ?? [];
    const base = {
      personId,
      email,
      name: updates.name ?? first.name,
      userId: updates.userId ?? first.userId ?? "",
      authType,
      isAdmin,
      isActive: updates.isActive ?? first.isActive,
      managedModules: modules,
      username,
      passwordHash,
    };

    if (companies.length === 0) {
      this.rows.push({
        id: this.nextId(),
        ...base,
        companyCode: null,
        companyName: null,
        contactRole: null,
      });
    } else {
      for (const cc of companies) {
        this.rows.push({
          id: this.nextId(),
          ...base,
          companyCode: cc.companyId,
          companyName: cc.companyName || cc.companyId,
          contactRole: cc.role,
        });
      }
    }

    await this.save();
    return this.buildContactFromRows(
      this.rows.filter((r) => r.personId === personId && r.isActive),
    )!;
  }

  async deletePerson(personId: string): Promise<void> {
    await this.ready;
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.personId !== personId);
    if (this.rows.length === before) throw new Error("Contact not found");
    await this.save();
  }

  async importFromExcelRows(rows: AccessUserImportRow[]): Promise<AccessUserImportResult> {
    await this.ready;

    const result: AccessUserImportResult = {
      type: "access_users",
      processed: 0,
      personsCreated: 0,
      personsUpdated: 0,
      rowsCreated: 0,
      skipped: 0,
      errors: [],
    };

    const grouped = groupAccessUserRows(rows);

    for (const [email, personRows] of Array.from(grouped.entries())) {
      result.processed++;
      const first = personRows[0];
      const existed = this.rows.some((r) => r.email === email);

      const companies = personRows
        .filter((r) => r.companyCode)
        .map((r) => ({
          companyId: r.companyCode!,
          role: r.contactRole || "GM",
          companyName: r.companyName,
        }));

      const isAdmin = personRows.some((r) => r.isAdmin);
      const managedModules = Array.from(
        new Set(personRows.flatMap((r) => r.managedModules)),
      );

      try {
        await this.upsertPerson({
          email,
          name: first.name,
          userId: first.userId,
          authType: first.authType,
          isAdmin,
          managedModules,
          companies,
          username: first.username,
          password: first.authType === "local" ? "password" : undefined,
        });
        result.rowsCreated += personRows.length;
        if (existed) result.personsUpdated++;
        else result.personsCreated++;
      } catch (err) {
        result.skipped++;
        result.errors.push({
          row: 0,
          message: `${email}: ${err instanceof Error ? err.message : "Import failed"}`,
        });
      }
    }

    return result;
  }

  async verifyLocalPassword(
    username: string,
    password: string,
  ): Promise<ResolvedAccessUser | null> {
    await this.ready;
    const row = this.findLocalByUsername(username);
    if (!row || !row.passwordHash) return null;
    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) return null;
    if (row.authType !== "local") return null;
    return this.resolveByEmail(row.email);
  }
}

export const accessUsers = new AccessUserStore();
