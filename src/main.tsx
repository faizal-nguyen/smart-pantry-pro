import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize PWA hooks
import { useAppStore } from './store/appStore';

// Set up global PWA listeners
if (typeof window !== 'undefined') {
  // Initialize connection status
  useAppStore.getState().setOnlineStatus(navigator.onLine);
  
  // Register PWA event listeners
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
