/**
 * 3D Pantry Visualization Types
 * Type definitions for the Animal Crossing-inspired pantry system
 * Based on PRP-026-Inventory-Visualization specification
 */

import * as THREE from 'three';

// Core Pantry Types
export interface InventoryItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  expiryDate?: Date;
  addedDate: Date;
  nutritionScore: number;
  freshness: number;
  rarity: ItemRarity;
  discoveredAt?: Date;
  imageUrl?: string;
  barcode?: string;
  position?: THREE.Vector3;
  storageRequirement: StorageType;
}

export type FoodCategory = 
  | 'vegetables' 
  | 'fruits' 
  | 'dairy' 
  | 'meat' 
  | 'fish' 
  | 'grains' 
  | 'spices' 
  | 'condiments' 
  | 'beverages' 
  | 'snacks' 
  | 'frozen' 
  | 'canned'
  | 'exotic'
  | 'herbs'
  | 'bakery';

export type ItemRarity = 
  | 'common'        // Basic ingredients (90%)
  | 'uncommon'      // Specialty items (7%)
  | 'rare'          // Premium ingredients (2.5%)
  | 'epic'          // Gourmet items (0.4%)
  | 'legendary';    // Ultra-rare items (0.1%)

export type StorageType = 
  | 'ambient'       // Room temperature
  | 'refrigerated'  // Fridge
  | 'frozen'        // Freezer
  | 'dry'           // Pantry shelf
  | 'cool_dark'     // Wine cellar style
  | 'hanging'       // Herbs/bananas
  | 'countertop';   // Fresh fruits

export type KitchenStyle = 
  | 'cozy_cottage'
  | 'modern_minimalist'
  | 'rustic_farmhouse'
  | 'industrial_loft'
  | 'scandinavian_clean'
  | 'mediterranean_warm'
  | 'asian_zen'
  | 'vintage_retro';

export type ColorScheme = 
  | 'warm_wood'
  | 'cool_marble'
  | 'vibrant_colors'
  | 'monochrome'
  | 'pastel_soft'
  | 'earth_tones'
  | 'ocean_breeze'
  | 'autumn_harvest';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 3D Environment Types
export interface PantryPreferences {
  kitchenStyle: KitchenStyle;
  colorScheme: ColorScheme;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  enableSeasonalThemes: boolean;
  enableAnimations: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  accessibilityMode: boolean;
}

export interface PantryLayout {
  id: string;
  name: string;
  dimensions: THREE.Vector3;
  storageZones: StorageZone[];
  lightingSetup: LightingConfig;
  decorativeElements: DecorativeElement[];
  interactionPoints: InteractionPoint[];
}

export interface StorageZone {
  id: string;
  type: StorageType;
  position: THREE.Vector3;
  size: THREE.Vector3;
  capacity: number;
  currentItems: string[]; // Item IDs
  accessible: boolean;
  visualStyle: StorageVisualStyle;
}

export interface StorageVisualStyle {
  materialType: 'wood' | 'metal' | 'glass' | 'plastic' | 'ceramic';
  color: string;
  texture?: string;
  transparency: number;
  shininess: number;
  emissive?: string;
}

export interface LightingConfig {
  ambientLight: {
    color: string;
    intensity: number;
  };
  directionalLight: {
    color: string;
    intensity: number;
    position: THREE.Vector3;
    shadows: boolean;
  };
  spotLights: Array<{
    color: string;
    intensity: number;
    position: THREE.Vector3;
    target: THREE.Vector3;
    angle: number;
    penumbra: number;
  }>;
  environmentMap?: string;
}

export interface DecorativeElement {
  id: string;
  type: 'plant' | 'artwork' | 'utensil' | 'container' | 'seasonal';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  modelPath: string;
  seasonal: boolean;
  interactable: boolean;
}

export interface InteractionPoint {
  id: string;
  position: THREE.Vector3;
  radius: number;
  action: InteractionAction;
  visualFeedback: FeedbackConfig;
  tooltip: string;
}

export type InteractionAction = 
  | 'add_item'
  | 'remove_item'
  | 'inspect_item'
  | 'organize_zone'
  | 'change_view'
  | 'access_recipes'
  | 'shopping_list';

export interface FeedbackConfig {
  hover: {
    glow: boolean;
    glowColor: string;
    pulse: boolean;
    lift: number; // units to lift on hover
  };
  click: {
    bounce: boolean;
    bounceScale: number;
    particles: boolean;
    particleColor: string;
    sound?: string;
  };
  haptic?: 'light' | 'medium' | 'heavy';
}

// 3D Asset Types
export interface InventoryVisualization {
  item: InventoryItem;
  model: THREE.Object3D;
  location: StorageLocation;
  interactions: ItemInteractionSet;
  animations: ItemAnimationSet;
  physicsBody?: any; // Cannon.js body if physics enabled
}

