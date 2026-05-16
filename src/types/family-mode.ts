/**
 * Types pour le Mode Famille - Smart Pantry Pro
 * Implémentation sécurisée et progressive pour toute la famille
 */

export interface FamilyProfile {
  id: string;
  name: string;
  type: 'parent' | 'child';
  age?: number; // Pour les enfants
  avatar?: string;
  preferences: FamilyPreferences;
  restrictions: SafetyRestrictions;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface FamilyPreferences {
  language: string;
  theme: 'auto' | 'light' | 'dark' | 'child-friendly';
  colorScheme: 'default' | 'high-contrast' | 'colorful';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  simplifiedUI: boolean;
  voiceEnabled: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
}

export interface SafetyRestrictions {
  // Navigation restrictions
  allowedSections: NavigationSection[];
  blockedFeatures: string[];
  
  // Content restrictions
  maxSpendingAlert?: number;
  allergenAlerts: string[];
  dietaryRestrictions: string[];
  
  // Time restrictions
  activeHours?: {
    start: string; // "08:00"
    end: string;   // "20:00"
  };
  
  // Supervision settings
  requireParentalApproval: boolean;
  logAllActivities: boolean;
  shareLocationInStore: boolean;
}

export interface ParentalControls {
  id: string;
  parentId: string;
  isEnabled: boolean;
  settings: {
    // Contrôles d'accès
    allowChildProfiles: boolean;
    maxChildProfiles: number;
    
    // Supervision
    realTimeMonitoring: boolean;
    activityReports: 'daily' | 'weekly' | 'monthly' | 'never';
    
    // Notifications parentales
    childActivityAlerts: boolean;
    purchaseNotifications: boolean;
    locationAlerts: boolean;
    
    // Restrictions globales
    emergencyContactsOnly: boolean;
    familyShoppingBudget?: number;
    approvalRequired: {
      purchases: boolean;
      recipeSharing: boolean;
      socialFeatures: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export type NavigationSection = 
  | 'pantry' 
  | 'kitchen' 
  | 'shopping' 
  | 'assistant' 
  | 'insights'
  | 'settings'
  | 'social'
  | 'games';

export interface AgeAdaptiveInterface {
  // Groupes d'âge avec interfaces différentes
  ageGroup: '3-6' | '7-12' | '13-17' | '18+';
  
  // Adaptations visuelles
  iconSize: 'small' | 'medium' | 'large' | 'extra-large';
  buttonSpacing: 'compact' | 'comfortable' | 'spacious';
  animationLevel: 'none' | 'subtle' | 'moderate' | 'playful';
  
  // Adaptations fonctionnelles
  simplifiedNavigation: boolean;
  gamificationLevel: 'none' | 'light' | 'moderate' | 'full';
  voiceGuidance: boolean;
  tutorialMode: boolean;
  
  // Contenu adapté
  vocabulary: 'simple' | 'standard' | 'advanced';
  explanationLevel: 'basic' | 'detailed' | 'expert';
  showNutritionalInfo: 'hidden' | 'simplified' | 'full';
}

export interface FamilyNavigationConfig {
  // Configuration de base
  currentProfile: FamilyProfile;
  availableProfiles: FamilyProfile[];
  parentalControls?: ParentalControls;
  
  // États de navigation
  isFamilyModeActive: boolean;
  isSupervisionMode: boolean;
  isEmergencyMode: boolean;
  
  // Interface adaptative
  adaptiveInterface: AgeAdaptiveInterface;
  
  // Sécurité et supervision
  securityLevel: 'minimal' | 'standard' | 'strict' | 'maximum';
  supervisionSettings: {
    showParentNotifications: boolean;
    logNavigationHistory: boolean;
    requireConfirmation: string[];
  };
}

export interface FamilyNavigationState {
  // État actuel
  config: FamilyNavigationConfig;
  
  // Historique et analytics
  navigationHistory: NavigationHistoryEntry[];
  activityLog: FamilyActivityLog[];
  
  // Modes spéciaux
  panicMode: boolean;
  supervisionMode: boolean;
  guestMode: boolean;
  
  // Performance et cache
  performanceMode: 'high' | 'balanced' | 'battery-saver';
  cacheEnabled: boolean;
}

export interface NavigationHistoryEntry {
  id: string;
  profileId: string;
  section: NavigationSection;
  path: string;
  timestamp: Date;
  duration: number; // en millisecondes
  actions: string[];
  parentApprovalRequired?: boolean;
  parentApprovalGranted?: boolean;
}

export interface FamilyActivityLog {
  id: string;
  profileId: string;
  type: 'navigation' | 'purchase' | 'recipe_view' | 'scanner_use' | 'voice_command';
  description: string;
  data?: any;
  timestamp: Date;
  severity: 'info' | 'warning' | 'alert';
  parentNotified?: boolean;
}

// Utilitaires de type
export type FamilyModeHook = {
  // État de la famille
  currentProfile: FamilyProfile | null;
  availableProfiles: FamilyProfile[];
  parentalControls: ParentalControls | null;
  
  // Actions
  switchProfile: (profileId: string) => Promise<void>;
  createChildProfile: (profile: Omit<FamilyProfile, 'id'>) => Promise<FamilyProfile>;
  updateParentalControls: (controls: Partial<ParentalControls>) => Promise<void>;
  
  // Vérifications
  canAccessSection: (section: NavigationSection) => boolean;
  requiresParentalApproval: (action: string) => boolean;
  getAdaptiveInterface: () => AgeAdaptiveInterface;
  
  // États
  isFamilyModeActive: boolean;
  isChildProfile: boolean;
  isSupervisionActive: boolean;
  
  // Chargement
  isLoading: boolean;
  error: string | null;
};

// Constantes pour les configurations par défaut
export const DEFAULT_AGE_GROUPS: Record<string, AgeAdaptiveInterface> = {
  '3-6': {
    ageGroup: '3-6',
    iconSize: 'extra-large',
    buttonSpacing: 'spacious',
    animationLevel: 'playful',
    simplifiedNavigation: true,
    gamificationLevel: 'full',
    voiceGuidance: true,
    tutorialMode: true,
    vocabulary: 'simple',
    explanationLevel: 'basic',
    showNutritionalInfo: 'hidden'
  },
  '7-12': {
    ageGroup: '7-12',
    iconSize: 'large',
    buttonSpacing: 'comfortable',
    animationLevel: 'moderate',
    simplifiedNavigation: true,
    gamificationLevel: 'moderate',
    voiceGuidance: true,
    tutorialMode: true,
    vocabulary: 'simple',
    explanationLevel: 'basic',
    showNutritionalInfo: 'simplified'
  },
  '13-17': {
    ageGroup: '13-17',
    iconSize: 'medium',
    buttonSpacing: 'comfortable',
    animationLevel: 'subtle',
    simplifiedNavigation: false,
    gamificationLevel: 'light',
    voiceGuidance: false,
    tutorialMode: false,
    vocabulary: 'standard',
    explanationLevel: 'detailed',
    showNutritionalInfo: 'full'
  },
  '18+': {
    ageGroup: '18+',
    iconSize: 'medium',
    buttonSpacing: 'compact',
    animationLevel: 'subtle',
    simplifiedNavigation: false,
    gamificationLevel: 'none',
    voiceGuidance: false,
    tutorialMode: false,
    vocabulary: 'advanced',
    explanationLevel: 'expert',
    showNutritionalInfo: 'full'
  }
};

export const FAMILY_NAVIGATION_SECTIONS: Record<NavigationSection, {
  label: string;
  icon: string;
  description: string;
  minAge: number;
  requiresSupervision: boolean;
  availableInChildMode: boolean;
}> = {
  pantry: {
    label: 'Garde-Manger',
    icon: 'Package',
    description: 'Gérer les produits du garde-manger',
    minAge: 3,
    requiresSupervision: false,
    availableInChildMode: true
  },
  kitchen: {
    label: 'Cuisine',
    icon: 'ChefHat',
    description: 'Recettes et planification des repas',
    minAge: 3,
    requiresSupervision: true,
    availableInChildMode: true
  },
  shopping: {
    label: 'Courses',
    icon: 'ShoppingCart',
    description: 'Liste de courses et achats',
    minAge: 7,
    requiresSupervision: true,
    availableInChildMode: true
  },
  assistant: {
    label: 'Assistant',
    icon: 'Bot',
    description: 'Assistant alimentaire',
    minAge: 7,
    requiresSupervision: true,
    availableInChildMode: false
  },
  insights: {
    label: 'Analyses',
    icon: 'BarChart3',
    description: 'Statistiques et analyses',
    minAge: 13,
    requiresSupervision: false,
    availableInChildMode: false
  },
  settings: {
    label: 'Paramètres',
    icon: 'Settings',
    description: 'Configuration de l\'application',
    minAge: 18,
    requiresSupervision: false,
    availableInChildMode: false
  },
  social: {
    label: 'Social',
    icon: 'Users',
    description: 'Partage et communauté',
    minAge: 13,
    requiresSupervision: true,
    availableInChildMode: false
  },
  games: {
    label: 'Jeux',
    icon: 'Gamepad2',
    description: 'Mini-jeux éducatifs',
    minAge: 3,
    requiresSupervision: false,
    availableInChildMode: true
  }
};