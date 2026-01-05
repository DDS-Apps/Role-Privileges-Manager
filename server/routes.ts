import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { createDelegationSchema, createRequestSchema, approveRejectSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Bootstrap - get all data
  app.get(api.bootstrap.get.path, async (req, res) => {
    try {
      const data = await storage.getBootstrapData();
      res.json(data);
    } catch (err) {
      console.error("Bootstrap error:", err);
      res.status(500).json({ message: "Failed to load data" });
    }
  });

  // Create Delegation
  app.post(api.delegations.create.path, async (req, res) => {
    try {
      const schema = createDelegationSchema.extend({ actorId: z.string() });
      const { actorId, ...data } = schema.parse(req.body);
      
      // Verify actor is a manager with access to this company
      const managerCompanies = await storage.getManagerCompanies(actorId);
      if (!managerCompanies.includes(data.companyId)) {
        return res.status(403).json({ message: "Not authorized to delegate for this company" });
      }

      const delegation = await storage.createDelegation(actorId, data);
      res.status(201).json(delegation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Create delegation error:", err);
      res.status(500).json({ message: "Failed to create delegation" });
    }
  });

  // Revoke Delegation
  app.post(api.delegations.revoke.path, async (req, res) => {
    try {
      const id = req.params.id;
      const { actorId } = z.object({ actorId: z.string() }).parse(req.body);
      
      const delegation = await storage.revokeDelegation(id, actorId);
      res.json(delegation);
    } catch (err) {
      if (err instanceof Error && err.message === "Delegation not found") {
        return res.status(404).json({ message: "Delegation not found" });
      }
      console.error("Revoke delegation error:", err);
      res.status(500).json({ message: "Failed to revoke delegation" });
    }
  });

  // Create Request
  app.post(api.requests.create.path, async (req, res) => {
    try {
      const schema = createRequestSchema.extend({ actorId: z.string() });
      const { actorId, ...data } = schema.parse(req.body);
      
      const request = await storage.createRequest(actorId, data);
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Create request error:", err);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

  // List Requests
  app.get(api.requests.list.path, async (req, res) => {
    try {
      const { status, companyId } = req.query;
      const requests = await storage.getRequests(
        status as string | undefined,
        companyId as string | undefined
      );
      res.json(requests);
    } catch (err) {
      console.error("List requests error:", err);
      res.status(500).json({ message: "Failed to list requests" });
    }
  });

  // Approve Request
  app.post(api.requests.approve.path, async (req, res) => {
    try {
      const id = req.params.id;
      const { actorId, comment } = approveRejectSchema.extend({ actorId: z.string() }).parse(req.body);
      
      const request = await storage.approveRequest(id, actorId, comment);
      res.json(request);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Request not found") {
          return res.status(404).json({ message: "Request not found" });
        }
        if (err.message.includes("Not authorized")) {
          return res.status(403).json({ message: err.message });
        }
        if (err.message.includes("not in Submitted status")) {
          return res.status(409).json({ message: err.message });
        }
      }
      console.error("Approve request error:", err);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  // Reject Request
  app.post(api.requests.reject.path, async (req, res) => {
    try {
      const id = req.params.id;
      const { actorId, comment } = approveRejectSchema.extend({ actorId: z.string() }).parse(req.body);
      
      const request = await storage.rejectRequest(id, actorId, comment);
      res.json(request);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Request not found") {
          return res.status(404).json({ message: "Request not found" });
        }
        if (err.message.includes("Not authorized")) {
          return res.status(403).json({ message: err.message });
        }
        if (err.message.includes("not in Submitted status")) {
          return res.status(409).json({ message: err.message });
        }
      }
      console.error("Reject request error:", err);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Get Audit Log
  app.get(api.audit.list.path, async (req, res) => {
    try {
      const auditLog = await storage.getAuditLog();
      res.json(auditLog);
    } catch (err) {
      console.error("Get audit log error:", err);
      res.status(500).json({ message: "Failed to get audit log" });
    }
  });

  // Export Employee Privileges to Excel
  app.get(api.export.employee.path, async (req, res) => {
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

      const membership = data.employeeMembership.find(m => m.employeeId === employeeId);
      let companyIds = membership?.companyIds || [];

      if (scope === "company" && companyId) {
        companyIds = companyIds.filter(c => c === companyId);
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

  return httpServer;
}
