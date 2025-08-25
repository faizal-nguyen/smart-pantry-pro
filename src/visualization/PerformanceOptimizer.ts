/**
 * 3D Performance Optimizer
 * Advanced performance optimization for inventory visualization
 * Based on PRP-026-Inventory-Visualization specification
 */

import * as THREE from 'three';
import {
  PerformanceConfig,
  RenderingMetrics,
  InventoryVisualization
} from './types/PantryTypes';

export interface OptimizationProfile {
  name: string;
  description: string;
  config: PerformanceConfig;
  targetDevices: ('mobile' | 'tablet' | 'desktop')[];
  expectedFPS: number;
}

export interface DeviceCapabilities {
  deviceMemory: number;
  hardwareConcurrency: number;
  maxTextureSize: number;
  webglVersion: number;
  renderer: string;
  vendor: string;
  isLowEnd: boolean;
  isMobile: boolean;
  supportedExtensions: string[];
}

export interface LODConfiguration {
  levels: LODLevel[];
  transitionDistances: number[];
  enableInstancing: boolean;
  enableOcclusionCulling: boolean;
}

export interface LODLevel {
  name: string;
  maxDistance: number;
  polygonReduction: number;
  textureResolution: number;
  enableShadows: boolean;
  enableReflections: boolean;
  particleCount: number;
}

export interface MemoryManager {
  maxTextureMemory: number;
  maxGeometryMemory: number;
  textureCache: Map<string, THREE.Texture>;
  geometryCache: Map<string, THREE.BufferGeometry>;
  materialCache: Map<string, THREE.Material>;
  disposalQueue: Array<{ object: any; timestamp: number }>;
}

export interface RenderingOptimizations {
  frustumCulling: boolean;
  occlusionCulling: boolean;
  instancedRendering: boolean;
  batchedDrawCalls: boolean;
  geometryCompression: boolean;
  textureCompression: boolean;
  mipmapGeneration: boolean;
  anisotropicFiltering: boolean;
}

export class PerformanceOptimizer {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;

  private deviceCapabilities: DeviceCapabilities;
  private currentProfile: OptimizationProfile;
  private memoryManager: MemoryManager;
  private renderingOptimizations: RenderingOptimizations;
  
  private performanceMetrics: RenderingMetrics;
  private monitoringEnabled: boolean = true;
  private frameTimings: number[] = [];
  private adaptiveQualityEnabled: boolean = true;

  // Predefined optimization profiles
  private optimizationProfiles: Map<string, OptimizationProfile> = new Map();
  
  // LOD system
  private lodConfiguration: LODConfiguration;
  private lodObjects: Map<string, THREE.LOD> = new Map();
  
  // Monitoring intervals
  private performanceMonitorInterval: number | null = null;
  private adaptiveQualityInterval: number | null = null;

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.initializeOptimizationProfiles();
    this.initializeMemoryManager();
    this.initializeLODSystem();
    
    this.currentProfile = this.selectOptimalProfile();
    this.applyOptimizationProfile(this.currentProfile);
    
    this.performanceMetrics = this.initializePerformanceMetrics();
    this.startPerformanceMonitoring();
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    const gl = this.renderer.getContext() as WebGLRenderingContext;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    // Get device memory (Chrome only)
    const deviceMemory = (navigator as any).deviceMemory || 4;
    
    // Hardware concurrency
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    // WebGL capabilities
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
    
    // Check for WebGL2
    const webglVersion = this.renderer.capabilities.isWebGL2 ? 2 : 1;
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Performance heuristics
    const isLowEnd = deviceMemory <= 2 || 
                     hardwareConcurrency <= 2 || 
                     maxTextureSize < 4096 ||
                     (isMobile && deviceMemory <= 3);

    // Supported extensions
    const supportedExtensions = gl.getSupportedExtensions() || [];

