import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// MVP persistence is JSON via server/storage.ts (data.json, audit.json).
// Drizzle/Postgres is scaffolded for a future IStorage implementation — not used at runtime yet.

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Database functionality will be limited.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/db" });
export const db = drizzle(pool, { schema });
