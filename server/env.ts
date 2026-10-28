import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));

// Must run before other server modules read process.env (imports are hoisted in the bundle).
dotenv.config({ path: path.resolve(serverDir, "..", ".env") });
