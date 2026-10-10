import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lifeos.ai",
  appName: "LIFE OS AI",
  webDir: "dist",
  android: { allowMixedContent: false },
  plugins: {
    CapacitorHttp: { enabled: true },
    LocalNotifications: { smallIcon: "ic_stat_icon_config_sample", iconColor: "#5eead4" },
  },
};

export default config;
