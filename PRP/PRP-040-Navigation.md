# 🚀 Smart Pantry Pro - Nouvelle Architecture de Navigation

## 1. Structure de Navigation Proposée

### Navigation Principale (Core Features)
```
📦 Garde-Manger (Pantry)
├── Vue d'ensemble (Dashboard)
├── Inventaire (Inventory)
├── Scanner intelligent (Smart Scanner)
└── Alertes péremption (Expiry Alerts)

🍳 Cuisine (Kitchen)
├── Recettes (Recipes)
├── Planification repas (Meal Planning)
├── Import social (Social Import)
└── Favoris (Favorites)

🛒 Achats (Shopping)
├── Liste intelligente (Smart List)
├── Mode magasin (Store Mode)
├── Historique (History)
└── Promotions (Deals)

🤖 Assistant IA (AI Assistant)
├── Chat culinaire (Culinary Chat)
├── Suggestions (Suggestions)
├── Nutrition (Nutrition)
└── Apprentissage (Learning)

📊 Tableau de bord (Dashboard)
├── Statistiques (Analytics)
├── Économies (Savings)
├── Gaspillage (Waste)
└── Objectifs (Goals)
```

### Navigation Contextuelle (Quick Actions)
```
⚡ Actions Rapides
├── + Ajouter produit
├── 📷 Scanner
├── 🔍 Recherche globale
└── 🎤 Commande vocale
```

## 2. Patterns de Navigation par Device

### Mobile (< 768px)
- **Bottom Navigation** : 4 items principaux + FAB central
- **Swipe gestures** : Navigation latérale entre sections
- **Pull-to-refresh** : Actualisation des données
- **Sheet modals** : Actions contextuelles

### Tablet (768px - 1024px)
- **Hybrid Navigation** : Sidebar rétractable + bottom bar
- **Split view** : Master-detail pattern
- **Gesture controls** : Pinch, swipe, long-press

### Desktop (> 1024px)
- **Sidebar persistante** : Navigation complète visible
- **Command palette** : Cmd+K pour navigation rapide
- **Breadcrumbs** : Navigation hiérarchique
- **Keyboard shortcuts** : Navigation clavier complète

## 3. Composants de Navigation à Implémenter

### A. AppNavigation (Composant Principal)
```tsx
interface AppNavigationProps {
  variant: 'mobile' | 'tablet' | 'desktop';
  user: User;
  notifications: number;
}
```

### B. NavigationHub (Centre de Navigation)
```tsx
const navigationItems = {
  primary: [
    {
      id: 'pantry',
      label: 'Garde-Manger',
      icon: Package,
      path: '/pantry',
      subItems: [
        { id: 'dashboard', label: 'Vue d\'ensemble', path: '/pantry/dashboard' },
        { id: 'inventory', label: 'Inventaire', path: '/pantry/inventory' },
        { id: 'scanner', label: 'Scanner', path: '/pantry/scanner' },
        { id: 'alerts', label: 'Alertes', path: '/pantry/alerts' }
      ]
    },
    // ... autres sections
  ],
  quickActions: [
    { id: 'add', icon: Plus, action: 'openAddModal' },
    { id: 'scan', icon: Camera, action: 'openScanner' },
    { id: 'search', icon: Search, action: 'openSearch' },
    { id: 'voice', icon: Mic, action: 'startVoiceCommand' }
  ]
};
```

## 4. Routes Restructurées

### Ancienne Structure
```
/inventory
/recipes
/shopping
/insights
/assistant
```

### Nouvelle Structure
```
/pantry
  /pantry/dashboard
  /pantry/inventory
  /pantry/scanner
  /pantry/alerts

/kitchen
  /kitchen/recipes
  /kitchen/meal-planning
  /kitchen/social-import
  /kitchen/favorites

/shopping
  /shopping/list
  /shopping/store-mode
  /shopping/history
  /shopping/deals

/assistant
  /assistant/chat
  /assistant/suggestions
  /assistant/nutrition
  /assistant/learning

/dashboard
  /dashboard/analytics
  /dashboard/savings
  /dashboard/waste
  /dashboard/goals

/settings
  /settings/profile
  /settings/preferences
  /settings/privacy
  /settings/subscription
```

## 5. Features Avancées

### Navigation Intelligente
- **Prédictive** : Anticipe la prochaine action basée sur l'historique
- **Contextuelle** : S'adapte selon l'heure (ex: recettes le soir)
- **Personnalisée** : Apprend des habitudes utilisateur

### Accessibility (A11y)
- **ARIA labels** complets
- **Navigation clavier** (Tab, Arrows, Escape)
- **Screen reader** optimisé
- **High contrast mode**

### Performance
- **Lazy loading** des routes
- **Prefetch** intelligent
- **Cache** de navigation
- **Optimistic UI** updates

