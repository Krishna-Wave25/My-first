// Extends app.json. versionCode must increase for every Play upload; CI sets ANDROID_VERSION_CODE.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Number(process.env.ANDROID_VERSION_CODE || 1) },
  plugins: [...(config.plugins ?? []), "expo-iap", "./plugins/withReleaseSigning"],
});
