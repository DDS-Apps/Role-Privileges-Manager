import dotenv from "dotenv";
import path from "path";

// Must run before other server modules read process.env (imports are hoisted in the bundle).
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
