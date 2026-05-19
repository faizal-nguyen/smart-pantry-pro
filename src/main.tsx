import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/material-you.css'

import { useAppStore } from './store/appStore';

if (typeof window !== 'undefined') {
  try {
    useAppStore.getState().setOnlineStatus(navigator.onLine);
    window.addEventListener('online', () => {
      useAppStore.getState().setOnlineStatus(true);
    });
    window.addEventListener('offline', () => {
      useAppStore.getState().setOnlineStatus(false);
    });
  } catch (error) {
    console.error('main.tsx: Error setting up PWA listeners:', error);
  }

  // Perf audit 2026-05-19 — auparavant l'enregistrement du SW se faisait
  // dans le hook usePWA(), donc seulement quand un composant qui l'utilise
  // se montait (PWAStatus, AppNavigation). On l'enregistre ici au bootstrap
  // pour que les assets soient déjà cachés au prochain reload froid.
  // L'enregistrement est idempotent côté navigateur, usePWA() peut continuer
  // d'écouter updatefound sans souci.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('main.tsx: SW registration failed:', error);
      });
    });
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error('main.tsx: Root element not found!');
}
