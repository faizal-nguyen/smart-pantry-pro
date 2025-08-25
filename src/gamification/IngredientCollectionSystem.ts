/**
 * Ingredient Collection System
 * Pokémon-style ingredient discovery and collection mechanics
 * Based on PRP-026-Inventory-Visualization specification
 */

import {
  InventoryItem,
  IngredientPokedexEntry,
  DiscoveryContext,
  DiscoveryEvent,
  DiscoveryAnimation,
  Achievement,
  CollectionProgress,
  SharableContent,
  ItemRarity,
  FoodCategory,
  Season,
  AnimationPhase,
  HapticPattern,
  AchievementRequirement,
  AchievementReward,
  DiscoveryTarget
} from '../visualization/types/PantryTypes';

export interface PersonalCollection {
  discovered: IngredientPokedexEntry[];
  total: number;
  categories: Record<FoodCategory, {
    discovered: number;
    total: number;
    percentage: number;
    recentDiscoveries: IngredientPokedexEntry[];
  }>;
  achievements: Achievement[];
  nextTargets: DiscoveryTarget[];
  stats: CollectionStats;
}

export interface CollectionStats {
  totalDiscoveries: number;
  uniqueIngredients: number;
  completionRate: number;
  rarityBreakdown: Record<ItemRarity, number>;
  discoveriesThisWeek: number;
  discoveriesThisMonth: number;
  longestStreak: number;
  currentStreak: number;
  favoriteCategory: FoodCategory;
  prestigePoints: number;
  level: number;
  experiencePoints: number;
  nextLevelProgress: number;
}

export interface DiscoveryAnimationConfig {
  ingredient: IngredientPokedexEntry;
  rarity: ItemRarity;
  context: DiscoveryContext;
  style: 'pokemon_capture' | 'ingredient_reveal' | 'evolution';
  enableSounds: boolean;
  enableHaptics: boolean;
}

export class IngredientCollectionSystem {
  private collectionDatabase: Map<string, IngredientPokedexEntry> = new Map();
  private userProgress: Map<string, PersonalCollection> = new Map();
  private achievementEngine: AchievementEngine;
  private raritySystem: RarityCalculator;
  private soundManager: SoundManager;
  private hapticManager: HapticManager;

  constructor() {
    this.achievementEngine = new AchievementEngine();
    this.raritySystem = new RarityCalculator();
    this.soundManager = new SoundManager();
    this.hapticManager = new HapticManager();
    this.initializeIngredientDatabase();
  }

  async initializeCollection(userId: string): Promise<PersonalCollection> {
    let userProgress = this.userProgress.get(userId);
    
    if (!userProgress) {
      userProgress = await this.createNewUserCollection(userId);
      this.userProgress.set(userId, userProgress);
    }

    return userProgress;
  }

