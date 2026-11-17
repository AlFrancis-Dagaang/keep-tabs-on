import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Lets tests import what the app imports with "@/". The DB tests make many round trips to remote Neon, so 5 s is too short.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { testTimeout: 30_000 },
});
