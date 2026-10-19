const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Route Expo remote notifications through its existing NotificationForwarderActivity.
// FCM-rendered taps can lose their payload when Android recreates a surviving task.
module.exports = function withNotificationDelivery(config) {
  config = withAppBuildGradle(config, config => {
    // Expo declares Firebase as an implementation dependency, which is not exposed
    // on the app module's compile classpath. Match expo-notifications' version.
    const dependency = 'implementation("com.google.firebase:firebase-messaging:25.0.1")';
    if (!config.modResults.contents.includes(dependency)) {
      if (!/dependencies\s*\{/.test(config.modResults.contents)) throw Error("Android dependencies block not found");
      config.modResults.contents = config.modResults.contents.replace(/dependencies\s*\{/, match => `${match}\n    ${dependency}`);
    }
    return config;
  });
  config = withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const application = manifest.application[0];
    const service = `${config.android.package}.NimquloMessagingService`;
    const expoService = "expo.modules.notifications.service.ExpoFirebaseMessagingService";
    application.service = (application.service || []).filter(entry => ![service, expoService].includes(entry.$["android:name"]));
    application.service.push({ $: { "android:name": expoService, "tools:node": "remove" } }, {
      $: { "android:name": service, "android:exported": "false" },
      "intent-filter": [{ action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }] }],
    });
    return config;
  });
  return withDangerousMod(config, ["android", async config => {
    const pkg = config.android.package;
    const directory = path.join(config.modRequest.platformProjectRoot, "app/src/main/java", ...pkg.split("."));
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "NimquloMessagingService.kt"), `package ${pkg}

import android.content.Intent
import expo.modules.notifications.service.ExpoFirebaseMessagingService

class NimquloMessagingService : ExpoFirebaseMessagingService() {
  override fun handleIntent(intent: Intent?) {
    val extras = intent?.extras
    // Only Expo-service messages are normalized; retain the complete data payload.
    if (extras != null && (extras.containsKey("scopeKey") || extras.containsKey("experienceId"))) {
      val keys = extras.keySet().filter { it.startsWith("gcm.n.") || it.startsWith("gcm.notification.") }
      if (keys.isNotEmpty()) {
        val normalized = Intent(intent)
        keys.forEach { normalized.removeExtra(it) }
        super.handleIntent(normalized)
        return
      }
    }
    super.handleIntent(intent)
  }
}
`);
    return config;
  }]);
};
