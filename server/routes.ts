import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { applyAssignmentsSchema, uploadCatalogSchema } from "@shared/schema";
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

  // Apply Assignments (direct add/remove)
  app.post(api.assignments.apply.path, async (req, res) => {
    try {
      const { actorId, companyId, targetEmployeeId, privilegeIds } = applyAssignmentsSchema.parse(req.body);
      
      // Verify actor is a manager with access to this company
      const managerCompanies = await storage.getManagerCompanies(actorId);
      if (!managerCompanies.includes(companyId)) {
        return res.status(403).json({ message: "Not authorized to manage privileges for this company" });
      }

      const assignment = await storage.applyAssignments(actorId, companyId, targetEmployeeId, privilegeIds);
      res.json(assignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Apply assignments error:", err);
      res.status(500).json({ message: "Failed to apply assignments" });
    }
  });

  // Upload Catalog
  app.post(api.catalog.upload.path, async (req, res) => {
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

  return httpServer;
}
