/**
 * 3D Pantry Environment Engine
 * Animal Crossing-inspired 3D pantry visualization system
 * Based on PRP-026-Inventory-Visualization specification
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  InventoryItem, 
  PantryPreferences, 
  Interactive3DPantry, 
  PantryLayout,
  InventoryVisualization,
  InteractionManager,
  AnimationSystem,
  AccessibilityFeatures,
  PantryStructure3D,
  StorageZone,
  SeasonalTheme,
  Season,
  PerformanceConfig,
  RenderingMetrics,
  KitchenStyle,
  ColorScheme,
  StorageType,
  ItemRarity,
  LightingConfig,
  ParticleEffectConfig
} from './types/PantryTypes';

export class PantryEnvironmentEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  
  private pantryLayout: PantryLayout | null = null;
  private interactionManager: InteractionManager;
  private animationSystem: AnimationSystem;
  private accessibilityFeatures: AccessibilityFeatures;
  
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private cubeTextureLoader: THREE.CubeTextureLoader;
  
  private performanceConfig: PerformanceConfig;
  private renderingMetrics: RenderingMetrics;
  
  private isRendering: boolean = false;
  private frameId: number | null = null;
  
  // Asset management
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  
  // Seasonal system
  private currentSeason: Season = this.getCurrentSeason();
  private seasonalThemes: Map<Season, SeasonalTheme> = new Map();
  
  // Performance monitoring
  private performanceStartTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor(container: HTMLElement, config?: Partial<PerformanceConfig>) {
    this.container = container;
    this.performanceConfig = {
      targetFPS: 60,
      maxPolygons: 100000,
      enableLOD: true,
      enableInstancing: true,
      enableOcclusion: true,
      textureCompression: true,
      shadowQuality: 'medium',
      antialiasing: true,
      enablePhysics: false,
      maxParticles: 1000,
      ...config
    };

    this.initializeThreeJS();
    this.setupLoaders();
    this.initializeInteractionManager();
    this.initializeAnimationSystem();
    this.initializeAccessibilityFeatures();
    this.setupSeasonalThemes();
    this.setupPerformanceMonitoring();
  }

  private initializeThreeJS(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
    
    // Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: this.performanceConfig.antialiasing,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = this.performanceConfig.shadowQuality !== 'off';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1; // Prevent going under ground
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    
    // Add renderer to container
    this.container.appendChild(this.renderer.domElement);
    
    // Handle resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupLoaders(): void {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.cubeTextureLoader = new THREE.CubeTextureLoader();
  }

  private initializeInteractionManager(): void {
    this.interactionManager = {
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      selectedObject: null,
      hoveredObject: null,
      dragObject: null,
      interactionHandlers: new Map(),
      accessibilityMode: false
    };

    // Mouse/touch event listeners
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Touch events for mobile
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    
    // Keyboard events for accessibility
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private initializeAnimationSystem(): void {
    this.animationSystem = {
      mixer: new THREE.AnimationMixer(this.scene),
      activeClips: new Map(),
      seasonalTransitions: {} as any,
      itemAnimations: new Map(),
      environmentAnimations: {} as any
    };
  }

  private initializeAccessibilityFeatures(): void {
    this.accessibilityFeatures = {
      screenReader: {
        enabled: false,
        announcements: new Map()
      },
      keyboardNavigation: {
        enabled: false,
        focusIndicator: new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1, 16),
          new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.8,
            side: THREE.DoubleSide
          })
        ),
        focusableObjects: [],
        currentFocus: -1
      },
      colorBlind: {
        enabled: false,
        type: 'protanopia',
        colorFilters: new Map()
      },
      reducedMotion: {
        enabled: false,
        disabledAnimations: []
      },
      highContrast: {
        enabled: false,
        colorOverrides: new Map()
      }
    };

    // Hide focus indicator initially
    this.accessibilityFeatures.keyboardNavigation.focusIndicator.visible = false;
    this.scene.add(this.accessibilityFeatures.keyboardNavigation.focusIndicator);
  }

  private setupSeasonalThemes(): void {
    this.seasonalThemes.set('spring', {
      lighting: {
        ambientLight: { color: '#ffeaa7', intensity: 0.4 },
        directionalLight: {
          color: '#fff5b4',
          intensity: 1.2,
          position: new THREE.Vector3(10, 15, 5),
          shadows: true
        },
        spotLights: []
      },
      decorations: ['fresh_flowers.glb', 'light_curtains.glb', 'pastel_accents.glb'],
      ambientSounds: ['birds_chirping.mp3', 'gentle_breeze.mp3'],
      particleEffects: [
        {
          type: 'petals',
          count: 20,
          lifetime: 10,
          size: 0.1,
          velocity: new THREE.Vector3(0.1, -0.05, 0.1),
          gravity: -0.01,
          color: '#ffb3ba',
          opacity: 0.7,
          texture: 'petal.png'
        }
      ],
      colorPalette: {
        primary: '#74b9ff',
        secondary: '#55a3ff',
        accent: '#a29bfe',
        ambient: '#ffeaa7'
      }
    });

    this.seasonalThemes.set('summer', {
      lighting: {
        ambientLight: { color: '#ffeaa7', intensity: 0.5 },
        directionalLight: {
          color: '#fff',
          intensity: 1.4,
          position: new THREE.Vector3(10, 20, 5),
          shadows: true
        },
        spotLights: []
      },
      decorations: ['vibrant_fruits.glb', 'summer_herbs.glb', 'bright_colors.glb'],
      ambientSounds: ['summer_crickets.mp3', 'distant_laughter.mp3'],
      particleEffects: [
        {
          type: 'sparkles',
          count: 30,
          lifetime: 8,
          size: 0.05,
          velocity: new THREE.Vector3(0, 0.1, 0),
          gravity: 0,
          color: '#fdcb6e',
          opacity: 0.8,
          texture: 'sparkle.png'
        }
      ],
      colorPalette: {
        primary: '#fd79a8',
        secondary: '#e17055',
        accent: '#fdcb6e',
        ambient: '#ffeaa7'
      }
    });

    this.seasonalThemes.set('autumn', {
      lighting: {
        ambientLight: { color: '#e17055', intensity: 0.3 },
        directionalLight: {
          color: '#fdcb6e',
          intensity: 1.0,
          position: new THREE.Vector3(15, 10, 8),
          shadows: true
        },
        spotLights: []
      },
      decorations: ['autumn_leaves.glb', 'harvest_vegetables.glb', 'warm_candles.glb'],
      ambientSounds: ['rustling_leaves.mp3', 'cozy_fire.mp3'],
      particleEffects: [
        {
          type: 'leaves',
          count: 40,
          lifetime: 15,
          size: 0.2,
          velocity: new THREE.Vector3(0.2, -0.1, 0.1),
          gravity: -0.02,
          color: '#e17055',
          opacity: 0.9,
          texture: 'leaf.png'
        }
      ],
      colorPalette: {
        primary: '#e17055',
        secondary: '#d63031',
        accent: '#fdcb6e',
        ambient: '#fab1a0'
      }
    });

    this.seasonalThemes.set('winter', {
      lighting: {
        ambientLight: { color: '#74b9ff', intensity: 0.2 },
        directionalLight: {
          color: '#ddd',
          intensity: 0.8,
          position: new THREE.Vector3(5, 12, 10),
          shadows: true
        },
        spotLights: []
      },
      decorations: ['winter_preserves.glb', 'warm_blankets.glb', 'hot_cocoa.glb'],
      ambientSounds: ['gentle_snow.mp3', 'crackling_fire.mp3'],
      particleEffects: [
        {
          type: 'snow',
          count: 50,
          lifetime: 20,
          size: 0.05,
          velocity: new THREE.Vector3(0.05, -0.08, 0.02),
          gravity: -0.005,
          color: '#ffffff',
          opacity: 0.8,
          texture: 'snowflake.png'
        }
      ],
      colorPalette: {
        primary: '#74b9ff',
        secondary: '#0984e3',
        accent: '#a29bfe',
        ambient: '#ddd'
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    this.renderingMetrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      drawCalls: 0,
      triangles: 0,
      loadTime: 0,
      interactionLatency: 0
    };

    this.performanceStartTime = performance.now();
  }

  // Main pantry creation method
  async createPantryEnvironment(
    inventoryData: InventoryItem[],
    userPreferences: PantryPreferences
  ): Promise<Interactive3DPantry> {
    const startTime = performance.now();

    try {
      // Generate optimal layout
      const pantryConfig = await this.generateOptimalLayout(inventoryData, userPreferences);

      // Create base pantry structure
      const pantryStructure = await this.build3DPantryStructure({
        style: userPreferences.kitchenStyle,
        size: this.calculateOptimalSize(inventoryData.length),
        colorScheme: userPreferences.colorScheme,
        lighting: this.calculateOptimalLighting(userPreferences.timeOfDay)
      });

      // Populate with inventory items
      const inventoryObjects = await this.populate3DInventory(inventoryData, pantryStructure);

      // Add interactive elements
      const interactiveElements = this.createInteractiveElements(inventoryObjects, pantryStructure);

      // Setup animations and transitions
      this.setupAnimationSystem({
        itemMovement: 'smooth_physics_based',
        userInteraction: 'satisfying_feedback',
        environmentChanges: 'seasonal_transitions'
      });

      // Apply seasonal theme
      if (userPreferences.enableSeasonalThemes) {
        await this.applySeasonalTheme(this.currentSeason);
      }

      this.renderingMetrics.loadTime = performance.now() - startTime;

      const result: Interactive3DPantry = {
        scene: this.scene,
        objects: {
          structure: pantryStructure,
          inventory: inventoryObjects,
          interactive: interactiveElements
        },
        animations: this.animationSystem,
        interactions: this.interactionManager,
        accessibility: this.accessibilityFeatures
      };

      // Start rendering loop
      this.startRenderLoop();

      return result;

    } catch (error) {
      console.error('Error creating 3D pantry environment:', error);
      throw new Error(`Failed to create pantry environment: ${error.message}`);
    }
  }

  private async generateOptimalLayout(
    inventoryData: InventoryItem[],
    userPreferences: PantryPreferences
  ): Promise<PantryLayout> {
    // Analyze inventory requirements
    const storageRequirements = this.analyzeStorageRequirements(inventoryData);
    const dimensions = this.calculateOptimalDimensions(inventoryData.length, userPreferences);

    // Create storage zones based on requirements
    const storageZones = this.createOptimalStorageZones(storageRequirements, dimensions);

    return {
      id: `layout_${Date.now()}`,
      name: `${userPreferences.kitchenStyle}_pantry`,
      dimensions,
      storageZones,
      lightingSetup: this.calculateOptimalLighting(userPreferences.timeOfDay),
      decorativeElements: [],
      interactionPoints: []
    };
  }

  private analyzeStorageRequirements(inventoryData: InventoryItem[]): Map<StorageType, number> {
    const requirements = new Map<StorageType, number>();

    inventoryData.forEach(item => {
      const current = requirements.get(item.storageRequirement) || 0;
      requirements.set(item.storageRequirement, current + item.quantity);
    });

    return requirements;
  }

  private calculateOptimalSize(itemCount: number): THREE.Vector3 {
    // Base size calculation with golden ratio proportions
    const baseArea = Math.max(16, itemCount * 0.5); // Min 4x4 meters
    const width = Math.sqrt(baseArea * 1.618); // Golden ratio width
    const depth = baseArea / width;
    const height = 2.8; // Standard kitchen height

    return new THREE.Vector3(width, height, depth);
  }

  private calculateOptimalDimensions(itemCount: number, prefs: PantryPreferences): THREE.Vector3 {
    let multiplier = 1.0;

    // Adjust based on kitchen style
    switch (prefs.kitchenStyle) {
      case 'cozy_cottage':
        multiplier = 0.9;
        break;
      case 'modern_minimalist':
        multiplier = 1.1;
        break;
      case 'industrial_loft':
        multiplier = 1.3;
        break;
      case 'rustic_farmhouse':
        multiplier = 1.2;
        break;
    }

    const baseSize = this.calculateOptimalSize(itemCount);
    return baseSize.multiplyScalar(multiplier);
  }

  private calculateOptimalLighting(timeOfDay: string): LightingConfig {
    const baseConfig: LightingConfig = {
      ambientLight: {
        color: '#f0f0f0',
        intensity: 0.3
      },
      directionalLight: {
        color: '#ffffff',
        intensity: 1.0,
        position: new THREE.Vector3(10, 15, 5),
        shadows: true
      },
      spotLights: []
    };

    // Adjust based on time of day
    switch (timeOfDay) {
      case 'morning':
        baseConfig.ambientLight.color = '#ffeaa7';
        baseConfig.ambientLight.intensity = 0.4;
        baseConfig.directionalLight.color = '#fff5b4';
        baseConfig.directionalLight.intensity = 1.2;
        break;
      case 'afternoon':
        baseConfig.ambientLight.color = '#ffffff';
        baseConfig.ambientLight.intensity = 0.5;
        baseConfig.directionalLight.intensity = 1.4;
        break;
      case 'evening':
        baseConfig.ambientLight.color = '#e17055';
        baseConfig.ambientLight.intensity = 0.3;
        baseConfig.directionalLight.color = '#fdcb6e';
        baseConfig.directionalLight.intensity = 0.8;
        break;
      case 'night':
        baseConfig.ambientLight.color = '#74b9ff';
        baseConfig.ambientLight.intensity = 0.2;
        baseConfig.directionalLight.color = '#ddd';
        baseConfig.directionalLight.intensity = 0.6;
        break;
    }

    return baseConfig;
  }

  private createOptimalStorageZones(
    requirements: Map<StorageType, number>,
    dimensions: THREE.Vector3
  ): StorageZone[] {
    const zones: StorageZone[] = [];
    let currentY = 0;

    // Create zones based on storage requirements
    requirements.forEach((capacity, storageType) => {
      const zoneHeight = this.getStorageZoneHeight(storageType);
      const zoneDepth = this.getStorageZoneDepth(storageType);

      zones.push({
        id: `zone_${storageType}_${zones.length}`,
        type: storageType,
        position: new THREE.Vector3(0, currentY, 0),
        size: new THREE.Vector3(dimensions.x * 0.9, zoneHeight, zoneDepth),
        capacity: Math.ceil(capacity * 1.2), // 20% extra capacity
        currentItems: [],
        accessible: true,
        visualStyle: this.getStorageVisualStyle(storageType)
      });

      currentY += zoneHeight + 0.1; // Small gap between zones
    });

    return zones;
  }

  private getStorageZoneHeight(storageType: StorageType): number {
    switch (storageType) {
      case 'ambient':
      case 'dry':
        return 0.6;
      case 'refrigerated':
        return 0.8;
      case 'frozen':
        return 0.4;
      case 'countertop':
        return 0.3;
      case 'hanging':
        return 1.0;
      case 'cool_dark':
        return 0.5;
      default:
        return 0.5;
    }
  }

  private getStorageZoneDepth(storageType: StorageType): number {
    switch (storageType) {
      case 'hanging':
        return 0.2;
      case 'countertop':
        return 0.8;
      default:
        return 0.5;
    }
  }

  private getStorageVisualStyle(storageType: StorageType): any {
    const styles = {
      ambient: {
        materialType: 'wood',
        color: '#8B4513',
        transparency: 0,
        shininess: 0.1
      },
      refrigerated: {
        materialType: 'metal',
        color: '#E0E0E0',
        transparency: 0,
        shininess: 0.8
      },
      frozen: {
        materialType: 'metal',
        color: '#B0C4DE',
        transparency: 0,
        shininess: 0.9,
        emissive: '#001122'
      },
      dry: {
        materialType: 'wood',
        color: '#DEB887',
        transparency: 0,
        shininess: 0.2
      },
      countertop: {
        materialType: 'ceramic',
        color: '#F5F5F5',
        transparency: 0,
        shininess: 0.7
      },
      hanging: {
        materialType: 'metal',
        color: '#696969',
        transparency: 0,
        shininess: 0.5
      },
      cool_dark: {
        materialType: 'wood',
        color: '#2F4F4F',
        transparency: 0,
        shininess: 0.1
      }
    };

    return styles[storageType] || styles.ambient;
  }

  // ... (continue avec les autres méthodes)
  
  private getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  // Event handlers
  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.interactionManager.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.interactionManager.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateRaycaster();
  }

  private onClick(event: MouseEvent): void {
    this.updateRaycaster();
    const intersects = this.interactionManager.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      this.handleObjectSelection(selectedObject, intersects[0].point);
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    // Handle double-click for detailed item inspection
    this.updateRaycaster();
    const intersects = this.interactionManager.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      this.handleObjectInspection(selectedObject);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left mouse button
      this.interactionManager.dragObject = this.interactionManager.hoveredObject;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.interactionManager.dragObject = null;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.interactionManager.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.interactionManager.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      this.onClick(event as any);
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.interactionManager.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.interactionManager.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.accessibilityFeatures.keyboardNavigation.enabled) {
      this.handleKeyboardNavigation(event);
    }
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateRaycaster(): void {
    this.interactionManager.raycaster.setFromCamera(this.interactionManager.mouse, this.camera);
  }

  private handleObjectSelection(object: THREE.Object3D, point: THREE.Vector3): void {
    // Implementation for object selection
    console.log('Object selected:', object.userData);
  }

  private handleObjectInspection(object: THREE.Object3D): void {
    // Implementation for detailed object inspection
    console.log('Object inspected:', object.userData);
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Implementation for keyboard navigation
    const { keyboardNavigation } = this.accessibilityFeatures;
    
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        this.focusNextObject();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateFocusedObject();
        break;
    }
  }

  private focusNextObject(): void {
    const { keyboardNavigation } = this.accessibilityFeatures;
    if (keyboardNavigation.focusableObjects.length === 0) return;

    keyboardNavigation.currentFocus = (keyboardNavigation.currentFocus + 1) % keyboardNavigation.focusableObjects.length;
    const focusedObject = keyboardNavigation.focusableObjects[keyboardNavigation.currentFocus];
    
    // Position focus indicator
    keyboardNavigation.focusIndicator.position.copy(focusedObject.position);
    keyboardNavigation.focusIndicator.visible = true;
  }

  private activateFocusedObject(): void {
    const { keyboardNavigation } = this.accessibilityFeatures;
    if (keyboardNavigation.currentFocus >= 0 && keyboardNavigation.currentFocus < keyboardNavigation.focusableObjects.length) {
      const focusedObject = keyboardNavigation.focusableObjects[keyboardNavigation.currentFocus];
      this.handleObjectSelection(focusedObject, focusedObject.position);
    }
  }

  // Render loop
  private startRenderLoop(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  private render(): void {
    if (!this.isRendering) return;

    const startTime = performance.now();

    // Update controls
    this.controls.update();

    // Update animations
    const deltaTime = this.animationSystem.mixer.time;
    this.animationSystem.mixer.update(deltaTime);

    // Update performance metrics
    this.updatePerformanceMetrics(startTime);

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Continue render loop
    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  private updatePerformanceMetrics(startTime: number): void {
    const currentTime = performance.now();
    this.renderingMetrics.frameTime = currentTime - startTime;

    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.renderingMetrics.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Get renderer info
    const info = this.renderer.info;
    this.renderingMetrics.drawCalls = info.render.calls;
    this.renderingMetrics.triangles = info.render.triangles;

    // Memory usage (if available)
    if ((performance as any).memory) {
      this.renderingMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }

  // Public methods
  public dispose(): void {
    this.isRendering = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }

    // Dispose of Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.controls.dispose();

    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    document.removeEventListener('keydown', this.onKeyDown.bind(this));

    // Clear caches
    this.loadedModels.clear();
    this.loadedTextures.clear();
    this.materialCache.clear();
  }

  public getPerformanceMetrics(): RenderingMetrics {
    return { ...this.renderingMetrics };
  }

  public enableAccessibility(features: Partial<AccessibilityFeatures>): void {
    Object.assign(this.accessibilityFeatures, features);
  }

  // Placeholder methods for complex functionality
  private async build3DPantryStructure(config: any): Promise<PantryStructure3D> {
    // Placeholder - complex 3D structure building
    return {} as PantryStructure3D;
  }

  private async populate3DInventory(inventory: InventoryItem[], structure: any): Promise<InventoryVisualization[]> {
    // Placeholder - complex inventory population
    return [];
  }

  private createInteractiveElements(inventory: any[], structure: any): THREE.Object3D[] {
    // Placeholder - interactive elements creation
    return [];
  }

  private setupAnimationSystem(config: any): void {
    // Placeholder - animation system setup
  }

  private async applySeasonalTheme(season: Season): Promise<void> {
    const theme = this.seasonalThemes.get(season);
    if (!theme) return;

    // Apply lighting changes
    this.scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight) {
        object.color.setHex(parseInt(theme.lighting.ambientLight.color.replace('#', ''), 16));
        object.intensity = theme.lighting.ambientLight.intensity;
      }
    });

    // Add seasonal decorations and effects would be implemented here
  }
}