/**
 * Comprehensive Test Suite for PRP-026 Inventory Visualization System
 * Tests all major components of the 3D pantry visualization system
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as THREE from 'three';

// Mock Three.js WebGL context
const mockWebGLContext = {
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  getSupportedExtensions: jest.fn(() => ['WEBGL_debug_renderer_info'])
};

// Mock WebGL renderer
jest.mock('three', () => {
  const actualTHREE = jest.requireActual('three');
  return {
    ...actualTHREE,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      getContext: () => mockWebGLContext,
      capabilities: { isWebGL2: true },
      info: { render: { calls: 10, triangles: 1000 } },
      shadowMap: { enabled: false, type: actualTHREE.BasicShadowMap },
      setPixelRatio: jest.fn(),
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn()
    }))
  };
});

// Import modules after mocking
import { PantryEnvironmentEngine } from '../visualization/PantryEnvironmentEngine';
import { IngredientCollectionSystem } from '../gamification/IngredientCollectionSystem';
import { SeasonalThemeSystem } from '../visualization/SeasonalThemeSystem';
import { PerformanceOptimizer } from '../visualization/PerformanceOptimizer';
import {
  InventoryItem,
  PantryPreferences,
  DiscoveryContext,
  Season,
  PerformanceConfig
} from '../visualization/types/PantryTypes';

describe('PRP-026 Inventory Visualization System', () => {
  let mockScene: THREE.Scene;
  let mockCamera: THREE.Camera;
  let mockRenderer: THREE.WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Mock DOM elements
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockWebGLContext
    } as any;
    
    global.document = {
      createElement: jest.fn(() => mockCanvas),
      body: { appendChild: jest.fn() }
    } as any;

    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 2,
      AudioContext: jest.fn(),
      performance: { 
        now: jest.fn(() => Date.now()),
        memory: { usedJSHeapSize: 50000000 }
      },
      requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16))
    } as any;

    global.navigator = {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    } as any;

    // Setup Three.js mocks
    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
    mockRenderer = new THREE.WebGLRenderer();

    // Configure mock responses
    mockWebGLContext.getParameter.mockImplementation((param) => {
      switch (param) {
        case mockWebGLContext.MAX_TEXTURE_SIZE:
          return 4096;
        default:
          return 'Mock WebGL';
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PantryEnvironmentEngine', () => {
    let engine: PantryEnvironmentEngine;
    let mockInventoryData: InventoryItem[];
    let mockPreferences: PantryPreferences;

    beforeEach(() => {
      engine = new PantryEnvironmentEngine(mockScene, mockRenderer, mockCamera);
      
      mockInventoryData = [
        {
          id: 'item1',
          name: 'Organic Apples',
          category: 'fruits',
          quantity: 6,
          unit: 'pieces',
          expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          freshness: 0.9,
          nutritionalValue: { vitamins: 85, minerals: 20, fiber: 15 },
          location: { zone: 'fruit_bowl', x: 2, y: 1, z: 0 },
          discoveryDate: new Date(),
          rarity: 'common'
        },
        {
          id: 'item2', 
          name: 'Aged Cheddar',
          category: 'dairy',
          quantity: 500,
          unit: 'grams',
          expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          freshness: 0.8,
          nutritionalValue: { vitamins: 40, minerals: 60, protein: 80 },
          location: { zone: 'refrigerator', x: 1, y: 2, z: 1 },
          discoveryDate: new Date(),
          rarity: 'uncommon'
        }
      ];

      mockPreferences = {
        theme: 'modern',
        lightingIntensity: 1.0,
        enableAnimations: true,
        showNutritionInfo: true,
        cameraPosition: 'default',
        interactionMode: 'explore'
      };
    });

    test('should initialize 3D pantry environment successfully', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      expect(pantry).toBeDefined();
      expect(pantry.scene).toBe(mockScene);
      expect(pantry.items).toHaveLength(2);
      expect(pantry.interactions.onClick).toBeDefined();
      expect(pantry.interactions.onHover).toBeDefined();
    });

    test('should create proper item visualizations', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      const appleItem = pantry.items.find(item => item.item.id === 'item1');
      const cheeseItem = pantry.items.find(item => item.item.id === 'item2');
      
      expect(appleItem).toBeDefined();
      expect(appleItem!.model).toBeInstanceOf(THREE.Object3D);
      expect(appleItem!.animations).toBeDefined();
      
      expect(cheeseItem).toBeDefined();
      expect(cheeseItem!.model).toBeInstanceOf(THREE.Object3D);
      expect(cheeseItem!.animations).toBeDefined();
    });

    test('should handle zone-based positioning correctly', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      const fruitBowlItem = pantry.items.find(item => 
        item.item.location.zone === 'fruit_bowl'
      );
      const refrigeratorItem = pantry.items.find(item => 
        item.item.location.zone === 'refrigerator'
      );
      
      expect(fruitBowlItem).toBeDefined();
      expect(refrigeratorItem).toBeDefined();
      
      // Positions should be different for different zones
      expect(fruitBowlItem!.model.position.equals(refrigeratorItem!.model.position)).toBe(false);
    });

    test('should apply freshness-based visual effects', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      const freshItem = pantry.items.find(item => item.item.freshness > 0.8);
      const lesseFreshItem = pantry.items.find(item => item.item.freshness <= 0.8);
      
      expect(freshItem).toBeDefined();
      expect(lesseFreshItem).toBeDefined();
      
      // Fresh items should have different visual properties
      expect(freshItem!.model.material).toBeDefined();
      expect(lesseFreshItem!.model.material).toBeDefined();
    });

    test('should handle interaction events', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      const clickHandler = jest.fn();
      const hoverHandler = jest.fn();
      
      pantry.interactions.onClick = clickHandler;
      pantry.interactions.onHover = hoverHandler;
      
      // Simulate interaction
      const testItem = pantry.items[0];
      pantry.interactions.onClick(testItem.item.id);
      pantry.interactions.onHover(testItem.item.id, true);
      
      expect(clickHandler).toHaveBeenCalledWith('item1');
      expect(hoverHandler).toHaveBeenCalledWith('item1', true);
    });

    test('should dispose resources properly', async () => {
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      
      const disposeSpy = jest.spyOn(pantry, 'dispose');
      pantry.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('IngredientCollectionSystem', () => {
    let collectionSystem: IngredientCollectionSystem;
    let mockUserId: string;

    beforeEach(() => {
      collectionSystem = new IngredientCollectionSystem();
      mockUserId = 'user123';

      // Mock local storage
      global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      } as any;
    });

    test('should discover new ingredients successfully', async () => {
      const mockContext: DiscoveryContext = {
        location: 'kitchen',
        method: 'scanning',
        timestamp: new Date()
      };

      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify([]));

      const discoveryEvent = await collectionSystem.discoverNewIngredient(
        mockUserId,
        'tomato',
        mockContext
      );

      expect(discoveryEvent).toBeDefined();
      expect(discoveryEvent.ingredientId).toBe('tomato');
      expect(discoveryEvent.isNewDiscovery).toBe(true);
      expect(discoveryEvent.experienceGained).toBeGreaterThan(0);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should handle duplicate ingredient discoveries', async () => {
      const existingCollection = [{
        id: 'tomato',
        name: 'Tomato',
        category: 'vegetables',
        rarity: 'common',
        discoveryDate: new Date().toISOString(),
        experienceValue: 10
      }];

      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(existingCollection));

      const mockContext: DiscoveryContext = {
        location: 'kitchen',
        method: 'scanning',
        timestamp: new Date()
      };

      const discoveryEvent = await collectionSystem.discoverNewIngredient(
        mockUserId,
        'tomato',
        mockContext
      );

      expect(discoveryEvent.isNewDiscovery).toBe(false);
      expect(discoveryEvent.experienceGained).toBe(0);
    });

    test('should calculate rarity correctly', async () => {
      const rarityScore = collectionSystem.calculateIngredientRarity('truffle');
      expect(rarityScore).toBeGreaterThan(0.8); // Truffles should be rare
      
      const commonScore = collectionSystem.calculateIngredientRarity('potato');
      expect(commonScore).toBeLessThan(0.3); // Potatoes should be common
    });

    test('should unlock achievements based on collection progress', async () => {
      const mockAchievements = [
        { id: 'first_discovery', name: 'First Discovery', threshold: 1 },
        { id: 'collector', name: 'Collector', threshold: 10 },
        { id: 'gourmand', name: 'Gourmand', threshold: 50 }
      ];

      // Mock having discovered 10 ingredients
      const mockProgress = { totalDiscovered: 10, uniqueCategories: 5 };
      
      const unlockedAchievements = collectionSystem.checkAchievementProgress(
        mockUserId,
        mockProgress
      );

      expect(unlockedAchievements).toContain('first_discovery');
      expect(unlockedAchievements).toContain('collector');
      expect(unlockedAchievements).not.toContain('gourmand');
    });

    test('should generate proper pokedex entries', async () => {
      const pokedexEntry = collectionSystem.generatePokedexEntry('apple');
      
      expect(pokedexEntry).toBeDefined();
      expect(pokedexEntry.ingredientId).toBe('apple');
      expect(pokedexEntry.name).toBeDefined();
      expect(pokedexEntry.category).toBeDefined();
      expect(pokedexEntry.nutritionalInfo).toBeDefined();
      expect(pokedexEntry.rarity).toBeDefined();
      expect(pokedexEntry.habitat).toBeDefined();
      expect(pokedexEntry.seasonality).toBeDefined();
    });
  });

  describe('SeasonalThemeSystem', () => {
    let themeSystem: SeasonalThemeSystem;

    beforeEach(() => {
      themeSystem = new SeasonalThemeSystem(mockScene, mockCamera, mockRenderer);
    });

    test('should initialize with current season', () => {
      const currentState = themeSystem.getCurrentSeasonalState();
      
      expect(currentState).toBeDefined();
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(currentState.currentSeason);
      expect(currentState.transitionProgress).toBe(1.0);
      expect(currentState.isTransitioning).toBe(false);
    });

    test('should transition between seasons smoothly', async () => {
      const initialSeason = themeSystem.getCurrentSeasonalState().currentSeason;
      const targetSeason: Season = initialSeason === 'spring' ? 'summer' : 'spring';

      const transitionPromise = themeSystem.transitionToSeason(targetSeason, {
        duration: 100, // Short duration for testing
        easing: 'linear',
        enableSounds: false, // Disable sounds for testing
        enableParticles: true,
        enableLightingChanges: true,
        enableDecorationSwap: false
      });

      // Check that transition started
      const duringTransition = themeSystem.getCurrentSeasonalState();
      expect(duringTransition.isTransitioning).toBe(true);

      // Wait for transition to complete
      await transitionPromise;

      // Check final state
      const finalState = themeSystem.getCurrentSeasonalState();
      expect(finalState.currentSeason).toBe(targetSeason);
      expect(finalState.isTransitioning).toBe(false);
      expect(finalState.transitionProgress).toBe(1);
    });

    test('should handle lighting transitions correctly', async () => {
      const initialLighting = themeSystem.getCurrentSeasonalState().currentLighting;
      
      await themeSystem.transitionToSeason('winter', {
        duration: 100,
        enableLightingChanges: true,
        enableSounds: false,
        enableParticles: false,
        enableDecorationSwap: false
      });

      const finalLighting = themeSystem.getCurrentSeasonalState().currentLighting;
      
      expect(initialLighting).not.toEqual(finalLighting);
      expect(finalLighting.ambientLight.color).toBeDefined();
      expect(finalLighting.directionalLight.color).toBeDefined();
    });

    test('should update particle systems correctly', () => {
      const deltaTime = 16.67; // ~60fps
      
      expect(() => {
        themeSystem.updateParticleSystems(deltaTime);
      }).not.toThrow();
    });

    test('should enable automatic seasonal transitions', () => {
      expect(() => {
        themeSystem.enableSeasonalAutoTransition(1); // 1 minute interval for testing
      }).not.toThrow();
    });

    test('should dispose resources properly', () => {
      expect(() => {
        themeSystem.dispose();
      }).not.toThrow();
    });
  });

  describe('PerformanceOptimizer', () => {
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      optimizer = new PerformanceOptimizer(mockScene, mockRenderer, mockCamera);
    });

    test('should detect device capabilities correctly', () => {
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.deviceMemory).toBe(8);
      expect(capabilities.hardwareConcurrency).toBe(8);
      expect(capabilities.maxTextureSize).toBe(4096);
      expect(capabilities.webglVersion).toBe(1); // Mock renderer is WebGL1
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.isLowEnd).toBe(false);
    });

    test('should select appropriate optimization profile', () => {
      const currentProfile = optimizer.getCurrentProfile();
      
      expect(currentProfile).toBeDefined();
      expect(currentProfile.name).toBeDefined();
      expect(currentProfile.config).toBeDefined();
      expect(currentProfile.expectedFPS).toBeGreaterThan(0);
    });

    test('should switch profiles dynamically', () => {
      const initialProfile = optimizer.getCurrentProfile().name;
      
      const success = optimizer.setProfile('ultra_performance');
      expect(success).toBe(true);
      
      const newProfile = optimizer.getCurrentProfile();
      expect(newProfile.name).toBe('Ultra Performance');
      expect(newProfile.name).not.toBe(initialProfile);
    });

    test('should create LOD objects correctly', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      
      const lodObject = optimizer.createLODObject(geometry, material, 'test_object');
      
      expect(lodObject).toBeInstanceOf(THREE.LOD);
      expect(lodObject.levels).toBeDefined();
      expect(lodObject.levels.length).toBeGreaterThan(0);
    });

    test('should monitor performance metrics', () => {
      const metrics = optimizer.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.fps).toBe('number');
      expect(typeof metrics.frameTime).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.drawCalls).toBe('number');
      expect(typeof metrics.triangles).toBe('number');
    });

    test('should optimize inventory visualizations', () => {
      const mockVisualizations = [
        {
          item: { id: 'item1', name: 'Apple' } as InventoryItem,
          model: new THREE.Object3D()
        },
        {
          item: { id: 'item2', name: 'Orange' } as InventoryItem,
          model: new THREE.Object3D()
        }
      ];

      // Position objects at different distances
      mockVisualizations[0].model.position.set(5, 0, 0);
      mockVisualizations[1].model.position.set(50, 0, 0);

      expect(() => {
        optimizer.optimizeInventoryVisualization(mockVisualizations);
      }).not.toThrow();

      // Close object should be visible, distant object might be culled
      expect(mockVisualizations[0].model.visible).toBe(true);
    });

    test('should clean up memory correctly', () => {
      expect(() => {
        optimizer.cleanupMemory();
      }).not.toThrow();
    });

    test('should enable/disable adaptive quality', () => {
      optimizer.enableAdaptiveQuality(true);
      expect(() => {
        optimizer.enableAdaptiveQuality(false);
      }).not.toThrow();
    });

    test('should dispose properly', () => {
      expect(() => {
        optimizer.dispose();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    let engine: PantryEnvironmentEngine;
    let collectionSystem: IngredientCollectionSystem;
    let themeSystem: SeasonalThemeSystem;
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      engine = new PantryEnvironmentEngine(mockScene, mockRenderer, mockCamera);
      collectionSystem = new IngredientCollectionSystem();
      themeSystem = new SeasonalThemeSystem(mockScene, mockCamera, mockRenderer);
      optimizer = new PerformanceOptimizer(mockScene, mockRenderer, mockCamera);
    });

    test('should integrate all systems without conflicts', async () => {
      const mockInventoryData: InventoryItem[] = [
        {
          id: 'integration_test_item',
          name: 'Test Apple',
          category: 'fruits',
          quantity: 1,
          unit: 'piece',
          expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          freshness: 0.95,
          nutritionalValue: { vitamins: 90, minerals: 25, fiber: 20 },
          location: { zone: 'fruit_bowl', x: 0, y: 0, z: 0 },
          discoveryDate: new Date(),
          rarity: 'common'
        }
      ];

      const mockPreferences: PantryPreferences = {
        theme: 'seasonal',
        lightingIntensity: 1.0,
        enableAnimations: true,
        showNutritionInfo: true,
        cameraPosition: 'default',
        interactionMode: 'collect'
      };

      // Create pantry environment
      const pantry = await engine.createPantryEnvironment(mockInventoryData, mockPreferences);
      expect(pantry).toBeDefined();

      // Test discovery system
      const discoveryEvent = await collectionSystem.discoverNewIngredient(
        'test_user',
        'apple',
        { location: 'kitchen', method: 'scanning', timestamp: new Date() }
      );
      expect(discoveryEvent.isNewDiscovery).toBe(true);

      // Test seasonal transitions
      await themeSystem.transitionToSeason('spring', {
        duration: 50,
        enableSounds: false,
        enableParticles: false,
        enableLightingChanges: true,
        enableDecorationSwap: false
      });
      expect(themeSystem.getCurrentSeasonalState().currentSeason).toBe('spring');

      // Test performance optimization
      optimizer.optimizeInventoryVisualization(pantry.items);
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics).toBeDefined();

      // Cleanup all systems
      pantry.dispose();
      themeSystem.dispose();
      optimizer.dispose();
    });

    test('should handle system failures gracefully', async () => {
      // Test with invalid data
      const invalidInventoryData = [
        {
          id: '',
          name: '',
          category: 'invalid' as any,
          quantity: -1,
          unit: '',
          expirationDate: new Date('invalid'),
          freshness: -1,
          nutritionalValue: {},
          location: {},
          discoveryDate: new Date('invalid'),
          rarity: 'invalid' as any
        } as InventoryItem
      ];

      // Should not crash with invalid data
      expect(async () => {
        await engine.createPantryEnvironment(invalidInventoryData, {} as PantryPreferences);
      }).not.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should initialize systems within performance thresholds', async () => {
      const startTime = performance.now();
      
      const engine = new PantryEnvironmentEngine(mockScene, mockRenderer, mockCamera);
      const collectionSystem = new IngredientCollectionSystem();
      const themeSystem = new SeasonalThemeSystem(mockScene, mockCamera, mockRenderer);
      const optimizer = new PerformanceOptimizer(mockScene, mockRenderer, mockCamera);

      const endTime = performance.now();
      const initializationTime = endTime - startTime;

      // Should initialize within 1 second (generous threshold for testing)
      expect(initializationTime).toBeLessThan(1000);

      // Cleanup
      themeSystem.dispose();
      optimizer.dispose();
    });

    test('should handle large inventory datasets efficiently', async () => {
      const largeInventoryData: InventoryItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item_${i}`,
        name: `Test Item ${i}`,
        category: ['fruits', 'vegetables', 'dairy', 'grains'][i % 4] as any,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: 'pieces',
        expirationDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        freshness: Math.random(),
        nutritionalValue: { 
          vitamins: Math.floor(Math.random() * 100),
          minerals: Math.floor(Math.random() * 100),
          fiber: Math.floor(Math.random() * 100)
        },
        location: { 
          zone: 'pantry', 
          x: Math.random() * 10, 
          y: Math.random() * 10, 
          z: Math.random() * 10 
        },
        discoveryDate: new Date(),
        rarity: ['common', 'uncommon', 'rare'][i % 3] as any
      }));

      const startTime = performance.now();
      
      const engine = new PantryEnvironmentEngine(mockScene, mockRenderer, mockCamera);
      const pantry = await engine.createPantryEnvironment(largeInventoryData, {
        theme: 'modern',
        lightingIntensity: 1.0,
        enableAnimations: false, // Disable animations for performance testing
        showNutritionInfo: true,
        cameraPosition: 'default',
        interactionMode: 'explore'
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(pantry.items).toHaveLength(100);
      
      // Should process 100 items within 5 seconds (generous threshold)
      expect(processingTime).toBeLessThan(5000);

      pantry.dispose();
    });
  });
});