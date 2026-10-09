/* eslint-disable react-refresh/only-export-components -- Isolated visual QA entrypoint, HMR disabled. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthSessionProvider } from '@/contexts/AuthSessionContext';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';
import { MaterialYouThemeProvider } from '@/contexts/MaterialYouThemeContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LayoutPerformanceProvider } from '@/components/performance/PerformanceMonitor';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import RecipeDetail from '@/pages/RecipeDetail';
import SmartShoppingList from '@/pages/SmartShoppingList';
import AddRecipeDialog from '@/components/recipes/AddRecipeDialog';
import Settings from '@/pages/Settings';
import Inventory from '@/pages/Inventory';
import KitchenDashboard from '@/pages/kitchen/KitchenDashboard';
import CookingSessionPage from '@/pages/kitchen/CookingSessionPage';
import Recipes from '@/pages/Recipes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { RECIPE, failures } from './supabase';
import '@/index.css';
import { useTheme } from '@/hooks/useTheme';

// This harness starts after onboarding and uses a dedicated local origin.
localStorage.setItem('skipOnboarding','1');

// A fixture must never contact external services, including nutrition providers.
const originalFetch = window.fetch.bind(window);
window.fetch = (input,options) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,location.origin);
  if (url.origin !== location.origin) return Promise.reject(new Error('Réseau externe désactivé dans le jeu de test.'));
  return originalFetch(input,options);
};
function ManualRecipe() {
  const [open,setOpen] = useState(true);
  return <><button onClick={() => setOpen(true)}>Nouvelle recette de test</button><AddRecipeDialog open={open} onOpenChange={setOpen}/></>;
}
function Fixture() {
  const route = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [failure,setFailure] = useState(false);
  return <>
    <div className="relative z-10 flex flex-wrap gap-3 bg-muted px-3 py-2 text-xs" aria-label="Contrôles du test local">
      <strong>Test local — données fictives</strong>
      <span>Écran : {route.pathname}</span>
      <Link to="/kitchen">Accueil</Link><Link to={`/kitchen/recipes/${RECIPE}`}>Fiche recette</Link><Link to="/shopping/list">Courses</Link><Link to="/settings">Paramètres</Link><Link to="/fixture/manual">Saisie</Link>
      <button onClick={toggleTheme}>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</button>
      <button onClick={() => { failures.nextCommand = true; setFailure(true); }}>{failure ? 'Prochain refus activé' : 'Simuler une coupure'}</button>
      <button onClick={() => { failures.nextReplyLost=true;setFailure(true); }}>Perdre la prochaine réponse après écriture</button>
    </div>
    <Routes><Route element={<AuthenticatedLayout/>}>
      <Route path="/kitchen" element={<KitchenDashboard/>}/><Route path="/kitchen/cooking/:sessionId" element={<CookingSessionPage/>}/><Route path="/kitchen/recipes" element={<Recipes/>}/>
      <Route path="/kitchen/recipes/:id" element={<RecipeDetail/>}/><Route path="/shopping/list" element={<SmartShoppingList/>}/>
      <Route path="/settings" element={<Settings/>}/><Route path="/fixture/manual" element={<ManualRecipe/>}/>
      <Route path="/pantry/inventory" element={<Inventory/>}/>
      <Route path="/pantry" element={<Navigate to="/pantry/inventory" replace/>}/>
      <Route path="/shopping" element={<Navigate to="/shopping/list" replace/>}/>
      <Route path="*" element={<RecipeDetail/>}/>
    </Route></Routes>
    <Toaster/><Sonner position="bottom-right" offset="calc(var(--content-bottom-pad, 0px) + 16px)"/>
  </>;
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ResponsiveProvider><AuthSessionProvider><LayoutPerformanceProvider><ThemeProvider><MaterialYouThemeProvider>
      <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') ?? '/kitchen']}><Fixture/></MemoryRouter>
    </MaterialYouThemeProvider></ThemeProvider></LayoutPerformanceProvider></AuthSessionProvider></ResponsiveProvider>
  </QueryClientProvider>,
);
