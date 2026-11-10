import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Vercel/CI have no .env.local; they pass DATABASE_OWNER_URL in the environment.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations run as the owner over the direct connection; the app never uses this URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_OWNER_URL! },
});