  async discoverNewIngredient(
    userId: string,
    ingredientId: string,
    discoveryContext: DiscoveryContext
  ): Promise<DiscoveryEvent> {
    const ingredient = this.collectionDatabase.get(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient ${ingredientId} not found in database`);
    }

    const userCollection = await this.initializeCollection(userId);
    const isFirstDiscovery = !userCollection.discovered.some(item => item.id === ingredientId);

    if (isFirstDiscovery) {
      return await this.handleNewDiscovery(userId, ingredient, discoveryContext);
    } else {
      return await this.handleRediscovery(userId, ingredient, discoveryContext);
    }
  }

  private async handleNewDiscovery(
    userId: string,
    ingredient: IngredientPokedexEntry,
    context: DiscoveryContext
  ): Promise<DiscoveryEvent> {
    const userCollection = this.userProgress.get(userId)!;

    // Add to discovered ingredients
    ingredient.discoveredCount = (ingredient.discoveredCount || 0) + 1;
    ingredient.firstDiscoveredAt = new Date();
    ingredient.lastSeenAt = new Date();
    userCollection.discovered.push({ ...ingredient });

    // Create discovery animation
    const discoveryAnimation = await this.createDiscoveryAnimation({
      ingredient,
      rarity: ingredient.rarity,
      context,
      style: 'pokemon_capture',
      enableSounds: true,
      enableHaptics: true
    });

    // Check for new achievements
    const newAchievements = await this.checkForNewAchievements(userId, ingredient);

    // Update collection progress
    const updatedProgress = this.updateCollectionProgress(userId);

    // Calculate rarity bonus
    const rarityBonus = this.calculateRarityBonus(ingredient.rarity);

    // Update user stats
    this.updateUserStats(userId, ingredient, rarityBonus);

    // Generate social sharing content
    const socialContent = this.generateSharableDiscovery(ingredient, context);

    const discoveryEvent: DiscoveryEvent = {
      type: 'new_discovery',
      ingredient,
      animation: discoveryAnimation,
      achievements: newAchievements,
      rarityBonus,
      collectionProgress: updatedProgress,
      socialSharing: socialContent
    };

    // Trigger discovery celebration
    await this.triggerDiscoveryEffects(discoveryEvent);

    return discoveryEvent;
  }

  private async handleRediscovery(
    userId: string,
    ingredient: IngredientPokedexEntry,
    context: DiscoveryContext
  ): Promise<DiscoveryEvent> {
    const userCollection = this.userProgress.get(userId)!;
    
    // Update last seen
    const userIngredient = userCollection.discovered.find(item => item.id === ingredient.id);
    if (userIngredient) {
      userIngredient.lastSeenAt = new Date();
      userIngredient.discoveredCount = (userIngredient.discoveredCount || 0) + 1;
    }

    // Simple rediscovery animation
    const discoveryAnimation = await this.createDiscoveryAnimation({
      ingredient,
      rarity: ingredient.rarity,
      context,
      style: 'ingredient_reveal',
      enableSounds: false,
      enableHaptics: false
    });

    // Small experience bonus for rediscovery
    this.updateUserStats(userId, ingredient, 10);

    return {
      type: 'rediscovery',
      ingredient,
      animation: discoveryAnimation,
      achievements: [],
      rarityBonus: 10,
      collectionProgress: this.updateCollectionProgress(userId),
      socialSharing: this.generateSharableRediscovery(ingredient, context)
    };
  }

  private async createNewUserCollection(userId: string): Promise<PersonalCollection> {
    const totalIngredients = this.collectionDatabase.size;
    const categories = this.initializeCategoryProgress();
    
    const collection: PersonalCollection = {
      discovered: [],
      total: totalIngredients,
      categories,
      achievements: [],
      nextTargets: this.suggestInitialDiscoveryTargets(),
      stats: {
        totalDiscoveries: 0,
        uniqueIngredients: 0,
        completionRate: 0,
        rarityBreakdown: {
          common: 0,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        },
        discoveriesThisWeek: 0,
        discoveriesThisMonth: 0,
        longestStreak: 0,
        currentStreak: 0,
        favoriteCategory: 'vegetables',
        prestigePoints: 0,
        level: 1,
        experiencePoints: 0,
        nextLevelProgress: 0
      }
    };

    return collection;
  }

  private initializeCategoryProgress(): PersonalCollection['categories'] {
    const categories = {} as PersonalCollection['categories'];
    const allCategories: FoodCategory[] = [
      'vegetables', 'fruits', 'dairy', 'meat', 'fish', 'grains',
      'spices', 'condiments', 'beverages', 'snacks', 'frozen',
      'canned', 'exotic', 'herbs', 'bakery'
    ];

    allCategories.forEach(category => {
      const categoryTotal = Array.from(this.collectionDatabase.values())
        .filter(ingredient => ingredient.category === category).length;

      categories[category] = {
        discovered: 0,
        total: categoryTotal,
        percentage: 0,
        recentDiscoveries: []
      };
    });

    return categories;
  }

  private suggestInitialDiscoveryTargets(): DiscoveryTarget[] {
    const commonIngredients = Array.from(this.collectionDatabase.values())
      .filter(ingredient => ingredient.rarity === 'common')
      .slice(0, 5);

    return commonIngredients.map(ingredient => ({
      ingredientId: ingredient.id,
      hints: ingredient.discoveryHints,
      difficulty: 1,
      estimatedLocation: ingredient.habitat,
      seasonalAvailability: ingredient.season
    }));
  }

  private async createDiscoveryAnimation(config: DiscoveryAnimationConfig): Promise<DiscoveryAnimation> {
    const { ingredient, rarity, style, enableSounds, enableHaptics } = config;
    
    let animationSequence: AnimationPhase[] = [];

    if (style === 'pokemon_capture') {
      animationSequence = [
        {
          phase: 'encounter',
          duration: 2000,
          effects: [
            'camera_zoom_ingredient',
            'spotlight_dramatic',
            'mystery_sparkle_overlay',
            'discovery_music_start'
          ]
        },
        {
          phase: 'identification',
          duration: 3000,
          effects: [
            'ingredient_name_typewriter',
            'category_badge_slide_in',
            'rarity_stars_cascade',
            'description_fade_in'
          ]
        },
        {
          phase: 'stats_reveal',
          duration: 4000,
          effects: [
            'nutritional_bars_fill_animated',
            'compatibility_web_build',
            'abilities_popup_sequence',
            'habitat_info_scroll'
          ]
        },
        {
          phase: 'collection_update',
          duration: 2500,
          effects: [
            'pokedex_page_turn',
            'progress_bar_increment',
            'completion_percentage_update',
            'celebration_confetti'
          ]
        }
      ];

      // Special legendary sequence
      if (rarity === 'legendary') {
        animationSequence.unshift({
          phase: 'legendary_intro',
          duration: 4000,
          effects: [
            'screen_flash_gold',
            'legendary_music_crescendo',
            'ingredient_golden_aura_pulse',
            'camera_cinematic_circle',
            'legendary_text_overlay'
          ]
        });
      }
    } else if (style === 'ingredient_reveal') {
      animationSequence = [
        {
          phase: 'quick_reveal',
          duration: 1500,
          effects: [
            'ingredient_highlight',
            'name_popup',
            'rediscovery_badge'
          ]
        }
      ];
    }

    const totalDuration = animationSequence.reduce((sum, phase) => sum + phase.duration, 0);
    const soundEffects = enableSounds ? this.getDiscoverySoundEffects(rarity) : [];
    const hapticFeedback = enableHaptics ? this.getDiscoveryHapticPattern(rarity) : [];

    return {
      sequence: animationSequence,
      totalDuration,
      interruptible: false,
      soundEffects,
      hapticFeedback
    };
  }

  private getDiscoverySoundEffects(rarity: ItemRarity): string[] {
    const baseSounds = ['discovery_chime.mp3', 'success_notification.mp3'];
    
    switch (rarity) {
      case 'legendary':
        return ['legendary_fanfare.mp3', 'golden_sparkle.mp3', ...baseSounds];
      case 'epic':
        return ['epic_discovery.mp3', 'magical_chime.mp3', ...baseSounds];
      case 'rare':
        return ['rare_find.mp3', 'sparkle_cascade.mp3', ...baseSounds];
      case 'uncommon':
        return ['uncommon_discovery.mp3', ...baseSounds];
      default:
        return baseSounds;
    }
  }

  private getDiscoveryHapticPattern(rarity: ItemRarity): HapticPattern[] {
    const basePattern: HapticPattern = {
      type: 'notification',
      intensity: 'medium',
      duration: 300,
      delay: 0
    };

    switch (rarity) {
      case 'legendary':
        return [
          { type: 'impact', intensity: 'heavy', duration: 500, delay: 0 },
          { type: 'notification', intensity: 'heavy', duration: 300, delay: 200 },
          { type: 'selection', intensity: 'medium', duration: 200, delay: 600 }
        ];
      case 'epic':
        return [
          { type: 'impact', intensity: 'medium', duration: 400, delay: 0 },
          { type: 'notification', intensity: 'medium', duration: 250, delay: 150 }
        ];
      case 'rare':
        return [
          basePattern,
          { type: 'selection', intensity: 'light', duration: 150, delay: 200 }
        ];
      default:
        return [basePattern];
    }
  }

  private async checkForNewAchievements(userId: string, ingredient: IngredientPokedexEntry): Promise<Achievement[]> {
    const userCollection = this.userProgress.get(userId)!;
    const newAchievements: Achievement[] = [];

    // Check category completion
    const categoryProgress = userCollection.categories[ingredient.category];
    if (categoryProgress.discovered + 1 === categoryProgress.total) {
      newAchievements.push(this.createCategoryCompletionAchievement(ingredient.category));
    }

    // Check rarity milestones
    const rarityCount = userCollection.stats.rarityBreakdown[ingredient.rarity] + 1;
    if (this.isRarityMilestone(ingredient.rarity, rarityCount)) {
      newAchievements.push(this.createRarityMilestoneAchievement(ingredient.rarity, rarityCount));
    }

    // Check discovery streaks
    if (userCollection.stats.currentStreak + 1 > userCollection.stats.longestStreak) {
      if ((userCollection.stats.currentStreak + 1) % 7 === 0) { // Weekly streak milestone
        newAchievements.push(this.createStreakAchievement(userCollection.stats.currentStreak + 1));
      }
    }

    // Check seasonal discoveries
    const currentSeason = this.getCurrentSeason();
    if (ingredient.season.includes(currentSeason)) {
      const seasonalCount = userCollection.discovered.filter(item => 
        item.season.includes(currentSeason) && 
        item.firstDiscoveredAt && 
        this.isCurrentSeason(item.firstDiscoveredAt)
      ).length + 1;

      if (seasonalCount >= 10) {
        newAchievements.push(this.createSeasonalAchievement(currentSeason, seasonalCount));
      }
    }

    // Award achievements
    newAchievements.forEach(achievement => {
      achievement.unlockedAt = new Date();
      userCollection.achievements.push(achievement);
      userCollection.stats.prestigePoints += achievement.reward.points;
    });

    return newAchievements;
  }

  private createCategoryCompletionAchievement(category: FoodCategory): Achievement {
    return {
      id: `category_complete_${category}`,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Master`,
      description: `Discovered all ingredients in the ${category} category`,
      category: 'collection',
      rarity: 'epic',
      requirements: [
        {
          type: 'complete_category',
          target: 1,
          context: { category }
        }
      ],
      reward: {
        points: 500,
        unlocks: [`${category}_themed_decorations`],
        badges: [`${category}_master_badge`],
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Expert`
      },
      icon: `achievement_${category}_complete.png`
    };
  }

  private createRarityMilestoneAchievement(rarity: ItemRarity, count: number): Achievement {
    const rarityNames = {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary'
    };

    return {
      id: `rarity_milestone_${rarity}_${count}`,
      name: `${rarityNames[rarity]} Collector`,
      description: `Discovered ${count} ${rarity} ingredients`,
      category: 'collection',
      rarity: rarity === 'legendary' ? 'legendary' : 'rare',
      requirements: [
        {
          type: 'discover_items',
          target: count,
          context: { rarity }
        }
      ],
      reward: {
        points: count * (rarity === 'legendary' ? 100 : rarity === 'epic' ? 50 : 25),
        unlocks: [`${rarity}_ingredient_filter`],
        badges: [`${rarity}_collector_badge`],
      },
      icon: `achievement_${rarity}_collector.png`
    };
  }

  private createStreakAchievement(streakDays: number): Achievement {
    return {
      id: `discovery_streak_${streakDays}`,
      name: `${streakDays}-Day Explorer`,
      description: `Discovered ingredients for ${streakDays} consecutive days`,
      category: 'discovery',
      rarity: streakDays >= 30 ? 'legendary' : streakDays >= 14 ? 'epic' : 'rare',
      requirements: [
        {
          type: 'discover_items',
          target: streakDays,
          context: { consecutive: true }
        }
      ],
      reward: {
        points: streakDays * 10,
        unlocks: [`streak_${streakDays}_decoration`],
        badges: [`explorer_${streakDays}_badge`],
      },
      icon: `achievement_streak_${streakDays}.png`
    };
  }

  private createSeasonalAchievement(season: Season, count: number): Achievement {
    const seasonNames = {
      spring: 'Spring',
      summer: 'Summer',
      autumn: 'Autumn',
      winter: 'Winter'
    };

    return {
      id: `seasonal_${season}_${count}`,
      name: `${seasonNames[season]} Forager`,
      description: `Discovered ${count} seasonal ingredients during ${season}`,
      category: 'seasonal',
      rarity: 'uncommon',
      requirements: [
        {
          type: 'discover_items',
          target: count,
          context: { season }
        }
      ],
      reward: {
        points: count * 15,
        unlocks: [`${season}_theme_decorations`],
        badges: [`${season}_forager_badge`],
      },
      icon: `achievement_${season}_forager.png`
    };
  }

  private isRarityMilestone(rarity: ItemRarity, count: number): boolean {
    const milestones = {
      common: [10, 25, 50, 100],
      uncommon: [5, 15, 30],
      rare: [3, 10, 20],
      epic: [1, 5, 10],
      legendary: [1, 3, 5]
    };

    return milestones[rarity].includes(count);
  }

  private getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private isCurrentSeason(date: Date): boolean {
    const currentSeason = this.getCurrentSeason();
    const dateMonth = date.getMonth() + 1;
    
    switch (currentSeason) {
      case 'spring': return dateMonth >= 3 && dateMonth <= 5;
      case 'summer': return dateMonth >= 6 && dateMonth <= 8;
      case 'autumn': return dateMonth >= 9 && dateMonth <= 11;
      case 'winter': return dateMonth === 12 || dateMonth <= 2;
    }
  }

  private updateCollectionProgress(userId: string): CollectionProgress {
    const userCollection = this.userProgress.get(userId)!;
    const discovered = userCollection.discovered;
    const total = this.collectionDatabase.size;

    // Update category progress
    Object.keys(userCollection.categories).forEach(categoryKey => {
      const category = categoryKey as FoodCategory;
      const categoryDiscovered = discovered.filter(item => item.category === category);
      userCollection.categories[category].discovered = categoryDiscovered.length;
      userCollection.categories[category].percentage = 
        (categoryDiscovered.length / userCollection.categories[category].total) * 100;
      userCollection.categories[category].recentDiscoveries = 
        categoryDiscovered.slice(-3); // Last 3 discoveries
    });

    // Update rarity breakdown
    Object.keys(userCollection.stats.rarityBreakdown).forEach(rarityKey => {
      const rarity = rarityKey as ItemRarity;
      userCollection.stats.rarityBreakdown[rarity] = 
        discovered.filter(item => item.rarity === rarity).length;
    });

    // Update general stats
    userCollection.stats.uniqueIngredients = discovered.length;
    userCollection.stats.completionRate = (discovered.length / total) * 100;

    // Update favorite category
    let maxCategoryCount = 0;
    let favoriteCategory: FoodCategory = 'vegetables';
    Object.entries(userCollection.categories).forEach(([category, data]) => {
      if (data.discovered > maxCategoryCount) {
        maxCategoryCount = data.discovered;
        favoriteCategory = category as FoodCategory;
      }
    });
    userCollection.stats.favoriteCategory = favoriteCategory;

    return {
      totalDiscovered: discovered.length,
      totalAvailable: total,
      completionPercentage: userCollection.stats.completionRate,
      categoriesProgress: userCollection.categories,
      rarityProgress: userCollection.stats.rarityBreakdown as any,
      recentDiscoveries: discovered.slice(-5).map(item => item.id),
      nextTargets: this.suggestNextDiscoveries(userCollection)
    };
  }

  private suggestNextDiscoveries(userCollection: PersonalCollection): DiscoveryTarget[] {
    const discovered = userCollection.discovered.map(item => item.id);
    const undiscovered = Array.from(this.collectionDatabase.values())
      .filter(ingredient => !discovered.includes(ingredient.id));

    // Sort by rarity (common first) and seasonal availability
    const currentSeason = this.getCurrentSeason();
    const suggestions = undiscovered
      .filter(ingredient => ingredient.season.includes(currentSeason))
      .sort((a, b) => {
        const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      })
      .slice(0, 5);

    return suggestions.map(ingredient => ({
      ingredientId: ingredient.id,
      hints: ingredient.discoveryHints,
      difficulty: this.calculateDiscoveryDifficulty(ingredient),
      estimatedLocation: ingredient.habitat,
      seasonalAvailability: ingredient.season
    }));
  }

  private calculateDiscoveryDifficulty(ingredient: IngredientPokedexEntry): number {
    const rarityDifficulty = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5
    };

    return rarityDifficulty[ingredient.rarity];
  }

  private calculateRarityBonus(rarity: ItemRarity): number {
    const bonuses = {
      common: 10,
      uncommon: 25,
      rare: 50,
      epic: 100,
      legendary: 250
    };

    return bonuses[rarity];
  }

  private updateUserStats(userId: string, ingredient: IngredientPokedexEntry, bonus: number): void {
    const userCollection = this.userProgress.get(userId)!;
    const stats = userCollection.stats;

    // Update experience and level
    stats.experiencePoints += bonus;
    const newLevel = Math.floor(stats.experiencePoints / 1000) + 1;
    
    if (newLevel > stats.level) {
      stats.level = newLevel;
      // Level up achievement could be triggered here
    }
    
    stats.nextLevelProgress = (stats.experiencePoints % 1000) / 10;

    // Update discovery counts
    stats.totalDiscoveries++;
    stats.discoveriesThisWeek++; // This would need proper date tracking
    stats.discoveriesThisMonth++; // This would need proper date tracking

    // Update streak
    stats.currentStreak++; // Simplified - would need proper date checking
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  }

  private generateSharableDiscovery(ingredient: IngredientPokedexEntry, context: DiscoveryContext): SharableContent {
    const rarityEmojis = {
      common: '🥬',
      uncommon: '🌿',
      rare: '⭐',
      epic: '💎',
      legendary: '👑'
    };

    return {
      type: 'discovery',
      title: `Just discovered ${ingredient.name}!`,
      description: `${rarityEmojis[ingredient.rarity]} ${ingredient.rarity.toUpperCase()} ingredient discovered! ${ingredient.description}`,
      imageUrl: ingredient.iconPath,
      hashtags: ['#SmartPantry', '#IngredientHunter', `#${ingredient.category}`, `#${ingredient.rarity}Discovery`],
      platforms: ['twitter', 'instagram', 'facebook']
    };
  }

  private generateSharableRediscovery(ingredient: IngredientPokedexEntry, context: DiscoveryContext): SharableContent {
    return {
      type: 'discovery',
      title: `Found ${ingredient.name} again!`,
      description: `Adding more ${ingredient.name} to my collection. Always good to have backup!`,
      imageUrl: ingredient.iconPath,
      hashtags: ['#SmartPantry', '#PantryRestock'],
      platforms: ['twitter']
    };
  }

  private async triggerDiscoveryEffects(discoveryEvent: DiscoveryEvent): Promise<void> {
    // Play sounds
    if (discoveryEvent.animation.soundEffects.length > 0) {
      await this.soundManager.playSequence(discoveryEvent.animation.soundEffects);
    }

    // Trigger haptic feedback
    if (discoveryEvent.animation.hapticFeedback.length > 0) {
      await this.hapticManager.playSequence(discoveryEvent.animation.hapticFeedback);
    }

    // Log analytics event
    this.logDiscoveryEvent(discoveryEvent);
  }

  private logDiscoveryEvent(discoveryEvent: DiscoveryEvent): void {
    // Analytics implementation would go here
    console.log('Discovery Event:', {
      type: discoveryEvent.type,
      ingredient: discoveryEvent.ingredient.name,
      rarity: discoveryEvent.ingredient.rarity,
      achievements: discoveryEvent.achievements.length
    });
  }

  private initializeIngredientDatabase(): void {
    // Load the complete ingredient Pokédex
    const ingredientData = this.createIngredientPokedex();
    ingredientData.forEach(ingredient => {
      this.collectionDatabase.set(ingredient.id, ingredient);
    });
  }

  private createIngredientPokedex(): IngredientPokedexEntry[] {
    return [
      // Common Vegetables
      {
        id: 'tomato_001',
        name: 'Garden Tomato',
        localizedNames: {
          fr: 'Tomate',
          es: 'Tomate',
          de: 'Tomate'
        },
        category: 'vegetables',
        rarity: 'common',
        habitat: ['grocery_stores', 'markets', 'gardens'],
        season: ['summer', 'autumn'],
        evolutionChain: ['cherry_tomato', 'garden_tomato', 'heirloom_tomato'],
        abilities: ['vitamin_c_boost', 'umami_enhancement', 'color_vibrancy'],
        description: 'A versatile fruit often mistaken for a vegetable. Known for its bright red color and juicy interior.',
        discoveryHints: [
          'Found in the produce section',
          'Often paired with basil',
          'Key ingredient in Italian cuisine'
        ],
        nutritionalStats: {
          vitamins: 85,
          minerals: 60,
          antioxidants: 90,
          fiber: 70
        },
        culinaryCompatibility: ['basil', 'mozzarella', 'olive_oil', 'garlic'],
        modelPath: '/models/ingredients/tomato.glb',
        iconPath: '/icons/ingredients/tomato.png'
      },

      {
        id: 'carrot_002',
        name: 'Orange Carrot',
        localizedNames: {
          fr: 'Carotte',
          es: 'Zanahoria',
          de: 'Karotte'
        },
        category: 'vegetables',
        rarity: 'common',
        habitat: ['grocery_stores', 'markets', 'farms'],
        season: ['autumn', 'winter'],
        abilities: ['beta_carotene_rich', 'sweetness_enhancer', 'texture_provider'],
        description: 'A crunchy orange root vegetable packed with beta-carotene and natural sweetness.',
        discoveryHints: [
          'Found in the root vegetable section',
          'Great for both raw snacks and cooked dishes',
          'Essential for many stews and soups'
        ],
        nutritionalStats: {
          vitamins: 95,
          minerals: 70,
          antioxidants: 85,
          fiber: 80
        },
        culinaryCompatibility: ['onion', 'celery', 'parsley', 'ginger'],
        modelPath: '/models/ingredients/carrot.glb',
        iconPath: '/icons/ingredients/carrot.png'
      },

      // Uncommon Herbs
      {
        id: 'saffron_050',
        name: 'Premium Saffron',
        localizedNames: {
          fr: 'Safran',
          es: 'Azafrán',
          de: 'Safran'
        },
        category: 'spices',
        rarity: 'uncommon',
        habitat: ['specialty_stores', 'gourmet_markets'],
        season: ['autumn'],
        abilities: ['color_intensification', 'aroma_complexity', 'luxury_modifier'],
        description: 'The world\'s most expensive spice by weight, derived from crocus flowers.',
        discoveryHints: [
          'Found in specialty spice sections',
          'Extremely expensive per gram',
          'Essential for paella and risotto'
        ],
        nutritionalStats: {
          vitamins: 60,
          minerals: 80,
          antioxidants: 95,
          fiber: 30
        },
        culinaryCompatibility: ['rice', 'seafood', 'cream', 'white_wine'],
        specialEffects: {
          discoveryBonus: 100,
          prestigePoints: 50,
          socialShareBonus: true
        },
        modelPath: '/models/ingredients/saffron.glb',
        iconPath: '/icons/ingredients/saffron.png'
      },

      // Rare Items
      {
        id: 'wagyu_200',
        name: 'A5 Wagyu Beef',
        localizedNames: {
          fr: 'Bœuf Wagyu A5',
          es: 'Carne Wagyu A5',
          de: 'Wagyu A5 Rindfleisch'
        },
        category: 'meat',
        rarity: 'rare',
        habitat: ['premium_butchers', 'luxury_restaurants'],
        season: ['spring', 'summer', 'autumn', 'winter'],
        abilities: ['marbling_perfection', 'melt_in_mouth', 'umami_explosion'],
        description: 'The pinnacle of beef quality, featuring incredible marbling and tenderness.',
        discoveryHints: [
          'Only available at premium butchers',
          'Extremely expensive luxury ingredient',
          'Requires minimal cooking to preserve quality'
        ],
        nutritionalStats: {
          vitamins: 70,
          minerals: 85,
          antioxidants: 60,
          fiber: 0,
          protein: 98,
          fat: 95
        },
        culinaryCompatibility: ['sea_salt', 'wasabi', 'minimal_seasoning'],
        specialEffects: {
          discoveryBonus: 300,
          prestigePoints: 150,
          socialShareBonus: true
        },
        modelPath: '/models/ingredients/wagyu.glb',
        iconPath: '/icons/ingredients/wagyu.png'
      },

      // Epic Items
      {
        id: 'white_truffle_500',
        name: 'Alba White Truffle',
        localizedNames: {
          fr: 'Truffe Blanche d\'Alba',
          es: 'Trufa Blanca de Alba',
          de: 'Alba Weiße Trüffel'
        },
        category: 'exotic',
        rarity: 'epic',
        habitat: ['truffle_dealers', 'michelin_restaurants'],
        season: ['autumn'],
        abilities: ['aroma_transcendence', 'flavor_multiplication', 'culinary_prestige'],
        description: 'The "white diamond" of the culinary world, found only in specific regions of Italy.',
        discoveryHints: [
          'Extremely rare and seasonal',
          'Found only through specialized dealers',
          'Price varies wildly based on harvest quality'
        ],
        nutritionalStats: {
          vitamins: 88,
          minerals: 92,
          antioxidants: 95,
          fiber: 85,
          rarity_bonus: 200
        },
        culinaryCompatibility: ['pasta', 'risotto', 'eggs', 'aged_cheese'],
        specialEffects: {
          discoveryBonus: 750,
          prestigePoints: 400,
          socialShareBonus: true
        },
        modelPath: '/models/ingredients/white_truffle.glb',
        iconPath: '/icons/ingredients/white_truffle.png'
      },

      // Legendary Items
      {
        id: 'yubari_melon_999',
        name: 'Yubari King Melon',
        localizedNames: {
          fr: 'Melon Yubari King',
          es: 'Melón Rey Yubari',
          de: 'Yubari König Melone'
        },
        category: 'fruits',
        rarity: 'legendary',
        habitat: ['luxury_fruit_dealers', 'premium_auctions'],
        season: ['summer'],
        abilities: ['sweetness_perfection', 'texture_sublime', 'legendary_status'],
        description: 'The most expensive melon in the world, grown exclusively in Yubari, Japan. Each melon is a work of art.',
        discoveryHints: [
          'Only available through luxury fruit dealers',
          'Can cost thousands of dollars per melon',
          'Perfect spherical shape with ideal sweetness'
        ],
        nutritionalStats: {
          vitamins: 95,
          minerals: 88,
          antioxidants: 92,
          fiber: 75,
          rarity_bonus: 500
        },
        culinaryCompatibility: ['vanilla_ice_cream', 'champagne', 'prosciutto'],
        specialEffects: {
          discoveryBonus: 2000,
          prestigePoints: 1000,
          socialShareBonus: true
        },
        modelPath: '/models/ingredients/yubari_melon.glb',
        iconPath: '/icons/ingredients/yubari_melon.png'
      },

      // More common items to fill out the database
      {
        id: 'onion_003',
        name: 'Yellow Onion',
        localizedNames: { fr: 'Oignon Jaune', es: 'Cebolla Amarilla', de: 'Gelbe Zwiebel' },
        category: 'vegetables',
        rarity: 'common',
        habitat: ['grocery_stores', 'markets'],
        season: ['spring', 'summer', 'autumn', 'winter'],
        abilities: ['flavor_foundation', 'tear_inducer', 'versatility_supreme'],
        description: 'The foundation of countless recipes, providing depth and sweetness when cooked.',
        discoveryHints: ['Essential cooking ingredient', 'Found in every kitchen', 'Makes you cry when cutting'],
        nutritionalStats: { vitamins: 60, minerals: 70, antioxidants: 75, fiber: 65 },
        culinaryCompatibility: ['garlic', 'celery', 'carrots', 'herbs'],
        modelPath: '/models/ingredients/onion.glb',
        iconPath: '/icons/ingredients/onion.png'
      },

      {
        id: 'garlic_004',
        name: 'Fresh Garlic',
        localizedNames: { fr: 'Ail Frais', es: 'Ajo Fresco', de: 'Frischer Knoblauch' },
        category: 'vegetables',
        rarity: 'common',
        habitat: ['grocery_stores', 'markets', 'gardens'],
        season: ['summer', 'autumn'],
        abilities: ['aroma_intensifier', 'health_booster', 'vampire_repellent'],
        description: 'A pungent bulb that adds incredible flavor and has numerous health benefits.',
        discoveryHints: ['Strong distinctive smell', 'Essential in Mediterranean cuisine', 'Grown in bulbs'],
        nutritionalStats: { vitamins: 80, minerals: 85, antioxidants: 90, fiber: 55 },
        culinaryCompatibility: ['onion', 'herbs', 'olive_oil', 'tomatoes'],
        modelPath: '/models/ingredients/garlic.glb',
        iconPath: '/icons/ingredients/garlic.png'
      },

      // Add more ingredients across all categories and rarities
      // ... (This would continue with hundreds of ingredients)
    ];
  }

  // Public API methods
  public async getUserCollection(userId: string): Promise<PersonalCollection> {
    return await this.initializeCollection(userId);
  }

  public async getIngredientDetails(ingredientId: string): Promise<IngredientPokedexEntry | null> {
    return this.collectionDatabase.get(ingredientId) || null;
  }

  public async searchIngredients(query: string, filters?: {
    category?: FoodCategory;
    rarity?: ItemRarity;
    season?: Season;
  }): Promise<IngredientPokedexEntry[]> {
    const results = Array.from(this.collectionDatabase.values()).filter(ingredient => {
      const matchesQuery = ingredient.name.toLowerCase().includes(query.toLowerCase()) ||
                          ingredient.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !filters?.category || ingredient.category === filters.category;
      const matchesRarity = !filters?.rarity || ingredient.rarity === filters.rarity;
      const matchesSeason = !filters?.season || ingredient.season.includes(filters.season);

      return matchesQuery && matchesCategory && matchesRarity && matchesSeason;
    });

    return results.slice(0, 20); // Limit results
  }

  public getCollectionStats(): {
    totalIngredients: number;
    categoryCounts: Record<FoodCategory, number>;
    rarityCounts: Record<ItemRarity, number>;
  } {
    const ingredients = Array.from(this.collectionDatabase.values());
    
    const categoryCounts = {} as Record<FoodCategory, number>;
    const rarityCounts = {} as Record<ItemRarity, number>;

    ingredients.forEach(ingredient => {
      categoryCounts[ingredient.category] = (categoryCounts[ingredient.category] || 0) + 1;
      rarityCounts[ingredient.rarity] = (rarityCounts[ingredient.rarity] || 0) + 1;
    });

    return {
      totalIngredients: ingredients.length,
      categoryCounts,
      rarityCounts
    };
  }
}

// Helper classes
class AchievementEngine {
  // Implementation for achievement logic
}

class RarityCalculator {
  // Implementation for rarity calculations
}

class SoundManager {
  async playSequence(sounds: string[]): Promise<void> {
    // Implementation for playing sound sequences
  }
}

class HapticManager {
  async playSequence(patterns: HapticPattern[]): Promise<void> {
    // Implementation for haptic feedback sequences
  }
}

export default IngredientCollectionSystem;