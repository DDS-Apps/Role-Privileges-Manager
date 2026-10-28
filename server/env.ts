import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/** Repo root: dev (ESM/tsx) via server/; prod CJS bundle lives in dist/. */
const appRoot =
  typeof __dirname !== "undefined"
    ? path.resolve(__dirname, "..")
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Must run before other server modules read process.env (imports are hoisted in the bundle).
dotenv.config({ path: path.join(appRoot, ".env") });
