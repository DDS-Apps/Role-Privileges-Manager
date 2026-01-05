import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// For this MVP we are using JSON storage, but we keep this file 
// to satisfy the project structure and in case we switch to real DB later.
// We won't strictly use this connection for the JsonStorage.

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Database functionality will be limited.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/db" });
export const db = drizzle(pool, { schema });
