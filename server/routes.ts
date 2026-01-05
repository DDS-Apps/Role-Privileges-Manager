import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as XLSX from "xlsx";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get all data (Companies, Roles, Users)
  app.get(api.data.get.path, async (req, res) => {
    const data = await storage.getAllData();
    res.json(data);
  });

  // Create User
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Update User
  app.put(api.users.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser(id, input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(404).json({ message: "User not found" });
    }
  });

  // Delete User
  app.delete(api.users.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // Export to Excel
  app.get(api.export.download.path, async (req, res) => {
    try {
      const data = await storage.getAllData();
      
      // Flatten user data for export
      const exportRows = data.users.map(user => {
        const role = data.roles.find(r => r.id === user.roleId);
        const company = data.companies.find(c => c.id === user.companyId);
        
        return {
          ID: user.id,
          "First Name": user.firstName,
          "Last Name": user.lastName,
          Email: user.email,
          Role: role?.name || "Unknown",
          Company: company?.name || "Unknown",
          Status: user.isActive ? "Active" : "Inactive"
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="users_export.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);

    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to generate export" });
    }
  });

  return httpServer;
}