    return {
      deviceMemory,
      hardwareConcurrency,
      maxTextureSize,
      webglVersion,
      renderer: renderer.toString(),
      vendor: vendor.toString(),
      isLowEnd,
      isMobile,
      supportedExtensions
    };
  }

  private initializeOptimizationProfiles(): void {
    // Ultra Performance Profile (Low-end devices)
    this.optimizationProfiles.set('ultra_performance', {
      name: 'Ultra Performance',
      description: 'Optimized for low-end devices and mobile',
      config: {
        targetFPS: 30,
        maxPolygons: 25000,
        enableLOD: true,
        enableInstancing: true,
        enableOcclusion: true,
        textureCompression: true,
        shadowQuality: 'off',
        antialiasing: false,
        enablePhysics: false,
        maxParticles: 100
      },
      targetDevices: ['mobile'],
      expectedFPS: 30
    });

    // Balanced Profile (Mid-range devices)
    this.optimizationProfiles.set('balanced', {
      name: 'Balanced',
      description: 'Good balance of quality and performance',
      config: {
        targetFPS: 45,
        maxPolygons: 50000,
        enableLOD: true,
        enableInstancing: true,
        enableOcclusion: true,
        textureCompression: true,
        shadowQuality: 'low',
        antialiasing: true,
        enablePhysics: false,
        maxParticles: 300
      },
      targetDevices: ['tablet', 'mobile'],
      expectedFPS: 45
    });

    // High Quality Profile (High-end devices)
    this.optimizationProfiles.set('high_quality', {
      name: 'High Quality',
      description: 'Maximum visual fidelity for powerful devices',
      config: {
        targetFPS: 60,
        maxPolygons: 100000,
        enableLOD: true,
        enableInstancing: true,
        enableOcclusion: true,
        textureCompression: false,
        shadowQuality: 'high',
        antialiasing: true,
        enablePhysics: true,
        maxParticles: 1000
      },
      targetDevices: ['desktop'],
      expectedFPS: 60
    });

    // Ultra Quality Profile (Enthusiast systems)
    this.optimizationProfiles.set('ultra_quality', {
      name: 'Ultra Quality',
      description: 'No compromises - for gaming rigs and workstations',
      config: {
        targetFPS: 60,
        maxPolygons: 200000,
        enableLOD: false,
        enableInstancing: true,
        enableOcclusion: true,
        textureCompression: false,
        shadowQuality: 'high',
        antialiasing: true,
        enablePhysics: true,
        maxParticles: 2000
      },
      targetDevices: ['desktop'],
      expectedFPS: 60
    });
  }

  private selectOptimalProfile(): OptimizationProfile {
    const caps = this.deviceCapabilities;
    
    // Ultra performance for low-end devices
    if (caps.isLowEnd || caps.deviceMemory <= 2) {
      return this.optimizationProfiles.get('ultra_performance')!;
    }
    
    // High quality for powerful desktop systems
    if (!caps.isMobile && caps.deviceMemory >= 8 && caps.hardwareConcurrency >= 8) {
      return this.optimizationProfiles.get('high_quality')!;
    }
    
    // Ultra quality for enthusiast systems
    if (!caps.isMobile && caps.deviceMemory >= 16 && caps.hardwareConcurrency >= 12) {
      return this.optimizationProfiles.get('ultra_quality')!;
    }
    
    // Balanced for everything else
    return this.optimizationProfiles.get('balanced')!;
  }

  private initializeMemoryManager(): void {
    const maxMemory = this.deviceCapabilities.deviceMemory * 1024 * 1024 * 1024; // Convert GB to bytes
    
    this.memoryManager = {
      maxTextureMemory: Math.floor(maxMemory * 0.3), // 30% for textures
      maxGeometryMemory: Math.floor(maxMemory * 0.2), // 20% for geometry
      textureCache: new Map(),
      geometryCache: new Map(),
      materialCache: new Map(),
      disposalQueue: []
    };
  }

  private initializeLODSystem(): void {
    this.lodConfiguration = {
      levels: [
        {
          name: 'high',
          maxDistance: 10,
          polygonReduction: 1.0,
          textureResolution: 1.0,
          enableShadows: true,
          enableReflections: true,
          particleCount: 1.0
        },
        {
          name: 'medium',
          maxDistance: 25,
          polygonReduction: 0.6,
          textureResolution: 0.5,
          enableShadows: true,
          enableReflections: false,
          particleCount: 0.6
        },
        {
          name: 'low',
          maxDistance: 50,
          polygonReduction: 0.3,
          textureResolution: 0.25,
          enableShadows: false,
          enableReflections: false,
          particleCount: 0.3
        },
        {
          name: 'minimal',
          maxDistance: Infinity,
          polygonReduction: 0.1,
          textureResolution: 0.1,
          enableShadows: false,
          enableReflections: false,
          particleCount: 0.1
        }
      ],
      transitionDistances: [10, 25, 50],
      enableInstancing: true,
      enableOcclusionCulling: true
    };
  }

  private applyOptimizationProfile(profile: OptimizationProfile): void {
    const config = profile.config;
    
    // Update renderer settings
    this.renderer.shadowMap.enabled = config.shadowQuality !== 'off';
    this.renderer.shadowMap.type = this.getShadowMapType(config.shadowQuality);
    
    // Set pixel ratio based on performance target
    const pixelRatio = config.targetFPS >= 60 ? Math.min(window.devicePixelRatio, 2) : 1;
    this.renderer.setPixelRatio(pixelRatio);
    
    // Configure rendering optimizations
    this.renderingOptimizations = {
      frustumCulling: true,
      occlusionCulling: config.enableOcclusion,
      instancedRendering: config.enableInstancing,
      batchedDrawCalls: true,
      geometryCompression: config.textureCompression,
      textureCompression: config.textureCompression,
      mipmapGeneration: true,
      anisotropicFiltering: !this.deviceCapabilities.isLowEnd
    };

    console.log(`Applied optimization profile: ${profile.name}`);
    console.log(`Target FPS: ${config.targetFPS}, Max Polygons: ${config.maxPolygons}`);
  }

  private getShadowMapType(quality: string): THREE.ShadowMapType {
    switch (quality) {
      case 'high':
        return THREE.PCFSoftShadowMap;
      case 'medium':
        return THREE.PCFShadowMap;
      case 'low':
        return THREE.BasicShadowMap;
      default:
        return THREE.BasicShadowMap;
    }
  }

  private initializePerformanceMetrics(): RenderingMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      drawCalls: 0,
      triangles: 0,
      loadTime: 0,
      interactionLatency: 0
    };
  }

  private startPerformanceMonitoring(): void {
    if (!this.monitoringEnabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let frameStartTime = performance.now();

    const updateMetrics = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - frameStartTime;
      
      // Update frame timing
      this.frameTimings.push(deltaTime);
      if (this.frameTimings.length > 60) {
        this.frameTimings.shift(); // Keep last 60 frames
      }

      // Calculate FPS
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.fps = frameCount;
        this.performanceMetrics.frameTime = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
        
        frameCount = 0;
        lastTime = currentTime;
        
        // Get renderer info
        const info = this.renderer.info;
        this.performanceMetrics.drawCalls = info.render.calls;
        this.performanceMetrics.triangles = info.render.triangles;
        
        // Memory usage (if available)
        if ((performance as any).memory) {
          this.performanceMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }

        // Adaptive quality adjustment
        if (this.adaptiveQualityEnabled) {
          this.adjustQualityBasedOnPerformance();
        }
      }

      frameStartTime = currentTime;
      
      if (this.monitoringEnabled) {
        requestAnimationFrame(updateMetrics);
      }
    };

    updateMetrics();
  }

  private adjustQualityBasedOnPerformance(): void {
    const targetFPS = this.currentProfile.config.targetFPS;
    const currentFPS = this.performanceMetrics.fps;
    const fpsRatio = currentFPS / targetFPS;

    // If performance is significantly below target, downgrade
    if (fpsRatio < 0.8 && this.currentProfile.name !== 'Ultra Performance') {
      this.downgradeQuality();
    }
    // If performance is significantly above target, upgrade
    else if (fpsRatio > 1.2 && this.currentProfile.name !== 'Ultra Quality') {
      this.upgradeQuality();
    }
  }

  private downgradeQuality(): void {
    const currentName = this.currentProfile.name;
    let nextProfile: OptimizationProfile | undefined;

    switch (currentName) {
      case 'Ultra Quality':
        nextProfile = this.optimizationProfiles.get('high_quality');
        break;
      case 'High Quality':
        nextProfile = this.optimizationProfiles.get('balanced');
        break;
      case 'Balanced':
        nextProfile = this.optimizationProfiles.get('ultra_performance');
        break;
    }

    if (nextProfile) {
      console.log(`Performance degraded, switching from ${currentName} to ${nextProfile.name}`);
      this.switchProfile(nextProfile);
    }
  }

  private upgradeQuality(): void {
    const currentName = this.currentProfile.name;
    let nextProfile: OptimizationProfile | undefined;

    switch (currentName) {
      case 'Ultra Performance':
        nextProfile = this.optimizationProfiles.get('balanced');
        break;
      case 'Balanced':
        nextProfile = this.optimizationProfiles.get('high_quality');
        break;
      case 'High Quality':
        nextProfile = this.optimizationProfiles.get('ultra_quality');
        break;
    }

    if (nextProfile) {
      console.log(`Performance improved, switching from ${currentName} to ${nextProfile.name}`);
      this.switchProfile(nextProfile);
    }
  }

  private switchProfile(profile: OptimizationProfile): void {
    this.currentProfile = profile;
    this.applyOptimizationProfile(profile);
    
    // Trigger LOD updates for existing objects
    this.updateAllLODObjects();
  }

  // LOD Management
  public createLODObject(
    originalGeometry: THREE.BufferGeometry,
    material: THREE.Material,
    objectId: string
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    this.lodConfiguration.levels.forEach((level, index) => {
      const geometry = this.createReducedGeometry(originalGeometry, level.polygonReduction);
      const lodMaterial = this.createLODMaterial(material, level);
      const mesh = new THREE.Mesh(geometry, lodMaterial);
      
      lod.addLevel(mesh, this.lodConfiguration.transitionDistances[index] || 0);
    });

    this.lodObjects.set(objectId, lod);
    return lod;
  }

  private createReducedGeometry(
    original: THREE.BufferGeometry,
    reductionFactor: number
  ): THREE.BufferGeometry {
    if (reductionFactor >= 1.0) {
      return original.clone();
    }

    // Simplified geometry reduction
    // In a real implementation, you would use a proper mesh decimation algorithm
    const positionAttribute = original.getAttribute('position');
    const originalVertices = positionAttribute.array.length / 3;
    const targetVertices = Math.floor(originalVertices * reductionFactor);
    
    // Simple vertex skipping (not ideal for real use)
    const step = Math.floor(originalVertices / targetVertices);
    const reducedVertices: number[] = [];
    
    for (let i = 0; i < originalVertices; i += step) {
      const index = i * 3;
      if (index + 2 < positionAttribute.array.length) {
        reducedVertices.push(
          positionAttribute.array[index],
          positionAttribute.array[index + 1],
          positionAttribute.array[index + 2]
        );
      }
    }
    
    const reducedGeometry = new THREE.BufferGeometry();
    reducedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(reducedVertices, 3));
    reducedGeometry.computeVertexNormals();
    
    return reducedGeometry;
  }

  private createLODMaterial(
    originalMaterial: THREE.Material,
    level: LODLevel
  ): THREE.Material {
    const lodMaterial = originalMaterial.clone();
    
    if (lodMaterial instanceof THREE.MeshStandardMaterial) {
      // Adjust texture resolution
      if (lodMaterial.map && level.textureResolution < 1.0) {
        const originalTexture = lodMaterial.map;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = Math.floor(originalTexture.image.width * level.textureResolution);
        canvas.height = Math.floor(originalTexture.image.height * level.textureResolution);
        
        ctx.drawImage(originalTexture.image, 0, 0, canvas.width, canvas.height);
        
        const reducedTexture = new THREE.CanvasTexture(canvas);
        lodMaterial.map = reducedTexture;
      }
      
      // Disable expensive features for lower LODs
      if (!level.enableReflections) {
        lodMaterial.envMap = null;
      }
    }
    
    return lodMaterial;
  }

  private updateAllLODObjects(): void {
    this.lodObjects.forEach(lod => {
      lod.update(this.camera);
    });
  }

  // Memory Management
  public optimizeInventoryVisualization(visualizations: InventoryVisualization[]): void {
    // Sort by distance from camera for culling
    const cameraPosition = this.camera.position;
    const sortedVisualizations = visualizations.sort((a, b) => {
      const distanceA = a.model.position.distanceTo(cameraPosition);
      const distanceB = b.model.position.distanceTo(cameraPosition);
      return distanceA - distanceB;
    });

    // Apply LOD based on current profile
    const maxObjects = this.calculateMaxVisibleObjects();
    
    sortedVisualizations.forEach((viz, index) => {
      const distance = viz.model.position.distanceTo(cameraPosition);
      
      if (index >= maxObjects || distance > 100) {
        // Cull distant objects
        viz.model.visible = false;
      } else {
        viz.model.visible = true;
        
        // Apply LOD if enabled
        if (this.currentProfile.config.enableLOD && this.lodObjects.has(viz.item.id)) {
          const lodObject = this.lodObjects.get(viz.item.id)!;
          lodObject.update(this.camera);
        }
      }
    });
  }

  private calculateMaxVisibleObjects(): number {
    const config = this.currentProfile.config;
    const baseMax = Math.floor(config.maxPolygons / 500); // Assume ~500 polys per object
    
    // Adjust based on current performance
    const performanceMultiplier = Math.min(this.performanceMetrics.fps / config.targetFPS, 1.5);
    
    return Math.floor(baseMax * performanceMultiplier);
  }

  public cleanupMemory(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds

    // Process disposal queue
    this.memoryManager.disposalQueue = this.memoryManager.disposalQueue.filter(item => {
      if (now - item.timestamp > maxAge) {
        if (item.object.dispose) {
          item.object.dispose();
        }
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });

    // Clear unused cached resources
    this.cleanupTextureCache();
    this.cleanupGeometryCache();
    this.cleanupMaterialCache();
  }

  private cleanupTextureCache(): void {
    // Implement texture cache cleanup logic
    // Remove textures that haven't been used recently
  }

  private cleanupGeometryCache(): void {
    // Implement geometry cache cleanup logic
    // Remove geometries that haven't been used recently
  }

  private cleanupMaterialCache(): void {
    // Implement material cache cleanup logic
    // Remove materials that haven't been used recently
  }

  // Public API
  public getCurrentProfile(): OptimizationProfile {
    return this.currentProfile;
  }

  public getPerformanceMetrics(): RenderingMetrics {
    return { ...this.performanceMetrics };
  }

  public getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  public setProfile(profileName: string): boolean {
    const profile = this.optimizationProfiles.get(profileName);
    if (!profile) {
      console.warn(`Optimization profile not found: ${profileName}`);
      return false;
    }

    this.switchProfile(profile);
    return true;
  }

  public enableAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
    console.log(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
  }

  public getAvailableProfiles(): OptimizationProfile[] {
    return Array.from(this.optimizationProfiles.values());
  }

  public dispose(): void {
    this.monitoringEnabled = false;
    
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
    }
    
    if (this.adaptiveQualityInterval) {
      clearInterval(this.adaptiveQualityInterval);
    }

    // Dispose LOD objects
    this.lodObjects.forEach(lod => {
      lod.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
    this.lodObjects.clear();

    // Clean up caches
    this.memoryManager.textureCache.forEach(texture => texture.dispose());
    this.memoryManager.geometryCache.forEach(geometry => geometry.dispose());
    this.memoryManager.materialCache.forEach(material => material.dispose());

    console.log('Performance optimizer disposed');
  }
}

export default PerformanceOptimizer;