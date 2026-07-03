// Minimal shape of the global bridge Capacitor injects into the WebView
// when this site is loaded inside the native Android shell (mobile/).
// Not present in a normal browser, so every access must be optional-chained.
interface Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      Browser?: {
        open: (options: { url: string }) => Promise<void>;
      };
      App?: {
        addListener: (
          eventName: "appUrlOpen",
          callback: (event: { url: string }) => void
        ) => Promise<{ remove: () => void }>;
      };
      CapacitorCookies?: {
        setCookie: (options: {
          url: string;
          key: string;
          value: string;
          path?: string;
          expires?: string;
        }) => Promise<void>;
      };
    };
  };
}
