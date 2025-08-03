/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// PWA related types
interface Navigator {
  serviceWorker: ServiceWorkerContainer;
  share?: (data: ShareData) => Promise<void>;
}

interface Window {
  // PWA install prompt
  beforeinstallprompt?: Event;
  
  // iOS Safari PWA detection
  navigator: Navigator & {
    standalone?: boolean;
  };
}
