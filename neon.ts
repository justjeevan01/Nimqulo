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
      },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
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
