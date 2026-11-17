import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Lets tests import what the app imports with "@/".
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } } });
