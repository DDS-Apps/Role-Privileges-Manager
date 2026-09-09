import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { accessUsers } from "./access-users";
import { isEntraConfigured, verifyEntraIdToken } from "./auth-entra";
import { api } from "@shared/routes";
import { applyAssignmentsSchema, uploadCatalogSchema, createRequestSchema, updateRequestSchema, fulfillItTicketSchema, userRoleImportModeSchema, catalogImportModeSchema, RequestStatus, type ViewerContext } from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";
import multer from "multer";
import { parseUserRolesExcel } from "./user-roles-import.js";
import {
  detectExcelImportType,
  parsePrivilegeCatalogExcel,
} from "./catalog-import.js";
import { parseEmployeeRosterExcel } from "./employees-import.js";
import { parseAccessUsersExcel } from "./access-users-import.js";
import { resolveViewerFromContact } from "./viewer-context.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      Boolean(file.originalname.match(/\.xlsx?$/i));
    if (!ok) {
      cb(new Error("Only .xlsx or .xls files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Extend session with auth data — only allow-list (access-users) principals
declare module "express-session" {
  interface SessionData {
    email: string;
    personId: string;
    selectedCompanyId: string;
    isAdmin: boolean;
    authType: "sso" | "local";
    /** @deprecated legacy session fields */
    contactId?: string;
    employeeId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.email && !req.session.contactId)
    return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function getSessionActorId(req: Request): string {
  return req.session.personId || req.session.contactId || "";
}

async function resolveSessionViewer(req: Request): Promise<ViewerContext | null> {
  await accessUsers.ensureReady();
  const email = req.session.email;
  if (email) {
    const resolved = accessUsers.resolveByEmail(email);
    if (resolved) return resolveViewerFromContact(resolved.contact);
  }
  // Legacy cookie: contactId only
  if (req.session.contactId) {
    const contacts = accessUsers.getAllContacts();
    const contact = contacts.find((c) => c.id === req.session.contactId);
    if (contact) return resolveViewerFromContact(contact);
  }
  return null;
}

function establishSession(
  req: Request,
  resolved: NonNullable<ReturnType<typeof accessUsers.resolveByEmail>>,
) {
  req.session.email = resolved.email;
  req.session.personId = resolved.personId;
  req.session.contactId = resolved.personId; // backward-compatible actor id
  req.session.isAdmin = resolved.isAdmin;
  req.session.authType = resolved.authType;
  delete req.session.employeeId;
}

async function enrichAuthUser(
  resolved: NonNullable<ReturnType<typeof accessUsers.resolveByEmail>>,
  selectedCompanyId: string | null,
) {
  const bootstrap = await storage.getBootstrapData();
  let selected = selectedCompanyId;

  if (resolved.isAdmin) {
    const allCompanies = bootstrap.companies.map((c) => ({
      companyId: c.id,
      role: "Admin",
      name: c.name,
    }));

    if (selected && !allCompanies.some((c) => c.companyId === selected)) {
      selected = allCompanies[0]?.companyId ?? null;
    } else if (!selected && allCompanies.length > 0) {
      selected = allCompanies[0].companyId;
    }

    const base = accessUsers.toAuthUser(resolved, selected);
    return {
      ...base,
      companies: allCompanies,
      managedModules: null,
      isUnrestrictedViewer: true,
      selectedCompanyId: selected,
    };
  }

  const companies = resolved.contact.companies;
  if (
    selected &&
    !companies.some((c) => c.companyId === selected)
  ) {
    selected = companies[0]?.companyId ?? null;
  } else if (!selected) {
    selected = companies[0]?.companyId ?? null;
  }

  return accessUsers.toAuthUser(resolved, selected);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============================================
  // AUTH — only allow-list (access-users) may sign in
  // ============================================

  // POST /api/auth/login  { username, password } — local accounts only
  app.post("/api/auth/login", async (req, res) => {
    try {
      await accessUsers.ensureReady();
      const { username, password, email } = req.body as {
        username?: string;
        password?: string;
        email?: string;
      };
      const userKey = (username || email || "").trim();
      if (!userKey || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const resolved = await accessUsers.verifyLocalPassword(userKey, password);
      if (!resolved) {
        return res.status(401).json({
          message: "Invalid credentials or account not in allow-list",
        });
      }
      if (resolved.authType !== "local") {
        return res.status(403).json({
          message: "This account must sign in with Microsoft SSO",
        });
      }

      establishSession(req, resolved);
      const priorSelected = req.session.selectedCompanyId || null;
      const authUser = await enrichAuthUser(resolved, priorSelected);
      req.session.selectedCompanyId = authUser.selectedCompanyId || "";
      return res.json(authUser);
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({
        message: err instanceof Error ? err.message : "Login failed",
      });
    }
  });

  // POST /api/auth/sso  { idToken } — Entra SSO; email must be on allow-list
  app.post("/api/auth/sso", async (req, res) => {
    try {
      await accessUsers.ensureReady();
      const { idToken } = req.body as { idToken?: string };
      if (!idToken) {
        return res.status(400).json({ message: "idToken required" });
      }

      const email = await verifyEntraIdToken(idToken);
      const resolved = accessUsers.resolveByEmail(email);
      if (!resolved) {
        return res.status(403).json({
          message: "Access denied — your account is not in the allow-list",
        });
      }
      if (resolved.authType !== "sso") {
        return res.status(403).json({
          message: "This account must sign in with a local username and password",
        });
      }

      establishSession(req, resolved);
      const priorSelected = req.session.selectedCompanyId || null;
      const authUser = await enrichAuthUser(resolved, priorSelected);
      req.session.selectedCompanyId = authUser.selectedCompanyId || "";
      return res.json(authUser);
    } catch (err) {
      console.error("SSO login error:", err);
      const message = err instanceof Error ? err.message : "SSO login failed";
      const status =
        message.includes("not configured") || message.includes("allow-list")
          ? 403
          : 401;
      res.status(status).json({ message });
    }
  });

  app.get("/api/auth/config", (_req, res) => {
    res.json({
      ssoEnabled: isEntraConfigured(),
      tenantId: process.env.AZURE_AD_TENANT_ID || null,
      clientId: process.env.AZURE_AD_CLIENT_ID || null,
    });
  });

  // POST /api/auth/select-company  { companyId }
  app.post("/api/auth/select-company", async (req, res) => {
    if (!req.session.email && !req.session.contactId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { companyId } = req.body as { companyId: string };
    if (!companyId) return res.status(400).json({ message: "companyId required" });

    await accessUsers.ensureReady();
    const email = req.session.email;
    const resolved = email
      ? accessUsers.resolveByEmail(email)
      : accessUsers.getAllContacts().find((c) => c.id === req.session.contactId)
        ? accessUsers.resolveByEmail(
            accessUsers.getAllContacts().find((c) => c.id === req.session.contactId)!.email,
          )
        : null;

    if (!resolved) return res.status(401).json({ message: "Not authenticated" });

    if (resolved.isAdmin) {
      const bootstrap = await storage.getBootstrapData();
      if (!bootstrap.companies.some((c) => c.id === companyId)) {
        return res.status(403).json({ message: "Unknown company" });
      }
    } else {
      const allowed = resolved.contact.companies.some((c) => c.companyId === companyId);
      if (!allowed) {
        return res.status(403).json({ message: "Company not in your access list" });
      }
    }

    req.session.selectedCompanyId = companyId;
    res.json({ ok: true, selectedCompanyId: companyId });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.email && !req.session.contactId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      await accessUsers.ensureReady();
      let resolved = req.session.email
        ? accessUsers.resolveByEmail(req.session.email)
        : null;
      if (!resolved && req.session.contactId) {
        const contact = accessUsers
          .getAllContacts()
          .find((c) => c.id === req.session.contactId);
        if (contact) resolved = accessUsers.resolveByEmail(contact.email);
      }
      if (!resolved) return res.status(401).json({ message: "User not found" });

      // Refresh session fields
      req.session.email = resolved.email;
      req.session.personId = resolved.personId;
      req.session.contactId = resolved.personId;
      req.session.isAdmin = resolved.isAdmin;
      req.session.authType = resolved.authType;

      const authUser = await enrichAuthUser(
        resolved,
        req.session.selectedCompanyId || null,
      );
      req.session.selectedCompanyId = authUser.selectedCompanyId || "";
      return res.json(authUser);
    } catch {
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  // ── Access-users / contacts CRUD (admin only) ──────────────────────────────
  app.get("/api/contacts", requireAuth as any, requireAdmin as any, async (_req, res) => {
    try {
      await accessUsers.ensureReady();
      res.json(accessUsers.getAllContacts());
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/access-users", requireAuth as any, requireAdmin as any, async (_req, res) => {
    try {
      await accessUsers.ensureReady();
      res.json(await accessUsers.list());
    } catch {
      res.status(500).json({ message: "Failed to fetch access users" });
    }
  });

  app.post("/api/contacts", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      await accessUsers.ensureReady();
      const body = req.body as {
        userId?: string;
        name: string;
        email: string;
        isAdmin?: boolean;
        companies?: { companyId: string; role: string }[];
        managedModules?: string[];
        authType?: "sso" | "local";
        username?: string;
        password?: string;
      };
      const data = await storage.getBootstrapData();
      const companies = (body.companies || []).map((cc) => ({
        companyId: cc.companyId,
        role: cc.role,
        companyName: data.companies.find((c) => c.id === cc.companyId)?.name || cc.companyId,
      }));
      const contact = await accessUsers.upsertPerson({
        email: body.email,
        name: body.name,
        userId: body.userId,
        authType: body.authType || "sso",
        isAdmin: Boolean(body.isAdmin),
        managedModules: body.managedModules,
        companies,
        username: body.username,
        password: body.password,
      });
      res.json(contact);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to create contact",
      });
    }
  });

  app.put("/api/contacts/:id", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      await accessUsers.ensureReady();
      const body = req.body as {
        userId?: string;
        name?: string;
        email?: string;
        isAdmin?: boolean;
        companies?: { companyId: string; role: string }[];
        managedModules?: string[];
        authType?: "sso" | "local";
        username?: string;
        password?: string;
      };
      const data = await storage.getBootstrapData();
      const companies = body.companies?.map((cc) => ({
        companyId: cc.companyId,
        role: cc.role,
        companyName: data.companies.find((c) => c.id === cc.companyId)?.name || cc.companyId,
      }));
      const contact = await accessUsers.updatePerson(req.params.id, {
        ...body,
        companies,
      });
      res.json(contact);
    } catch (err: any) {
      res.status(err.message === "Contact not found" ? 404 : 500).json({
        message: err.message || "Failed to update contact",
      });
    }
  });

  app.delete("/api/contacts/:id", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      await accessUsers.ensureReady();
      await accessUsers.deletePerson(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.message === "Contact not found" ? 404 : 500).json({ message: err.message });
    }
  });

  // Bootstrap - get all data
  app.get(api.bootstrap.get.path, requireAuth as any, async (req, res) => {
    try {
      const viewer = await resolveSessionViewer(req);
      const data = await storage.getBootstrapData(viewer);
      res.json(data);
    } catch (err) {
      console.error("Bootstrap error:", err);
      res.status(500).json({ message: "Failed to load data" });
    }
  });

  // Apply Assignments (direct add/remove)
  app.post(api.assignments.apply.path, requireAuth as any, async (req, res) => {
    try {
      const { actorId, companyId, targetEmployeeId, privilegeIds } = applyAssignmentsSchema.parse(req.body);
      
      // Authorization is handled in storage.applyAssignments which checks:
      // 1. Manager and employee have same legalCompanyId
      // 2. Employee.managerId matches the actorId
      // Manager can grant privileges in ANY company (cross-company)

      const assignment = await storage.applyAssignments(actorId, companyId, targetEmployeeId, privilegeIds);
      res.json(assignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(403).json({ message: err.message });
      }
      console.error("Apply assignments error:", err);
      res.status(500).json({ message: "Failed to apply assignments" });
    }
  });

  // Upload Catalog
  app.post(api.catalog.upload.path, requireAuth as any, async (req, res) => {
    try {
      const { actorId, catalog } = uploadCatalogSchema.parse(req.body);
      
      // Verify actor is a manager
      const data = await storage.getBootstrapData();
      const manager = data.employees.find(e => e.id === actorId);
      if (!manager?.isManager) {
        return res.status(403).json({ message: "Only managers can upload catalog" });
      }

      const privileges = await storage.uploadCatalog(actorId, catalog);
      res.json({ privileges });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Upload catalog error:", err);
      res.status(500).json({ message: "Failed to upload catalog" });
    }
  });

  // Import user roles from ERP Excel (admin)
  app.post(
    api.userRoles.upload.path,
    requireAuth as any,
    requireAdmin as any,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Excel file is required (field: file)" });
        }

        const importType = detectExcelImportType(req.file.buffer);

        if (importType === "catalog") {
          const catalog = parsePrivilegeCatalogExcel(req.file.buffer);
          if (catalog.length === 0) {
            return res.status(400).json({ message: "No privilege catalog rows found in Excel file" });
          }
          const actorId = getSessionActorId(req);
          const mode = catalogImportModeSchema.parse(req.query.mode ?? "merge");
          const result = await storage.importPrivilegeCatalog(actorId, catalog, mode);
          return res.json(result);
        }

        if (importType === "unknown") {
          return res.status(400).json({
            message:
              "Unrecognized Excel format. Expected ERP user roles (USERNAME, Company_Code, ...) or privilege catalog (Models, Functions, Privileges).",
          });
        }

        const mode = userRoleImportModeSchema.parse(req.query.mode ?? "merge");
        const actorId = getSessionActorId(req);
        const bootstrap = await storage.getBootstrapData();
        const { rows, errors: parseErrors } = parseUserRolesExcel(
          req.file.buffer,
          bootstrap.companies,
        );

        if (rows.length === 0 && parseErrors.length > 0) {
          return res.status(400).json({
            message: "No valid rows found in Excel file",
            type: "user_roles",
            processed: 0,
            assignmentsUpdated: 0,
            privilegesCreated: 0,
            companiesCreated: 0,
            skipped: 0,
            errors: parseErrors,
          });
        }

        const result = await storage.importUserRoles(actorId, rows, mode);
        result.errors.push(...parseErrors);

        res.json({ type: "user_roles", ...result });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        }
        console.error("User roles upload error:", err);
        res.status(500).json({
          message: err instanceof Error ? err.message : "Failed to import user roles",
        });
      }
    },
  );

  // Dedicated import endpoints (admin) — force import type per upload slot
  app.post(
    api.imports.catalog.path,
    requireAuth as any,
    requireAdmin as any,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Excel file is required (field: file)" });
        }
        const catalog = parsePrivilegeCatalogExcel(req.file.buffer);
        if (catalog.length === 0) {
          return res.status(400).json({ message: "No privilege catalog rows found" });
        }
        const mode = catalogImportModeSchema.parse(req.query.mode ?? "merge");
        const actorId = getSessionActorId(req);
        const result = await storage.importPrivilegeCatalog(actorId, catalog, mode);
        res.json(result);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("Catalog import error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Failed to import catalog" });
      }
    },
  );

  app.post(
    api.imports.userRoles.path,
    requireAuth as any,
    requireAdmin as any,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Excel file is required (field: file)" });
        }
        const mode = userRoleImportModeSchema.parse(req.query.mode ?? "merge");
        const actorId = getSessionActorId(req);
        const bootstrap = await storage.getBootstrapData();
        const { rows, errors: parseErrors } = parseUserRolesExcel(
          req.file.buffer,
          bootstrap.companies,
        );
        if (rows.length === 0) {
          return res.status(400).json({
            message: "No valid user role rows found",
            type: "user_roles",
            processed: 0,
            assignmentsUpdated: 0,
            privilegesCreated: 0,
            companiesCreated: 0,
            employeesCreated: 0,
            skipped: 0,
            errors: parseErrors,
          });
        }
        const result = await storage.importUserRoles(actorId, rows, mode);
        result.errors.push(...parseErrors);
        res.json({ type: "user_roles", ...result });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("User roles import error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Failed to import user roles" });
      }
    },
  );

  app.post(
    api.imports.employees.path,
    requireAuth as any,
    requireAdmin as any,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Excel file is required (field: file)" });
        }
        const actorId = getSessionActorId(req);
        const bootstrap = await storage.getBootstrapData();
        const { rows, errors: parseErrors } = parseEmployeeRosterExcel(
          req.file.buffer,
          bootstrap.companies,
        );
        if (rows.length === 0) {
          return res.status(400).json({
            message: "No valid employee rows found",
            type: "employees",
            processed: 0,
            created: 0,
            updated: 0,
            managersLinked: 0,
            skipped: 0,
            errors: parseErrors,
          });
        }
        const result = await storage.importEmployeeRoster(actorId, rows);
        result.errors.push(...parseErrors);
        res.json(result);
      } catch (err) {
        console.error("Employee roster import error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Failed to import employees" });
      }
    },
  );

  app.post(
    api.imports.accessUsers.path,
    requireAuth as any,
    requireAdmin as any,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Excel file is required (field: file)" });
        }
        const { rows, errors: parseErrors } = parseAccessUsersExcel(req.file.buffer);
        if (rows.length === 0) {
          return res.status(400).json({
            message: "No valid access user rows found",
            type: "access_users",
            processed: 0,
            personsCreated: 0,
            personsUpdated: 0,
            rowsCreated: 0,
            skipped: 0,
            errors: parseErrors,
          });
        }
        const result = await accessUsers.importFromExcelRows(rows);
        result.errors.push(...parseErrors);
        res.json(result);
      } catch (err) {
        console.error("Access users import error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Failed to import access users" });
      }
    },
  );

  // Get Audit Log
  app.get(api.audit.list.path, requireAuth as any, async (req, res) => {
    try {
      const auditLog = await storage.getAuditLog();
      res.json(auditLog);
    } catch (err) {
      console.error("Get audit log error:", err);
      res.status(500).json({ message: "Failed to get audit log" });
    }
  });

  // Export Employee Privileges to Excel
  app.get(api.export.employee.path, requireAuth as any, async (req, res) => {
    try {
      const { employeeId, scope, companyId } = req.query;
      
      if (!employeeId) {
        return res.status(400).json({ message: "employeeId is required" });
      }

      const data = await storage.getBootstrapData();
      const employee = data.employees.find(e => e.id === employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get all companies that have assignments for this employee
      let companyIds = data.assignments
        .filter(a => a.employeeId === employeeId)
        .map(a => a.companyId);
      
      // Add employee's legal company if not already included
      if (!companyIds.includes(employee.legalCompanyId)) {
        companyIds.push(employee.legalCompanyId);
      }

      if (scope === "company" && companyId) {
        companyIds = companyIds.filter((c: string) => c === companyId);
      }

      const wb = XLSX.utils.book_new();

      for (const cid of companyIds) {
        const company = data.companies.find(c => c.id === cid);
        const assignment = data.assignments.find(
          a => a.companyId === cid && a.employeeId === employeeId
        );

        const rows = data.privileges.map(p => ({
          Module: p.module,
          Function: p.function,
          Role: p.role,
          Assigned: assignment?.privilegeIds.includes(p.id) ? "Yes" : "No",
        }));

        const ws = XLSX.utils.json_to_sheet([
          { Module: "Employee", Function: employee.name, Role: employee.title, Assigned: employee.email },
          { Module: "Company", Function: company?.name || cid, Role: "", Assigned: "" },
          { Module: "Export Date", Function: new Date().toISOString(), Role: "", Assigned: "" },
          { Module: "", Function: "", Role: "", Assigned: "" },
          ...rows,
        ]);
        XLSX.utils.book_append_sheet(wb, ws, company?.name?.substring(0, 31) || cid);
      }

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename="${employee.name.replace(/\s+/g, '_')}_privileges.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to generate export" });
    }
  });

  // ============================================
  // PRIVILEGE REQUESTS
  // ============================================

  // Create Request
  app.post(api.requests.create.path, requireAuth as any, async (req, res) => {
    try {
      const input = createRequestSchema.parse(req.body);
      const request = await storage.createRequest(input);
      res.json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(403).json({ message: err.message });
      }
      console.error("Create request error:", err);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

  // List Requests
  app.get(api.requests.list.path, requireAuth as any, async (req, res) => {
    try {
      const { managerId, employeeId, status, targetCompanyIds } = req.query;
      const viewer = await resolveSessionViewer(req);
      const requests = await storage.getRequests({
        managerId: managerId as string | undefined,
        employeeId: employeeId as string | undefined,
        status: status as RequestStatus | undefined,
        targetCompanyIds: targetCompanyIds ? (targetCompanyIds as string).split(",") : undefined,
        managedModules: viewer?.managedModules ?? null,
      });
      res.json(requests);
    } catch (err) {
      console.error("Get requests error:", err);
      res.status(500).json({ message: "Failed to get requests" });
    }
  });

  // Update Request (Approve/Reject)
  app.patch("/api/requests/:requestId", requireAuth as any, async (req, res) => {
    try {
      const { requestId } = req.params;
      const adminId = getSessionActorId(req) || (req.query.adminId as string) || "";
      const input = updateRequestSchema.parse(req.body);

      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const request = await storage.updateRequestStatus(
        requestId,
        input.status,
        input.adminComments,
        adminId
      );
      res.json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        if (err.message.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        return res.status(403).json({ message: err.message });
      }
      console.error("Update request error:", err);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // IT fulfillment — register ServiceDesk ticket ID (admin)
  app.post("/api/requests/:requestId/fulfill-it", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      const { requestId } = req.params;
      const adminId = getSessionActorId(req);
      const { ticketId } = fulfillItTicketSchema.parse(req.body);
      const request = await storage.registerItTicket(requestId, ticketId, adminId);
      res.json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error) {
        return res.status(err.message.includes("not found") ? 404 : 400).json({ message: err.message });
      }
      res.status(500).json({ message: "Failed to register IT ticket" });
    }
  });

  // IT fulfillment — manually mark resolved (admin)
  app.post("/api/requests/:requestId/mark-resolved", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      const { requestId } = req.params;
      const adminId = getSessionActorId(req);
      const request = await storage.markRequestItResolved(requestId, adminId);
      res.json(request);
    } catch (err) {
      if (err instanceof Error) {
        return res.status(err.message.includes("not found") ? 404 : 400).json({ message: err.message });
      }
      res.status(500).json({ message: "Failed to mark request resolved" });
    }
  });

  // ============================================
  // EMPLOYEE TERMINATION
  // ============================================

  app.post("/api/employees/:employeeId/terminate", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const adminId = getSessionActorId(req) || (req.query.adminId as string);
      
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.terminateEmployee(employeeId, adminId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        return res.status(403).json({ message: err.message });
      }
      console.error("Terminate employee error:", err);
      res.status(500).json({ message: "Failed to terminate employee" });
    }
  });

  return httpServer;
}
