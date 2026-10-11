/* eslint-disable react-refresh/only-export-components -- Isolated visual QA entrypoint, HMR disabled. */
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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
import { RECIPE, CATALOG, WRAPPER, OWNER, data, failures, persistFixtureData } from './supabase';
import '@/index.css';
import { useTheme } from '@/hooks/useTheme';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { CulinaryDesignContext } from '@/contexts/CulinaryDesignContext';
import AssistantDashboard from '@/pages/assistant/AssistantDashboard';

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
  const queries=useQueryClient();
  const loadMemory=()=>{
    data.assistant_memory_items=[
      {id:'80000000-0000-4000-8000-000000000001',kind:'preference',content:'Je préfère les plats épicés.',status:'active',version:1,destination:'memory',payload:{type:'taste',subject:'spiciness',value:'spicy'},source:'user_explicit',sensitivity:'normal',approved_at:'2026-10-11T10:00:00Z'},
      {id:'80000000-0000-4000-8000-000000000002',kind:'constraint',content:'Je suis allergique aux cacahuètes.',status:'candidate',version:1,destination:'profile',payload:{type:'profile',field:'allergies',operation:'add',value:['cacahuètes'],subject:'allergies'},source:'user_explicit',sensitivity:'health_sensitive'},
      {id:'80000000-0000-4000-8000-000000000003',kind:'response_style',content:'Réponds avec des étapes courtes.',status:'candidate',version:0,destination:null,payload:null,source:'assistant_inferred',sensitivity:'normal'},
    ].map(row=>({...row,user_id:OWNER,created_at:'2026-10-11T10:00:00Z',updated_at:'2026-10-11T10:00:00Z',expires_at:null,evidence:{channel:'text'},policy_revision:4,profile_version:null}));
    persistFixtureData();location.reload();
  };
  const { theme, toggleTheme } = useTheme();
  const [failure,setFailure] = useState(false);
  const [evaluationOffline,setEvaluationOffline]=useState(false);
  const [design,setDesign]=useState<'personal'|'notebook'>('personal');
  const originalStock=useRef({ inventory:structuredClone(data.inventory),products:structuredClone(data.products) });
  const scenario=(mode:'normal'|'empty'|'hundred'|'urgent')=>{
    data.products=structuredClone(originalStock.current.products);data.inventory=structuredClone(originalStock.current.inventory);
    if (mode==='empty') data.inventory=[];
    if (mode==='urgent' && data.inventory[0]) data.inventory[0].expiry_date=new Date().toLocaleDateString('en-CA');
    if (mode==='hundred') {
      data.products=Array.from({ length:100 },(_,index)=>({ ...originalStock.current.products[0],id:crypto.randomUUID(),name:`Ingrédient fictif ${index+1} — intitulé long pour vérifier les retours à la ligne`,normalized_name:`fictif-${index+1}` }));
      data.inventory=data.products.map(product=>({ ...originalStock.current.inventory[0],id:crypto.randomUUID(),user_id:OWNER,product_id:product.id,quantity:2,unit:'kg' }));
    }
    persistFixtureData();dispatchAgentDbChanged(['inventory','products']);
  };
  return <CulinaryDesignContext.Provider value={design}>
    <details className="relative z-10 bg-muted px-3 py-2 text-xs" aria-label="Contrôles du test local"><summary className="flex min-h-11 cursor-pointer items-center">Test local — données fictives · contrôles</summary><div className="flex flex-wrap gap-3 py-2">
      <strong>Test local — données fictives</strong>
      <button onClick={loadMemory}>Charger les souvenirs fictifs</button>
      <button onClick={()=>{failures.memoryConflict=true;}}>Simuler un conflit mémoire</button>
      <button onClick={()=>{failures.memoryReplyLost=true;}}>Perdre la réponse mémoire</button>
      <button onClick={()=>{failures.memoryOffline=true;void queries.invalidateQueries({queryKey:['assistant-memories']});}}>Refuser la lecture mémoire</button>
      <span>Écran : {route.pathname}</span>
      <Link to="/kitchen">Accueil</Link><Link to={`/kitchen/recipes/${RECIPE}`}>Fiche recette</Link><Link to="/shopping/list">Courses</Link><Link to="/settings">Paramètres</Link><Link to="/fixture/manual">Saisie</Link>
      <Link to="/kitchen/recipes">Bibliothèque</Link><Link to={`/kitchen/recipes/${CATALOG}?source=recipes_catalog`}>Fiche catalogue</Link><Link to={`/kitchen/recipes/${WRAPPER}?source=user_recipes`}>Fiche personnelle</Link>
      <button onClick={toggleTheme}>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</button>
      <button aria-pressed={design==='personal'} onClick={()=>setDesign('personal')}>Cuisine personnelle</button><button aria-pressed={design==='notebook'} onClick={()=>setDesign('notebook')}>Carnet de cuisine</button>
      <button onClick={()=>scenario('normal')}>Stock de référence</button><button onClick={()=>scenario('empty')}>Stock vide</button><button onClick={()=>scenario('hundred')}>Cent ingrédients</button><button onClick={()=>scenario('urgent')}>Date proche</button>
      <button onClick={() => { failures.nextCommand = true; setFailure(true); }}>{failure ? 'Prochain refus activé' : 'Simuler une coupure'}</button>
      <button onClick={() => { failures.nextReplyLost=true;setFailure(true); }}>Perdre la prochaine réponse après écriture</button>
      <button onClick={()=>{ failures.evaluationOffline=!evaluationOffline;setEvaluationOffline(!evaluationOffline);if (!evaluationOffline) dispatchAgentDbChanged(['inventory']); }}>{evaluationOffline ? 'Rétablir la vérification' : 'Refuser la vérification'}</button>
    </div></details>
    <Routes><Route element={<AuthenticatedLayout/>}>
      <Route path="/kitchen" element={<KitchenDashboard/>}/><Route path="/kitchen/cooking/:sessionId" element={<CookingSessionPage/>}/><Route path="/kitchen/recipes" element={<Recipes/>}/>
      <Route path="/kitchen/recipes/:id" element={<RecipeDetail/>}/><Route path="/shopping/list" element={<SmartShoppingList/>}/>
      <Route path="/settings" element={<Settings/>}/><Route path="/fixture/manual" element={<ManualRecipe/>}/>
      <Route path="/assistant" element={<AssistantDashboard/>}/>
      <Route path="/pantry/inventory" element={<Inventory/>}/>
      <Route path="/pantry" element={<Navigate to="/pantry/inventory" replace/>}/>
      <Route path="/shopping" element={<Navigate to="/shopping/list" replace/>}/>
      <Route path="*" element={<RecipeDetail/>}/>
    </Route></Routes>
    <Toaster/><Sonner position="bottom-right" offset="calc(var(--content-bottom-pad, 0px) + 16px)"/>
  </CulinaryDesignContext.Provider>;
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ResponsiveProvider><AuthSessionProvider><LayoutPerformanceProvider><ThemeProvider><MaterialYouThemeProvider>
      <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') ?? '/kitchen']}><Fixture/></MemoryRouter>
    </MaterialYouThemeProvider></ThemeProvider></LayoutPerformanceProvider></AuthSessionProvider></ResponsiveProvider>
  </QueryClientProvider>,
);
