/**
 * NavigationHub - Configuration Centralisée pour Navigation Famille
 * Implémente la structure hiérarchique du PRP-040.1 avec mode famille
 */

import React, { useMemo } from 'react';
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
  MessageCircle,
  Shield,
  Palette
} from 'lucide-react';
import { NavigationSection, FamilyNavigationConfig, FAMILY_NAVIGATION_SECTIONS } from '@/types/family-mode';

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
  
  // Mode famille
  minAge: number;
  requiresSupervision: boolean;
  availableInChildMode: boolean;
  
  // États
  isNew?: boolean;
  isDisabled?: boolean;
  badge?: string | number;
  
  // Gamification pour enfants
  gamification?: {
    points: number;
    level: number;
    achievements: string[];
    funName?: string; // Nom amusant pour les enfants
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
  
  // Mode famille
  minAge: number;
  requiresParentalApproval?: boolean;
  childFriendlyName?: string;
}

// Configuration des routes hiérarchiques selon PRP-040.1
export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    id: 'pantry',
    label: 'Inventaire',
    icon: Package,
    path: '/pantry',
    section: 'pantry',
    description: 'Gérer votre inventaire alimentaire',
    isMainSection: true,
    minAge: 3,
    requiresSupervision: false,
    availableInChildMode: true,
    gamification: {
      points: 150,
      level: 2,
      achievements: ['first_scan', 'week_tracker'],
      funName: 'Ma Réserve Magique'
    },
    subItems: [
      {
        id: 'pantry-overview',
        label: 'Vue d\'ensemble',
        path: '/pantry',
        icon: Home,
        description: 'Dashboard du garde-manger',
        minAge: 3,
        childFriendlyName: 'Ma cuisine'
      },
      {
        id: 'pantry-inventory',
        label: 'Inventaire',
        path: '/pantry/inventory',
        icon: Package,
        description: 'Inventaire complet des produits',
        minAge: 3,
        childFriendlyName: 'Mes produits'
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
    minAge: 3,
    requiresSupervision: true,
    availableInChildMode: true,
    gamification: {
      points: 320,
      level: 4,
      achievements: ['first_recipe', 'healthy_cook', 'family_chef'],
      funName: 'Atelier de Cuisine'
    },
    subItems: [
      {
        id: 'kitchen-overview',
        label: 'Dashboard cuisine',
        path: '/kitchen',
        icon: Home,
        description: 'Vue d\'ensemble de la cuisine',
        minAge: 3,
        childFriendlyName: 'Mes recettes'
      },
      {
        id: 'kitchen-recipes',
        label: 'Recettes',
        path: '/kitchen/recipes',
        icon: ChefHat,
        description: 'Catalogue de recettes',
        minAge: 3,
        childFriendlyName: 'Livre de recettes'
      },
      {
        id: 'kitchen-meal-planning',
        label: 'Planification',
        path: '/kitchen/meal-planning',
        icon: CalendarDays,
        description: 'Planification des repas',
        minAge: 7,
        isNew: true,
        childFriendlyName: 'Mon planning repas'
      },
      {
        id: 'kitchen-favorites',
        label: 'Favoris',
        path: '/kitchen/favorites',
        icon: Heart,
        description: 'Recettes favorites',
        minAge: 3,
        childFriendlyName: 'Mes recettes préférées'
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
    minAge: 7,
    requiresSupervision: true,
    availableInChildMode: true,
    gamification: {
      points: 180,
      level: 2,
      achievements: ['smart_shopper', 'budget_master'],
      funName: 'Mission Courses'
    },
    subItems: [
      {
        id: 'shopping-overview',
        label: 'Dashboard achats',
        path: '/shopping',
        icon: Home,
        description: 'Vue d\'ensemble des achats',
        minAge: 7,
        childFriendlyName: 'Mes courses'
      },
      {
        id: 'shopping-list',
        label: 'Liste de courses',
        path: '/shopping/list',
        icon: ShoppingCart,
        description: 'Liste de courses active',
        minAge: 7,
        childFriendlyName: 'Ma liste'
      }
    ]
  },
  {
    id: 'assistant',
    label: 'Assistant',
    icon: Bot,
    path: '/assistant',
    section: 'assistant',
    description: 'Assistant intelligent alimentaire',
    isMainSection: true,
    minAge: 7,
    requiresSupervision: true,
    availableInChildMode: false,
    gamification: {
      points: 250,
      level: 3,
      achievements: ['ai_helper', 'smart_questions'],
      funName: 'Mon Assistant Magique'
    },
    subItems: [
      {
        id: 'assistant-overview',
        label: 'Assistant principal',
        path: '/assistant',
        icon: Home,
        description: 'Interface principale de l\'assistant',
        minAge: 7,
        childFriendlyName: 'Mon assistant'
      },
      {
        id: 'assistant-chat',
        label: 'Chat IA',
        path: '/assistant/chat',
        icon: MessageCircle,
        description: 'Conversation avec l\'assistant',
        minAge: 10,
        requiresParentalApproval: true,
        childFriendlyName: 'Parler avec l\'assistant'
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
    minAge: 13,
    requiresSupervision: false,
    availableInChildMode: false,
    gamification: {
      points: 90,
      level: 1,
      achievements: ['data_explorer'],
      funName: 'Mes Statistiques'
    },
    subItems: [
      {
        id: 'insights-overview',
        label: 'Dashboard insights',
        path: '/insights',
        icon: Home,
        description: 'Vue d\'ensemble des analyses',
        minAge: 13,
        childFriendlyName: 'Mes analyses'
      },
      {
        id: 'insights-waste',
        label: 'Anti-gaspi',
        path: '/insights/waste',
        icon: Shield,
        description: 'Réduction du gaspillage',
        minAge: 10,
        childFriendlyName: 'Éviter le gaspillage'
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
    minAge: 18,
    requiresSupervision: false,
    availableInChildMode: false,
    subItems: [
      {
        id: 'settings-appearance',
        label: 'Apparence',
        path: '/settings/appearance',
        icon: Palette,
        description: 'Personnalisation de l\'interface',
        minAge: 13
      }
    ]
  }
];

/**
 * Hook pour obtenir la configuration de navigation adaptée au profil famille
 */
export const useNavigationConfig = (familyConfig?: FamilyNavigationConfig) => {
  return useMemo(() => {
    if (!familyConfig || !familyConfig.isFamilyModeActive) {
      return {
        mainNavigation: NAVIGATION_CONFIG,
        specialNavigation: SPECIAL_NAVIGATION_ITEMS,
        allNavigation: [...NAVIGATION_CONFIG, ...SPECIAL_NAVIGATION_ITEMS]
      };
    }

    const { currentProfile, adaptiveInterface } = familyConfig;
    const profileAge = currentProfile.age || 18;
    const isChildProfile = currentProfile.type === 'child';

    // Filtrer les éléments selon l'âge et les restrictions
    const filterNavigationItems = (items: NavigationItem[]) => {
      return items
        .filter(item => {
          // Vérifier l'âge minimum
          if (profileAge < item.minAge) return false;
          
          // Vérifier la disponibilité en mode enfant
          if (isChildProfile && !item.availableInChildMode) return false;
          
          // Vérifier les restrictions du profil
          if (!currentProfile.restrictions.allowedSections.includes(item.section)) return false;
          
          return true;
        })
        .map(item => ({
          ...item,
          // Adapter les libellés pour les enfants
          label: (isChildProfile && item.gamification?.funName) 
            ? item.gamification.funName 
            : item.label,
          subItems: item.subItems?.filter(subItem => {
            if (profileAge < subItem.minAge) return false;
            return true;
          }).map(subItem => ({
            ...subItem,
            label: (isChildProfile && subItem.childFriendlyName) 
              ? subItem.childFriendlyName 
              : subItem.label
          }))
        }));
    };

    const filteredMainNavigation = filterNavigationItems(NAVIGATION_CONFIG);
    const filteredSpecialNavigation = filterNavigationItems(SPECIAL_NAVIGATION_ITEMS);

    return {
      mainNavigation: filteredMainNavigation,
      specialNavigation: filteredSpecialNavigation,
      allNavigation: [...filteredMainNavigation, ...filteredSpecialNavigation],
      adaptiveInterface
    };
  }, [familyConfig]);
};

/**
 * Fonction utilitaire pour obtenir les redirections de compatibilité
 */
export const getLegacyRedirections = (): Record<string, string> => ({
  // PRP-222 PR1 : table réduite aux routes coeur V1. Tout pointeur vers une
  // route retirée a été retargeté sur le dashboard parent ou la liste canonique.
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

/**
 * Fonction pour déterminer l'icône selon le contexte famille
 */
export const getAdaptiveIcon = (
  baseIcon: React.ComponentType<{ className?: string }>,
  isChildMode: boolean,
  funVariant?: React.ComponentType<{ className?: string }>
): React.ComponentType<{ className?: string }> => {
  return (isChildMode && funVariant) ? funVariant : baseIcon;
};

