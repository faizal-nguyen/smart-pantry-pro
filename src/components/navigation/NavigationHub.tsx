/**
 * NavigationHub — config navigation centralisée.
 *
 * V11-06 E4b : le « mode famille » (profils, âge, supervision) est retiré ;
 * plus aucun champ de filtrage par profil.
 *
 * L'ordre du tableau fait foi (pas de champ `order` séparé).
 */

import { useMemo } from 'react';
import {
  Package,
  BookOpen,
  ShoppingCart,
  MessageCircle,
  BarChart3,
  Settings,
  Home,
  CalendarDays,
  Compass,
  Heart,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;

  // Hiérarchie
  subItems?: NavigationSubItem[];
  isMainSection: boolean;

  // États
  isNew?: boolean;
  isDisabled?: boolean;
  badge?: string | number;
}

export interface NavigationSubItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  description: string;
  isNew?: boolean;
  badge?: string | number;
}

// Kitchen OS: the same five destinations on desktop and mobile; Menus sit inside Recettes.
export const NAVIGATION_CONFIG: NavigationItem[] = [
  { id:'today',label:'Aujourd’hui',icon:Home,path:'/kitchen',description:'La prochaine action pour ton repas',isMainSection:true },
  { id:'kitchen',label:'Recettes',icon:BookOpen,path:'/kitchen/recipes',description:'Toutes tes recettes',isMainSection:true,subItems:[
    { id:'kitchen-discover',label:'Découvrir',path:'/kitchen/recipes?tab=discover',icon:Compass,description:'Inspirations et liens de créateurs' },
    { id:'kitchen-favorites',label:'Favoris',path:'/kitchen/recipes?tab=library&filter=favorites',icon:Heart,description:'Recettes favorites' },
    { id:'kitchen-meal-planning',label:'Menus',path:'/kitchen/meal-planning',icon:CalendarDays,description:'Menus de la semaine' },
  ] },
  { id:'pantry',label:'Mon stock',icon:Package,path:'/pantry/inventory',description:'Les ingrédients disponibles',isMainSection:true },
  { id:'shopping',label:'Courses',icon:ShoppingCart,path:'/shopping/list',description:'Acheter puis ranger',isMainSection:true },
  // Audit 2026-11-07 (UX P1 1): the assistant was only in the avatar menu.
  { id:'assistant',label:'Assistant',icon:MessageCircle,path:'/assistant',description:'Conversations avec l’assistant',isMainSection:true },
];
export const SPECIAL_NAVIGATION_ITEMS: NavigationItem[] = [
  { id:'insights',label:'Analyses',icon:BarChart3,path:'/insights',description:'Statistiques et anti-gaspillage',isMainSection:false },
  { id:'settings',label:'Profil et paramètres',icon:Settings,path:'/settings',description:'Tes préférences',isMainSection:false },
];

/** Hook de configuration navigation : renvoie les listes telles quelles. */
export const useNavigationConfig = () => {
  return useMemo(() => ({
    mainNavigation: NAVIGATION_CONFIG,
    specialNavigation: SPECIAL_NAVIGATION_ITEMS,
    allNavigation: [...NAVIGATION_CONFIG, ...SPECIAL_NAVIGATION_ITEMS]
  }), []);
};