export interface StorageLocation {
  zone: StorageZone;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  space: THREE.Box3;
  optimal: boolean; // Whether this is the optimal location for the item
}

export interface ItemInteractionSet {
  onHover: (item: InventoryItem) => void;
  onClick: (item: InventoryItem) => void;
  onDoubleClick: (item: InventoryItem) => void;
  onDragStart: (item: InventoryItem) => void;
  onDragEnd: (item: InventoryItem, newPosition: THREE.Vector3) => void;
  onInspect: (item: InventoryItem) => void;
}

export interface ItemAnimationSet {
  idle: THREE.AnimationClip[];
  hover: THREE.AnimationClip[];
  select: THREE.AnimationClip[];
  move: THREE.AnimationClip[];
  expire: THREE.AnimationClip[]; // Animation when item is about to expire
}

export interface Interactive3DPantry {
  scene: THREE.Scene;
  objects: {
    structure: PantryStructure3D;
    inventory: InventoryVisualization[];
    interactive: THREE.Object3D[];
  };
  animations: AnimationSystem;
  interactions: InteractionManager;
  accessibility: AccessibilityFeatures;
}

export interface PantryStructure3D {
  walls: THREE.Object3D[];
  shelves: THREE.Object3D[];
  appliances: THREE.Object3D[];
  lighting: THREE.Light[];
  floor: THREE.Object3D;
  ceiling: THREE.Object3D;
  decorations: THREE.Object3D[];
}

export interface AnimationSystem {
  mixer: THREE.AnimationMixer;
  activeClips: Map<string, THREE.AnimationAction>;
  seasonalTransitions: SeasonalTransitionSet;
  itemAnimations: Map<string, ItemAnimationSet>;
  environmentAnimations: EnvironmentAnimationSet;
}

export interface SeasonalTransitionSet {
  spring: SeasonalTheme;
  summer: SeasonalTheme;
  autumn: SeasonalTheme;
  winter: SeasonalTheme;
}

export interface SeasonalTheme {
  lighting: LightingConfig;
  decorations: string[]; // Model paths for seasonal decorations
  ambientSounds: string[]; // Audio file paths
  particleEffects: ParticleEffectConfig[];
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    ambient: string;
  };
}

export interface ParticleEffectConfig {
  type: 'snow' | 'leaves' | 'petals' | 'dust' | 'sparkles' | 'steam';
  count: number;
  lifetime: number;
  size: number;
  velocity: THREE.Vector3;
  gravity: number;
  color: string;
  opacity: number;
  texture?: string;
}

export interface EnvironmentAnimationSet {
  lightCycle: THREE.AnimationClip; // Day/night lighting changes
  seasonalTransition: THREE.AnimationClip;
  ambientMovement: THREE.AnimationClip; // Subtle environmental movement
  decorativeAnimations: THREE.AnimationClip[];
}

export interface InteractionManager {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  selectedObject: THREE.Object3D | null;
  hoveredObject: THREE.Object3D | null;
  dragObject: THREE.Object3D | null;
  interactionHandlers: Map<string, InteractionHandler>;
  accessibilityMode: boolean;
}

export interface InteractionHandler {
  objectId: string;
  onEnter: (event: InteractionEvent) => void;
  onExit: (event: InteractionEvent) => void;
  onClick: (event: InteractionEvent) => void;
  onDoubleClick: (event: InteractionEvent) => void;
  onDragStart: (event: InteractionEvent) => void;
  onDrag: (event: InteractionEvent) => void;
  onDragEnd: (event: InteractionEvent) => void;
  onKeyPress?: (event: KeyboardEvent) => void;
}

