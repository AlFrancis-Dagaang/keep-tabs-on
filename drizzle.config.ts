import { defineConfig } from "drizzle-kit";

process.loadEnvFile(".env.local");

// Migrations run as the owner over the direct connection; the app never uses this URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_OWNER_URL! },
});
