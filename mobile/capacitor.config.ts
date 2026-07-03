import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eivsolutionair.workrecord",
  appName: "EIV Solution Air",
  webDir: "www",
  server: {
    url: "https://eiv-solution-air-service-work-recor.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
