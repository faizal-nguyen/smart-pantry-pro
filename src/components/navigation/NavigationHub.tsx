/**
 * NavigationHub — config navigation centralisée.
 *
 * PRP-237 PR2 :
 *   - Drop des champs legacy PRP-040 (mode profil) des données. Les
 *     champs restent `optional?` sur l'interface parce que
 *     `NavigationPredictor` et `useCipherMealPlanning` les lisent
 *     encore avec des defaults — leur suppression complète est cadrée
 *     par PRP-234.
 *   - Place Assistant en position 1 : PRP-224/233 mergée (PR #4 sur
 *     main), donc la condition PRP-237 §9 est remplie.
 *   - Supprime `getAdaptiveIcon` qui ne servait qu'au mode profil.
 *
 * L'ordre du tableau fait foi (pas de champ `order` séparé).
 */

import { useMemo } from 'react';
import {
  Package,
  ChefHat,
  ShoppingCart,
  Bot,
  BarChart3,
  Settings,
  Home,
  CalendarDays,
  Heart,
  Shield,
  Palette
} from 'lucide-react';
import { NavigationSection } from '@/types/family-mode';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section: NavigationSection;
  description: string;

  // Hiérarchie
  subItems?: NavigationSubItem[];
  isMainSection: boolean;

  // États
  isNew?: boolean;
  isDisabled?: boolean;
  badge?: string | number;

  // PRP-234 legacy — kept optional for backward compat with
  // NavigationPredictor / useCipherMealPlanning. Will be removed when
  // those services are refactored.
  minAge?: number; // allow: legacy field, never populated by PR2+
  requiresSupervision?: boolean; // allow: legacy field, never populated by PR2+
  availableInChildMode?: boolean; // allow: legacy field, never populated by PR2+
  gamification?: { // allow: legacy field, never populated by PR2+
    points: number;
    level: number;
    achievements: string[];
  };
}

export interface NavigationSubItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  description: string;
  isNew?: boolean;
  badge?: string | number;

  // PRP-234 legacy — kept optional for backward compat.
  minAge?: number; // allow: legacy field, never populated by PR2+
  requiresParentalApproval?: boolean; // allow: legacy field
}