## 6. Plan de Migration

### Phase 1 (Sprint 1 - 2 semaines)
1. Créer nouveau composant `AppNavigation`
2. Implémenter responsive design
3. Ajouter routing nested
4. Tests unitaires

### Phase 2 (Sprint 2 - 2 semaines)
1. Migration progressive des pages
2. Ajout animations/transitions
3. Command palette (Cmd+K)
4. Tests d'intégration

### Phase 3 (Sprint 3 - 1 semaine)
1. Features avancées (IA prédictive)
2. Analytics de navigation
3. A/B testing
4. Déploiement progressif

## 7. KPIs de Succès

### Métriques Quantitatives
- **Time to Task** : -30% temps pour actions principales
- **Click Depth** : Max 3 clics pour 90% des actions
- **Navigation Errors** : < 2% taux d'erreur
- **Load Time** : < 200ms transition entre pages

### Métriques Qualitatives
- **SUS Score** : > 80/100
- **NPS** : > 50
- **Task Success Rate** : > 95%
- **User Satisfaction** : > 4.5/5

## 8. Code Examples

### Mobile Bottom Navigation
```tsx
<MobileNav>
  <NavItem icon={Package} label="Garde-Manger" path="/pantry" />
  <NavItem icon={ChefHat} label="Cuisine" path="/kitchen" />
  <FAB icon={Plus} onClick={openQuickAdd} />
  <NavItem icon={ShoppingCart} label="Achats" path="/shopping" />
  <NavItem icon={Bot} label="Assistant" path="/assistant" />
</MobileNav>
```

### Desktop Sidebar
```tsx
<Sidebar collapsible="icon" className="border-r">
  <SidebarHeader>
    <SidebarTrigger />
    <SearchCommand />
  </SidebarHeader>
  
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Garde-Manger</SidebarGroupLabel>
      <SidebarMenu>
        {pantryItems.map(item => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild>
              <Link href={item.path}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  
  <SidebarFooter>
    <UserMenu />
  </SidebarFooter>
</Sidebar>
```

## 9. Recommandations Finales

### Do's ✅
- Navigation cohérente cross-platform
- Feedback visuel immédiat
- Breadcrumbs pour orientation
- Search global accessible
- Raccourcis clavier documentés

### Don'ts ❌
- Plus de 5 items dans nav principale
- Navigation cachée sans indicateurs
- Changements brusques de layout
- Popups intrusifs
- Navigation uniquement par icônes

## 10. Next Steps

1. **Validation** : User testing sur prototypes
2. **Priorisation** : RICE scoring des features
3. **Design System** : Tokens de navigation
4. **Documentation** : Guidelines pour devs
5. **Monitoring** : Setup analytics events

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, 
  ChefHat, 
  ShoppingCart, 
  Bot, 
  BarChart3,
  Plus,
  Search,
  Menu,
  X,
  Home,
  Camera,
  AlertCircle,
  Calendar,
  Heart,
  Clock,
  TrendingUp,
  Trash2,
  Target,
  Settings,
  User,
  LogOut,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  subItems?: SubNavItem[];
}

interface SubNavItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ElementType;
}

