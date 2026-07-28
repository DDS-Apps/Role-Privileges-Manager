import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { applyAssignmentsSchema, uploadCatalogSchema, createRequestSchema, updateRequestSchema, RequestStatus } from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";

// Extend session with auth data
declare module "express-session" {
  interface SessionData {
    contactId: string;
    employeeId: string;   // set when a line-manager employee logs in (not a contact)
    selectedCompanyId: string;
    isAdmin: boolean;
  }
}

// Demo password — same for all users (MVP)
const DEMO_PASSWORD = "password";

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.contactId && !req.session.employeeId)
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
  return req.session.contactId || req.session.employeeId || "";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============================================
  // AUTH
  // ============================================

  // POST /api/auth/login  { email, password }
  // Returns { contact, companies } — client picks company if multiple
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      if (password !== DEMO_PASSWORD) return res.status(401).json({ message: "Invalid credentials" });

      const data = await storage.getBootstrapData();

      // ── Try contact login first ────────────────────────────────────────────
      const contact = await storage.findContactByEmail(email);
      if (contact) {
        const companies = contact.companies.map(cc => ({
          companyId: cc.companyId,
          role: cc.role,
          name: data.companies.find(c => c.id === cc.companyId)?.name || cc.companyId,
        }));
        req.session.contactId = contact.id;
        req.session.isAdmin = contact.isAdmin;
        if (companies.length > 0) {
          req.session.selectedCompanyId = companies[0].companyId;
        }
        return res.json({
          id: contact.id,
          userId: contact.userId,
          name: contact.name,
          email: contact.email,
          isAdmin: contact.isAdmin,
          companies,
          selectedCompanyId: req.session.selectedCompanyId || null,
        });
      }

      // ── Try line-manager employee login ───────────────────────────────────
      const empLower = email.trim().toLowerCase();
      const employee = data.employees.find(
        e => e.isManager && e.email.toLowerCase() === empLower
      );
      if (!employee) return res.status(401).json({ message: "No account found for this email" });

      req.session.employeeId = employee.id;
      req.session.isAdmin = false;
      req.session.selectedCompanyId = employee.legalCompanyId;
      const empCompanyName = data.companies.find(c => c.id === employee.legalCompanyId)?.name || employee.legalCompanyId;

      return res.json({
        id: employee.id,
        userId: employee.id,
        name: employee.name,
        email: employee.email,
        isAdmin: false,
        isLineManager: true,
        companies: [{ companyId: employee.legalCompanyId, role: "Manager", name: empCompanyName }],
        selectedCompanyId: employee.legalCompanyId,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // POST /api/auth/select-company  { companyId }
  app.post("/api/auth/select-company", (req, res) => {
    if (!req.session.contactId && !req.session.employeeId) return res.status(401).json({ message: "Not authenticated" });
    const { companyId } = req.body as { companyId: string };
    if (!companyId) return res.status(400).json({ message: "companyId required" });
    req.session.selectedCompanyId = companyId;
    res.json({ ok: true, selectedCompanyId: companyId });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.contactId && !req.session.employeeId)
      return res.status(401).json({ message: "Not authenticated" });
    try {
      const data = await storage.getBootstrapData();

      // ── Employee (line manager) session ──────────────────────────────────
      if (req.session.employeeId) {
        const emp = data.employees.find(e => e.id === req.session.employeeId);
        if (!emp) return res.status(401).json({ message: "User not found" });
        const empCompanyName = data.companies.find(c => c.id === emp.legalCompanyId)?.name || emp.legalCompanyId;
        return res.json({
          id: emp.id,
          userId: emp.id,
          name: emp.name,
          email: emp.email,
          isAdmin: false,
          isLineManager: true,
          companies: [{ companyId: emp.legalCompanyId, role: "Manager", name: empCompanyName }],
          selectedCompanyId: req.session.selectedCompanyId || emp.legalCompanyId,
        });
      }

      // ── Contact session ───────────────────────────────────────────────────
      const contacts = await storage.getContacts();
      const c = contacts.find(x => x.id === req.session.contactId);
      if (!c) return res.status(401).json({ message: "User not found" });
      const companies = c.companies.map(cc => ({
        companyId: cc.companyId,
        role: cc.role,
        name: data.companies.find(co => co.id === cc.companyId)?.name || cc.companyId,
      }));
      return res.json({
        id: c.id,
        userId: c.userId,
        name: c.name,
        email: c.email,
        isAdmin: c.isAdmin,
        companies,
        selectedCompanyId: req.session.selectedCompanyId || null,
      });
    } catch {
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  // ── Contacts CRUD (admin only) ─────────────────────────────────────────────
  app.get("/api/contacts", requireAuth as any, requireAdmin as any, async (_req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      const contact = await storage.createContact(req.body);
      res.json(contact);
    } catch (err) {
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      res.json(contact);
    } catch (err: any) {
      res.status(err.message === "Contact not found" ? 404 : 500).json({ message: err.message });
    }
  });

  app.delete("/api/contacts/:id", requireAuth as any, requireAdmin as any, async (req, res) => {
    try {
      await storage.deleteContact(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.message === "Contact not found" ? 404 : 500).json({ message: err.message });
    }
  });

  // Bootstrap - get all data
  app.get(api.bootstrap.get.path, requireAuth as any, async (req, res) => {
    try {
      const data = await storage.getBootstrapData();
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
      const requests = await storage.getRequests({
        managerId: managerId as string | undefined,
        employeeId: employeeId as string | undefined,
        status: status as RequestStatus | undefined,
        targetCompanyIds: targetCompanyIds ? (targetCompanyIds as string).split(",") : undefined,
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
