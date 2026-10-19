const fs = require("node:fs");
const path = require("node:path");
module.exports = ({ config }) => {
  const pilot = process.env.APP_VARIANT === "pilot";
  const googleFile = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(path.join(__dirname,"google-services.json")) ? "./google-services.json" : undefined);
  let googleWebClientId;
  if (googleFile) {
    const firebase = JSON.parse(fs.readFileSync(path.resolve(__dirname,googleFile),"utf8"));
    if (firebase.private_key || !firebase.project_info || !firebase.client?.some(client=>client.client_info?.android_client_info?.package_name===config.android.package)) throw Error("Use the Firebase Android google-services.json for com.jeeva.nimqulo, not a service-account key.");
    googleWebClientId=firebase.client.find(client=>client.client_info?.android_client_info?.package_name===config.android.package)?.oauth_client?.find(client=>client.client_type===3)?.client_id;
  }
  if (pilot) {
    const api = process.env.EXPO_PUBLIC_API_URL;
    if (!api?.startsWith("https://") || api.includes("br-calm-frost-a1ndi9sf")) throw Error("Pilot builds require the isolated pilot API URL.");
    if (!googleFile) throw Error("Configure Firebase Android credentials before building the pilot APK.");
    const firebase=JSON.parse(fs.readFileSync(path.resolve(__dirname,googleFile),"utf8"));
    if(!firebase.client.some(client=>client.client_info?.android_client_info?.package_name===config.android.package&&client.oauth_client?.some(value=>value.client_type===3)))throw Error("Enable Firebase Google sign-in and download the updated Android configuration.");
  }
  return { ...config, extra:{...config.extra,googleWebClientId}, platforms: ["android"], plugins: [...(config.plugins || []),
    ["expo-build-properties", { android: {
      buildArchs: process.env.RELEASE_TEST_EMULATOR === "1" ? ["x86_64"] : pilot ? ["armeabi-v7a", "arm64-v8a"] : ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"],
      enableMinifyInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
      useLegacyPackaging: true,
    } }],
    "./plugins/with-notification-delivery",
  ], android: { ...config.android, ...(googleFile?{googleServicesFile:googleFile}:{}) } };
};