const navigationConfig: NavItem[] = [
  {
    id: 'pantry',
    label: 'Garde-Manger',
    icon: Package,
    path: '/pantry',
    subItems: [
      { id: 'overview', label: "Vue d'ensemble", path: '/pantry', icon: Home },
      { id: 'inventory', label: 'Inventaire', path: '/pantry/inventory', icon: Package },
      { id: 'scanner', label: 'Scanner', path: '/pantry/scanner', icon: Camera },
      { id: 'alerts', label: 'Alertes', path: '/pantry/alerts', icon: AlertCircle },
    ]
  },
  {
    id: 'kitchen',
    label: 'Cuisine',
    icon: ChefHat,
    path: '/kitchen',
    subItems: [
      { id: 'recipes', label: 'Recettes', path: '/kitchen/recipes', icon: ChefHat },
      { id: 'planning', label: 'Planification', path: '/kitchen/meal-planning', icon: Calendar },
      { id: 'favorites', label: 'Favoris', path: '/kitchen/favorites', icon: Heart },
      { id: 'history', label: 'Historique', path: '/kitchen/history', icon: Clock },
    ]
  },
  {
    id: 'shopping',
    label: 'Achats',
    icon: ShoppingCart,
    path: '/shopping',
    badge: 3,
    subItems: [
      { id: 'list', label: 'Liste de courses', path: '/shopping/list', icon: ShoppingCart },
      { id: 'store', label: 'Mode magasin', path: '/shopping/store-mode', icon: Package },
      { id: 'history', label: 'Historique', path: '/shopping/history', icon: Clock },
    ]
  },
  {
    id: 'assistant',
    label: 'Assistant',
    icon: Bot,
    path: '/assistant',
    subItems: [
      { id: 'chat', label: 'Chat IA', path: '/assistant/chat', icon: Bot },
      { id: 'suggestions', label: 'Suggestions', path: '/assistant/suggestions', icon: TrendingUp },
      { id: 'nutrition', label: 'Nutrition', path: '/assistant/nutrition', icon: Heart },
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: BarChart3,
    path: '/insights',
    subItems: [
      { id: 'analytics', label: 'Analyses', path: '/insights/analytics', icon: BarChart3 },
      { id: 'waste', label: 'Anti-gaspi', path: '/insights/waste', icon: Trash2 },
      { id: 'goals', label: 'Objectifs', path: '/insights/goals', icon: Target },
    ]
  }
];

export function AppNavigation({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getActiveSection = () => {
    return navigationConfig.find(item => 
      isActive(item.path)
    );
  };

  const activeSection = getActiveSection();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Smart Pantry Pro
              </h1>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setIsCommandOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Rechercher...</span>
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-2">
              {navigationConfig.map((item) => (
                <div key={item.id}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive(item.path) && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                  
                  {/* Sub-navigation */}
                  {isActive(item.path) && item.subItems && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Button
                          key={subItem.id}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-sm",
                            location.pathname === subItem.path && "bg-muted"
                          )}
                          onClick={() => navigate(subItem.path)}
                        >
                          {subItem.icon && <subItem.icon className="mr-2 h-3 w-3" />}
                          {subItem.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* User Menu */}
            <div className="border-t p-4">
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Mon Profil
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 z-40 w-full border-b bg-card/80 backdrop-blur">
          <div className="flex h-14 items-center px-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-2">
                  {navigationConfig.map((item) => (
                    <div key={item.id}>
                      <Button
                        variant={isActive(item.path) ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          navigate(item.path);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <h2 className="ml-4 text-lg font-semibold">
              {activeSection?.label || 'Smart Pantry'}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setIsCommandOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen",
        !isMobile && "ml-64",
        isMobile && "pt-14 pb-20"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/80 backdrop-blur">
          <div className="grid h-16 grid-cols-5">
            {navigationConfig.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                  isActive(item.path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* FAB for Quick Actions */}
      {isMobile && (
        <Button
          size="icon"
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate('/pantry/scanner')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Que cherchez-vous ?" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          
          <CommandGroup heading="Actions rapides">
            <CommandItem onSelect={() => {
              navigate('/pantry/scanner');
              setIsCommandOpen(false);
            }}>
              <Camera className="mr-2 h-4 w-4" />
              Scanner un produit
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate('/kitchen/recipes/new');
              setIsCommandOpen(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une recette
            </CommandItem>
            <CommandItem onSelect={() => {
              navigate('/shopping/list');
              setIsCommandOpen(false);
            }}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Voir la liste de courses
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            {navigationConfig.flatMap(section => 
              section.subItems?.map(item => (
                <CommandItem
                  key={item.path}
                  onSelect={() => {
                    navigate(item.path);
                    setIsCommandOpen(false);
                  }}
                >
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  <span>{section.label}</span>
                  <span className="mx-1 text-muted-foreground">›</span>
                  <span>{item.label}</span>
                </CommandItem>
              )) || []
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

🚀 Prochaines Étapes
1️⃣ Actions Immédiates (Aujourd'hui)

 Remplacer le Layout.tsx actuel par AppNavigation
 Créer les nouvelles routes dans App.tsx
 Migrer les pages existantes vers la nouvelle structure

2️⃣ Sprint 1 (Semaine prochaine)

 Implémenter les animations de transition
 Ajouter le système de breadcrumbs
 Créer les pages manquantes (meal-planning, store-mode, etc.)
 Tests utilisateurs sur mobile/desktop

3️⃣ Métriques à Tracker
typescript// Analytics Events
track('navigation_click', {
  from: currentPath,
  to: newPath,
  method: 'sidebar' | 'bottom_nav' | 'command_palette' | 'fab',
  device: 'mobile' | 'tablet' | 'desktop',
  time_to_action: timeInMs
});
💡 Recommandations Critiques
✅ Quick Wins

Renommer les routes en français ou anglais (cohérence)
Grouper les features par contexte d'usage
Ajouter un onboarding pour la nouvelle navigation
Command palette (Cmd+K) pour power users

⚠️ Points d'Attention

Migration progressive pour ne pas perdre les utilisateurs
A/B testing sur 10% des users d'abord
Documentation des nouveaux patterns
Formation de l'équipe support

📈 Impact Attendu

-40% de clics pour atteindre une action
+25% d'engagement sur features secondaires
+15% de rétention J7 grâce à la découvrabilité
NPS +20 points sur l'expérience navigation