export interface InteractionEvent {
  type: 'hover' | 'click' | 'drag' | 'keyboard';
  object: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  timestamp: number;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export interface AccessibilityFeatures {
  screenReader: {
    enabled: boolean;
    announcements: Map<string, string>;
  };
  keyboardNavigation: {
    enabled: boolean;
    focusIndicator: THREE.Object3D;
    focusableObjects: THREE.Object3D[];
    currentFocus: number;
  };
  colorBlind: {
    enabled: boolean;
    type: 'protanopia' | 'deuteranopia' | 'tritanopia';
    colorFilters: Map<string, string>;
  };
  reducedMotion: {
    enabled: boolean;
    disabledAnimations: string[];
  };
  highContrast: {
    enabled: boolean;
    colorOverrides: Map<string, string>;
  };
}

// Discovery and Collection Types
export interface DiscoveryContext {
  method: 'scan' | 'manual_add' | 'recipe_import' | 'shopping_return';
  location: 'store' | 'home' | 'restaurant' | 'market' | 'garden';
  timestamp: Date;
  season: Season;
  firstTime: boolean;
}

export interface DiscoveryEvent {
  type: 'new_discovery' | 'rediscovery' | 'evolution' | 'achievement';
  ingredient: IngredientPokedexEntry;
  animation: DiscoveryAnimation;
  achievements: Achievement[];
  rarityBonus: number;
  collectionProgress: CollectionProgress;
  socialSharing: SharableContent;
}

export interface IngredientPokedexEntry {
  id: string;
  name: string;
  localizedNames: Record<string, string>;
  category: FoodCategory;
  rarity: ItemRarity;
  habitat: string[];
  season: Season[];
  evolutionChain?: string[];
  abilities: string[];
  description: string;
  discoveryHints: string[];
  nutritionalStats: {
    vitamins: number;
    minerals: number;
    antioxidants: number;
    fiber: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    rarity_bonus?: number;
  };
  culinaryCompatibility: string[];
  specialEffects?: {
    discoveryBonus: number;
    prestigePoints: number;
    socialShareBonus: boolean;
  };
  modelPath: string;
  iconPath: string;
  discoveredCount?: number;
  firstDiscoveredAt?: Date;
  lastSeenAt?: Date;
}

export interface DiscoveryAnimation {
  sequence: AnimationPhase[];
  totalDuration: number;
  interruptible: boolean;
  soundEffects: string[];
  hapticFeedback: HapticPattern[];
}

export interface AnimationPhase {
  phase: string;
  duration: number;
  effects: string[];
}

export interface HapticPattern {
  type: 'impact' | 'notification' | 'selection';
  intensity: 'light' | 'medium' | 'heavy';
  duration: number;
  delay: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'discovery' | 'collection' | 'nutrition' | 'organization' | 'seasonal' | 'social';
  rarity: ItemRarity;
  requirements: AchievementRequirement[];
  reward: AchievementReward;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  icon: string;
}

export interface AchievementRequirement {
  type: 'discover_items' | 'complete_category' | 'reach_nutrition_goal' | 'seasonal_collection' | 'social_share';
  target: number;
  context?: Record<string, any>;
}

export interface AchievementReward {
  points: number;
  unlocks: string[]; // New features, themes, or decorations
  badges: string[];
  title?: string;
  specialEffect?: string;
}

export interface CollectionProgress {
  totalDiscovered: number;
  totalAvailable: number;
  completionPercentage: number;
  categoriesProgress: Record<FoodCategory, {
    discovered: number;
    total: number;
    percentage: number;
  }>;
  rarityProgress: Record<ItemRarity, {
    discovered: number;
    total: number;
    percentage: number;
  }>;
  recentDiscoveries: string[];
  nextTargets: DiscoveryTarget[];
}

export interface DiscoveryTarget {
  ingredientId: string;
  hints: string[];
  difficulty: number;
  estimatedLocation: string[];
  seasonalAvailability: Season[];
}

export interface SharableContent {
  type: 'discovery' | 'achievement' | 'collection_milestone' | 'pantry_showcase';
  title: string;
  description: string;
  imageUrl: string;
  hashtags: string[];
  platforms: ('twitter' | 'instagram' | 'facebook' | 'discord')[];
}

// Progress Ring Types
export interface NutritionProgress {
  vitamins: {
    current: number;
    goal: number;
    sources: string[];
  };
  variety: {
    current: number;
    goal: number;
    categories: FoodCategory[];
  };
  freshness: {
    current: number;
    goal: number;
    averageAge: number;
  };
  balance: {
    current: number;
    goal: number;
    distribution: Record<FoodCategory, number>;
  };
}

export interface ProgressRingConfig {
  id: string;
  label: string;
  value: number;
  goal: number;
  color: string;
  strokeWidth: number;
  radius: number;
  achievement: boolean;
  icon?: string;
  unit?: string;
}

// Performance and Optimization Types
export interface PerformanceConfig {
  targetFPS: number;
  maxPolygons: number;
  enableLOD: boolean; // Level of Detail
  enableInstancing: boolean;
  enableOcclusion: boolean;
  textureCompression: boolean;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  antialiasing: boolean;
  enablePhysics: boolean;
  maxParticles: number;
}

export interface RenderingMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  loadTime: number;
  interactionLatency: number;
}

// Event Types
export interface PantryEvent {
  type: PantryEventType;
  timestamp: Date;
  data: any;
  userId?: string;
  sessionId?: string;
}

export type PantryEventType = 
  | 'item_added'
  | 'item_removed'
  | 'item_moved'
  | 'item_expired'
  | 'item_discovered'
  | 'achievement_unlocked'
  | 'theme_changed'
  | 'season_changed'
  | 'pantry_reorganized'
  | 'goal_achieved'
  | 'social_shared'
  | 'performance_metric';