// PRP-237 PR2 — order is Assistant first (PRP-224/233 done, see §9),
// then Recettes → Inventaire → Courses → Anti-gaspi.
export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    id: 'assistant',
    label: 'Assistant',
    icon: Bot,
    path: '/assistant',
    section: 'assistant',
    description: 'Assistant intelligent alimentaire',
    isMainSection: true,
    subItems: [
      {
        id: 'assistant-overview',
        label: 'Assistant principal',
        path: '/assistant',
        icon: Home,
        description: 'Interface principale de l\'assistant'
      }
    ]
  },
  {
    id: 'kitchen',
    label: 'Recettes',
    icon: ChefHat,
    path: '/kitchen',
    section: 'kitchen',
    description: 'Recettes et planification des repas',
    isMainSection: true,
    subItems: [
      {
        id: 'kitchen-overview',
        label: 'Aujourd\'hui',
        path: '/kitchen',
        icon: Home,
        description: 'Aujourd\'hui en cuisine'
      },
      {
        id: 'kitchen-recipes',
        label: 'Recettes',
        path: '/kitchen/recipes',
        icon: ChefHat,
        description: 'Catalogue de recettes'
      },
      {
        // PRP-234 PR2 — Menus V1 a remplacé `CipherMealPlanningPage`
        // sur cette route. Label aligné sur la promesse produit.
        id: 'kitchen-meal-planning',
        label: 'Menus',
        path: '/kitchen/meal-planning',
        icon: CalendarDays,
        description: 'Menus de la semaine'
      },
      {
        // PRP-232 PR3 — URL favoris canonique (filter=favorites sur library).
        // Évite la chaîne de redirect `/kitchen/favorites → /kitchen/recipes`.
        id: 'kitchen-favorites',
        label: 'Favoris',
        path: '/kitchen/recipes?tab=library&filter=favorites',
        icon: Heart,
        description: 'Recettes favorites'
      }
    ]
  },
  {
    id: 'pantry',
    label: 'Inventaire',
    icon: Package,
    path: '/pantry',
    section: 'pantry',
    description: 'Gérer votre inventaire alimentaire',
    isMainSection: true,
    subItems: [
      {
        id: 'pantry-overview',
        label: 'Vue d\'ensemble',
        path: '/pantry',
        icon: Home,
        description: 'Dashboard du garde-manger'
      },
      {
        id: 'pantry-inventory',
        label: 'Inventaire',
        path: '/pantry/inventory',
        icon: Package,
        description: 'Inventaire complet des produits'
      }
    ]
  },
  {
    id: 'shopping',
    label: 'Courses',
    icon: ShoppingCart,
    path: '/shopping',
    section: 'shopping',
    description: 'Gestion des listes de courses',
    isMainSection: true,
    subItems: [
      {
        id: 'shopping-overview',
        label: 'Dashboard achats',
        path: '/shopping',
        icon: Home,
        description: 'Vue d\'ensemble des achats'
      },
      {
        id: 'shopping-list',
        label: 'Liste de courses',
        path: '/shopping/list',
        icon: ShoppingCart,
        description: 'Liste de courses active'
      }
    ]
  },
  {
    id: 'insights',
    label: 'Anti-gaspi',
    icon: BarChart3,
    path: '/insights',
    section: 'insights',
    description: 'Statistiques et analyses avancées',
    isMainSection: true,
    subItems: [
      {
        id: 'insights-overview',
        label: 'Dashboard insights',
        path: '/insights',
        icon: Home,
        description: 'Vue d\'ensemble des analyses'
      },
      {
        id: 'insights-waste',
        label: 'Anti-gaspi',
        path: '/insights/waste',
        icon: Shield,
        description: 'Réduction du gaspillage'
      }
    ]
  }
];

// Configuration des sections spéciales (non-principales)
export const SPECIAL_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'settings',
    label: 'Paramètres',
    icon: Settings,
    path: '/settings',
    section: 'settings',
    description: 'Configuration de l\'application',
    isMainSection: false,
    subItems: [
      {
        // PRP-235 PR1 — pointe directement vers la section deep-link
        // pour éviter la redirection inutile.
        id: 'settings-appearance',
        label: 'Apparence',
        path: '/settings?section=appearance',
        icon: Palette,
        description: 'Personnalisation de l\'interface'
      }
    ]
  }
];

/**
 * Hook de configuration navigation. Renvoie les listes telles quelles ;
 * le filtre par profil famille (PRP-040) a été retiré en PRP-230 et la
 * dette résiduelle (services intelligence) est cadrée par PRP-234.
 */
export const useNavigationConfig = () => {
  return useMemo(() => ({
    mainNavigation: NAVIGATION_CONFIG,
    specialNavigation: SPECIAL_NAVIGATION_ITEMS,
    allNavigation: [...NAVIGATION_CONFIG, ...SPECIAL_NAVIGATION_ITEMS]
  }), []);
};

/**
 * Table de redirections de compatibilité historique. Réduite aux routes
 * coeur V1 en PRP-222 PR1.
 */
export const getLegacyRedirections = (): Record<string, string> => ({
  '/inventory': '/pantry/inventory',
  '/recipes': '/kitchen/recipes',
  '/shopping': '/shopping',
  '/assistant': '/assistant',
  '/insights': '/insights',

  '/pantry-inventory': '/pantry/inventory',
  '/kitchen-recipes': '/kitchen/recipes',
  '/shopping-list': '/shopping/list',
  '/meal-planning': '/kitchen/meal-planning',
  '/ai-assistant': '/assistant/chat',
  '/assistant-chat': '/assistant/chat',

  '/recipe-catalog': '/kitchen/recipes',
  '/kitchen-favorites': '/kitchen/favorites',
  '/insights-waste': '/insights/waste',

  '/home': '/insights',
  '/dashboard': '/insights',
  '/main': '/insights'
});
