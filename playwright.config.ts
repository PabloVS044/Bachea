import { defineConfig } from "@playwright/test";

process.loadEnvFile(".env.local");

// Requiere Supabase local (npx supabase start). Las pruebas escriben datos en esa base.
export default defineConfig({
  testDir: "tests",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", screenshot: "only-on-failure" },
  webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true },
});
