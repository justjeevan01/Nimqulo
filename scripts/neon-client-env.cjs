// Pass the JSON output of `neon functions get api -o json` on stdin.
// Only the public invocation URL is exposed to Expo; credentials stay unprefixed.
const fs = require("node:fs");
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const data = JSON.parse(input.replace(/^\uFEFF/, ""));
  const findUrl = value => {
    if (!value || typeof value !== "object") return undefined;
    if (typeof value.invocation_url === "string") return value.invocation_url;
    for (const child of Object.values(value)) { const result = findUrl(child); if (result) return result; }
  };
  const url = findUrl(data);
  if (!url || new URL(url).protocol !== "https:") throw new Error("No HTTPS invocation_url in Neon function output");
  const file = fs.existsSync(".env") ? ".env" : ".env.local";
  let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  content = content.replace(/^EXPO_PUBLIC_API_URL=.*\r?\n?/gm, "");
  fs.writeFileSync(file, content.trimEnd() + `\nEXPO_PUBLIC_API_URL=${url}\n`);
  console.log(`Wrote EXPO_PUBLIC_API_URL to ${file}; no backend credentials exposed`);
});
