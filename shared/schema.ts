import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We are using JSON storage, but we define the schema for types and validation
// These "tables" won't actually be in Postgres for the JSON MVP, but useful for types.

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  privileges: text("privileges").array().notNull(), // e.g. ["read_users", "edit_users"]
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  roleId: integer("role_id").notNull(),
  companyId: integer("company_id").notNull(),
  isActive: boolean("is_active").default(true),
});

// Schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Extended types for frontend display
export type UserWithDetails = User & {
  roleName: string;
  companyName: string;
};

// Full Data Backup/Restore structure
export type AppData = {
  companies: Company[];
  roles: Role[];
  users: User[];
};
