import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eivsolutionair.workrecord",
  appName: "EIV Solution Air",
  webDir: "www",
  server: {
    url: "https://eiv-solution-air-service-work-recor.vercel.app",
    androidScheme: "https",
    cleartext: false,
    // Local page (mobile/www/error.html) shown when the remote URL fails to
    // load; it self-diagnoses and auto-retries instead of the cryptic
    // system "This page couldn't load" screen.
    errorPath: "error.html",
  },
};

export default config;
