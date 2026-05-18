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
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error('main.tsx: Root element not found!');
}
