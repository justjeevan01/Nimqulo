require("esbuild").buildSync({ entryPoints: ["backend/index.ts"], bundle: true, platform: "node", target: "node24", format: "esm", packages: "external", outfile: "dist/backend/index.mjs" });
console.log("Backend build passed (Node.js 24)");
