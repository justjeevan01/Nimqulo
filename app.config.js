const fs = require("node:fs");
const path = require("node:path");
module.exports = ({ config }) => {
  const pilot = process.env.APP_VARIANT === "pilot";
  const googleFile = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(path.join(__dirname,"google-services.json")) ? "./google-services.json" : undefined);
  if (googleFile) {
    const firebase = JSON.parse(fs.readFileSync(path.resolve(__dirname,googleFile),"utf8"));
    if (firebase.private_key || !firebase.project_info || !firebase.client?.some(client=>client.client_info?.android_client_info?.package_name===config.android.package)) throw Error("Use the Firebase Android google-services.json for com.jeeva.nimqulo, not a service-account key.");
  }
  if (pilot) {
    if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) throw Error("Pilot builds require a separate production Clerk instance.");
    const api = process.env.EXPO_PUBLIC_API_URL;
    if (!api?.startsWith("https://") || api.includes("br-calm-frost-a1ndi9sf")) throw Error("Pilot builds require the isolated pilot API URL.");
    if (!googleFile) throw Error("Configure Firebase Android credentials before building the pilot APK.");
  }
  return { ...config, android: { ...config.android, ...(googleFile?{googleServicesFile:googleFile}:{}) } };
};
