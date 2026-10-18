import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  functions: {
    api: {
      name: "Nimqulo API", source: "./backend/index.ts",
      env: {
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
        CLERK_ISSUER_URL: process.env.CLERK_ISSUER_URL!,
        APP_ORIGINS: process.env.APP_ORIGINS || "http://localhost:8081,http://localhost:8082,http://localhost:19006,triplyai://",
        ...(process.env.REALTIME_SERVICE_KEY ? { REALTIME_SERVICE_KEY: process.env.REALTIME_SERVICE_KEY } : {}),
        ...(process.env.REALTIME_URL ? { REALTIME_URL: process.env.REALTIME_URL } : {}),
        ...(process.env.OPERATOR_USER_IDS ? { OPERATOR_USER_IDS: process.env.OPERATOR_USER_IDS } : {}),
      },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
  },
  triggers: {
    "delivery-recovery": { type: "schedule", function: "api", cron: "*/15 * * * *", functionPath: "/internal/sweep" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
