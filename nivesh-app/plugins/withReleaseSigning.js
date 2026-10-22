// Signs the release build with your own upload keystore when these env vars are set (CI secrets):
//   NIVESH_KEYSTORE_PATH, NIVESH_KEYSTORE_PASSWORD, NIVESH_KEY_ALIAS, NIVESH_KEY_PASSWORD
// Without them the release build keeps Expo's default debug signing (fine for sideload testing, not for Play).
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!process.env.NIVESH_KEYSTORE_PATH) return cfg;
    let g = cfg.modResults.contents;
    if (g.includes("niveshRelease")) return cfg;
    g = g.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        niveshRelease {
            storeFile file(System.getenv("NIVESH_KEYSTORE_PATH"))
            storePassword System.getenv("NIVESH_KEYSTORE_PASSWORD")
            keyAlias System.getenv("NIVESH_KEY_ALIAS")
            keyPassword System.getenv("NIVESH_KEY_PASSWORD")
        }`,
    );
    // point only the release buildType at the new config
    g = g.replace(/(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/, "$1signingConfig signingConfigs.niveshRelease");
    cfg.modResults.contents = g;
    return cfg;
  });
};
