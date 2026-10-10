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
  MessageCircle,
  BarChart3,
  Settings,
  Home,
  CalendarDays,
  Heart,
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
  { id:'today',label:'Aujourd’hui',icon:Home,path:'/kitchen',section:'kitchen',description:'La prochaine action pour ton repas',isMainSection:true },
  { id:'pantry',label:'Stock',icon:Package,path:'/pantry/inventory',section:'pantry',description:'Les ingrédients disponibles',isMainSection:true },
  { id:'kitchen',label:'Cuisiner',icon:ChefHat,path:'/kitchen/recipes',section:'kitchen',description:'Toutes tes recettes',isMainSection:true,subItems:[
    { id:'kitchen-favorites',label:'Favoris',path:'/kitchen/recipes?tab=library&filter=favorites',icon:Heart,description:'Recettes favorites' },
    { id:'kitchen-meal-planning',label:'Menus',path:'/kitchen/meal-planning',icon:CalendarDays,description:'Menus de la semaine' },
  ] },
  { id:'shopping',label:'Courses',icon:ShoppingCart,path:'/shopping/list',section:'shopping',description:'Acheter puis ranger',isMainSection:true },
];
export const SPECIAL_NAVIGATION_ITEMS: NavigationItem[] = [
  { id:'assistant',label:'Assistant',icon:MessageCircle,path:'/assistant',section:'assistant',description:'Conversations avec l’assistant',isMainSection:false },
  { id:'insights',label:'Analyses',icon:BarChart3,path:'/insights',section:'insights',description:'Statistiques et anti-gaspillage',isMainSection:false },
  { id:'settings',label:'Profil et paramètres',icon:Settings,path:'/settings',section:'settings',description:'Tes préférences',isMainSection:false },
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
  '/shopping': '/shopping/list',
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

  '/home': '/kitchen',
  '/dashboard': '/kitchen',
  '/main': '/kitchen'
});
