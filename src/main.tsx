import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: Starting application...');

// Initialize PWA hooks
import { useAppStore } from './store/appStore';

console.log('main.tsx: Store imported');

// Set up global PWA listeners
if (typeof window !== 'undefined') {
  try {
    // Initialize connection status
    useAppStore.getState().setOnlineStatus(navigator.onLine);
    
    // Register PWA event listeners
    window.addEventListener('online', () => {
      useAppStore.getState().setOnlineStatus(true);
    });
    
    window.addEventListener('offline', () => {
      useAppStore.getState().setOnlineStatus(false);
    });
    
    console.log('main.tsx: PWA listeners registered');
  } catch (error) {
    console.error('main.tsx: Error setting up PWA listeners:', error);
  }
}

try {
  const rootElement = document.getElementById("root");
  console.log('main.tsx: Root element:', rootElement);
  
  if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log('main.tsx: App rendered');
  } else {
    console.error('main.tsx: Root element not found!');
  }
} catch (error) {
  console.error('main.tsx: Error rendering app:', error);
}
