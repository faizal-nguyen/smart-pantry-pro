/**
 * Seasonal Theme System
 * Dynamic seasonal environments for 3D pantry visualization
 * Based on PRP-026-Inventory-Visualization specification
 */

import * as THREE from 'three';
import {
  Season,
  SeasonalTheme,
  SeasonalTransitionSet,
  LightingConfig,
  ParticleEffectConfig,
  DecorativeElement
} from './types/PantryTypes';

export interface SeasonalTransitionConfig {
  duration: number; // in milliseconds
  easing: 'linear' | 'easeInOut' | 'spring';
  enableSounds: boolean;
  enableParticles: boolean;
  enableLightingChanges: boolean;
  enableDecorationSwap: boolean;
}

export interface SeasonalEnvironmentState {
  currentSeason: Season;
  transitionProgress: number;
  isTransitioning: boolean;
  activeParticleSystem?: THREE.Points;
  activeDecorations: THREE.Object3D[];
  currentLighting: LightingConfig;
  ambientSounds: HTMLAudioElement[];
}

export interface ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial | THREE.ShaderMaterial;
  points: THREE.Points;
  velocities: Float32Array;
  lifetimes: Float32Array;
  config: ParticleEffectConfig;
}

export class SeasonalThemeSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  private seasonalThemes: Map<Season, SeasonalTheme> = new Map();
  private currentEnvironmentState: SeasonalEnvironmentState;
  private particleSystems: Map<string, ParticleSystem> = new Map();
  
  private transitionTimer: number | null = null;
  private animationFrameId: number | null = null;
  
  // Resource managers
  private textureLoader: THREE.TextureLoader;
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  
  // Shader materials for advanced effects
  private shaderMaterials: Map<string, THREE.ShaderMaterial> = new Map();

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.textureLoader = new THREE.TextureLoader();
    
    this.initializeAudioContext();
    this.initializeSeasonalThemes();
    this.initializeShaders();
    
    // Initialize with current season
    const currentSeason = this.getCurrentSeason();
    this.currentEnvironmentState = {
      currentSeason,
      transitionProgress: 1.0,
      isTransitioning: false,
      activeDecorations: [],
      currentLighting: this.seasonalThemes.get(currentSeason)!.lighting,
      ambientSounds: []
    };
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private initializeSeasonalThemes(): void {
    // Spring Theme
    this.seasonalThemes.set('spring', {
      lighting: {
        ambientLight: { color: '#ffeaa7', intensity: 0.6 },
        directionalLight: {
          color: '#fff5b4',
          intensity: 1.3,
          position: new THREE.Vector3(10, 15, 5),
          shadows: true
        },
        spotLights: [
          {
            color: '#ffeb3b',
            intensity: 0.4,
            position: new THREE.Vector3(-5, 8, 8),
            target: new THREE.Vector3(0, 0, 0),
            angle: Math.PI / 6,
            penumbra: 0.3
          }
        ]
      },
      decorations: [
        'spring/fresh_flowers_pot.glb',
        'spring/light_curtains.glb',
        'spring/pastel_vase.glb',
        'spring/cherry_blossoms.glb',
        'spring/garden_herbs.glb'
      ],
      ambientSounds: [
        'sounds/spring/birds_chirping.mp3',
        'sounds/spring/gentle_breeze.mp3',
        'sounds/spring/wind_chimes.mp3'
      ],
      particleEffects: [
        {
          type: 'petals',
          count: 25,
          lifetime: 12,
          size: 0.08,
          velocity: new THREE.Vector3(0.1, -0.03, 0.08),
          gravity: -0.01,
          color: '#ffb3ba',
          opacity: 0.8,
          texture: 'particles/cherry_petal.png'
        },
        {
          type: 'dust',
          count: 40,
          lifetime: 15,
          size: 0.02,
          velocity: new THREE.Vector3(0.05, 0.02, 0.03),
          gravity: 0,
          color: '#f0f8c8',
          opacity: 0.4,
          texture: 'particles/dust_mote.png'
        }
      ],
      colorPalette: {
        primary: '#74b9ff',
        secondary: '#55efc4',
        accent: '#fd79a8',
        ambient: '#ffeaa7'
      }
    });

    // Summer Theme
    this.seasonalThemes.set('summer', {
      lighting: {
        ambientLight: { color: '#ffeaa7', intensity: 0.7 },
        directionalLight: {
          color: '#ffffff',
          intensity: 1.5,
          position: new THREE.Vector3(12, 20, 6),
          shadows: true
        },
        spotLights: [
          {
            color: '#ffeb3b',
            intensity: 0.6,
            position: new THREE.Vector3(8, 12, 10),
            target: new THREE.Vector3(0, 0, 0),
            angle: Math.PI / 4,
            penumbra: 0.2
          }
        ]
      },
      decorations: [
        'summer/vibrant_fruits.glb',
        'summer/tropical_plants.glb',
        'summer/beach_shells.glb',
        'summer/sun_catchers.glb',
        'summer/fresh_herbs.glb'
      ],
      ambientSounds: [
        'sounds/summer/crickets.mp3',
        'sounds/summer/distant_ocean.mp3',
        'sounds/summer/ice_cubes.mp3'
      ],
      particleEffects: [
        {
          type: 'sparkles',
          count: 35,
          lifetime: 8,
          size: 0.04,
          velocity: new THREE.Vector3(0, 0.15, 0),
          gravity: 0,
          color: '#fdcb6e',
          opacity: 0.9,
          texture: 'particles/sun_sparkle.png'
        },
        {
          type: 'steam',
          count: 15,
          lifetime: 6,
          size: 0.12,
          velocity: new THREE.Vector3(0.02, 0.2, 0.01),
          gravity: 0.01,
          color: '#ddd',
          opacity: 0.3,
          texture: 'particles/steam.png'
        }
      ],
      colorPalette: {
        primary: '#fd79a8',
        secondary: '#fdcb6e',
        accent: '#e17055',
        ambient: '#ffeaa7'
      }
    });

    // Autumn Theme
    this.seasonalThemes.set('autumn', {
      lighting: {
        ambientLight: { color: '#e17055', intensity: 0.4 },
        directionalLight: {
          color: '#d63031',
          intensity: 1.1,
          position: new THREE.Vector3(15, 12, 8),
          shadows: true
        },
        spotLights: [
          {
            color: '#e17055',
            intensity: 0.5,
            position: new THREE.Vector3(-8, 10, 6),
            target: new THREE.Vector3(2, 0, -2),
            angle: Math.PI / 5,
            penumbra: 0.4
          }
        ]
      },
      decorations: [
        'autumn/harvest_basket.glb',
        'autumn/maple_leaves.glb',
        'autumn/pumpkin_display.glb',
        'autumn/warm_candles.glb',
        'autumn/acorns_pinecones.glb'
      ],
      ambientSounds: [
        'sounds/autumn/rustling_leaves.mp3',
        'sounds/autumn/crackling_fire.mp3',
        'sounds/autumn/wind_howling.mp3'
      ],
      particleEffects: [
        {
          type: 'leaves',
          count: 50,
          lifetime: 18,
          size: 0.15,
          velocity: new THREE.Vector3(0.2, -0.08, 0.12),
          gravity: -0.025,
          color: '#e17055',
          opacity: 0.9,
          texture: 'particles/autumn_leaf.png'
        },
        {
          type: 'sparkles',
          count: 20,
          lifetime: 10,
          size: 0.06,
          velocity: new THREE.Vector3(0.05, 0.1, 0.03),
          gravity: 0,
          color: '#fdcb6e',
          opacity: 0.7,
          texture: 'particles/gold_dust.png'
        }
      ],
      colorPalette: {
        primary: '#e17055',
        secondary: '#d63031',
        accent: '#fdcb6e',
        ambient: '#fab1a0'
      }
    });

    // Winter Theme
    this.seasonalThemes.set('winter', {
      lighting: {
        ambientLight: { color: '#74b9ff', intensity: 0.3 },
        directionalLight: {
          color: '#ddd',
          intensity: 0.9,
          position: new THREE.Vector3(8, 15, 12),
          shadows: true
        },
        spotLights: [
          {
            color: '#ffffff',
            intensity: 0.7,
            position: new THREE.Vector3(-6, 8, 8),
            target: new THREE.Vector3(0, 0, 0),
            angle: Math.PI / 4,
            penumbra: 0.5
          }
        ]
      },
      decorations: [
        'winter/snow_globes.glb',
        'winter/evergreen_branches.glb',
        'winter/icicles.glb',
        'winter/warm_mittens.glb',
        'winter/hot_cocoa_mug.glb'
      ],
      ambientSounds: [
        'sounds/winter/gentle_snow.mp3',
        'sounds/winter/fireplace.mp3',
        'sounds/winter/wind_whistling.mp3'
      ],
      particleEffects: [
        {
          type: 'snow',
          count: 60,
          lifetime: 25,
          size: 0.04,
          velocity: new THREE.Vector3(0.08, -0.06, 0.04),
          gravity: -0.008,
          color: '#ffffff',
          opacity: 0.8,
          texture: 'particles/snowflake.png'
        },
        {
          type: 'sparkles',
          count: 30,
          lifetime: 12,
          size: 0.03,
          velocity: new THREE.Vector3(0.02, 0.05, 0.01),
          gravity: 0,
          color: '#74b9ff',
          opacity: 0.6,
          texture: 'particles/ice_crystal.png'
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

  private initializeShaders(): void {
    // Particle shader for enhanced effects
    const particleVertexShader = `
      attribute float size;
      attribute float lifetime;
      attribute float age;
      attribute vec3 velocity;
      
      uniform float time;
      uniform float pointSize;
      
      varying float vLifetimeRatio;
      varying vec3 vColor;
      
      void main() {
        vLifetimeRatio = age / lifetime;
        
        vec3 pos = position + velocity * time;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * pointSize * (1.0 - vLifetimeRatio * 0.5);
        
        vColor = vec3(1.0 - vLifetimeRatio * 0.3);
      }
    `;

    const particleFragmentShader = `
      uniform sampler2D map;
      uniform vec3 color;
      uniform float opacity;
      
      varying float vLifetimeRatio;
      varying vec3 vColor;
      
      void main() {
        vec4 texColor = texture2D(map, gl_PointCoord);
        
        float alpha = opacity * (1.0 - vLifetimeRatio) * texColor.a;
        gl_FragColor = vec4(color * vColor, alpha);
      }
    `;

    this.shaderMaterials.set('particle', new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        time: { value: 0 },
        pointSize: { value: 1 },
        map: { value: null },
        color: { value: new THREE.Color() },
        opacity: { value: 1 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));

    // Environmental fog shader
    const fogVertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fogFragmentShader = `
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      uniform float time;
      
      varying vec3 vWorldPosition;
      
      void main() {
        float depth = length(vWorldPosition - cameraPosition);
        float fogFactor = smoothstep(fogNear, fogFar, depth);
        
        // Add seasonal variation to fog
        vec3 seasonalFog = fogColor + sin(time * 0.001) * 0.1;
        
        gl_FragColor = vec4(seasonalFog, fogFactor);
      }
    `;

    this.shaderMaterials.set('fog', new THREE.ShaderMaterial({
      vertexShader: fogVertexShader,
      fragmentShader: fogFragmentShader,
      uniforms: {
        fogColor: { value: new THREE.Color() },
        fogNear: { value: 10 },
        fogFar: { value: 50 },
        time: { value: 0 }
      },
      transparent: true,
      depthWrite: false
    }));
  }

  public async transitionToSeason(
    targetSeason: Season, 
    config: Partial<SeasonalTransitionConfig> = {}
  ): Promise<void> {
    if (this.currentEnvironmentState.currentSeason === targetSeason) {
      return; // Already in target season
    }

    if (this.currentEnvironmentState.isTransitioning) {
      console.warn('Seasonal transition already in progress');
      return;
    }

    const fullConfig: SeasonalTransitionConfig = {
      duration: 5000, // 5 seconds
      easing: 'easeInOut',
      enableSounds: true,
      enableParticles: true,
      enableLightingChanges: true,
      enableDecorationSwap: true,
      ...config
    };

    const targetTheme = this.seasonalThemes.get(targetSeason);
    if (!targetTheme) {
      throw new Error(`Season theme not found: ${targetSeason}`);
    }

    this.currentEnvironmentState.isTransitioning = true;
    this.currentEnvironmentState.transitionProgress = 0;

    try {
      await this.performSeasonalTransition(targetSeason, targetTheme, fullConfig);
      
      this.currentEnvironmentState.currentSeason = targetSeason;
      this.currentEnvironmentState.isTransitioning = false;
      this.currentEnvironmentState.transitionProgress = 1;
      
      console.log(`Successfully transitioned to ${targetSeason} theme`);
    } catch (error) {
      console.error('Seasonal transition failed:', error);
      this.currentEnvironmentState.isTransitioning = false;
      this.currentEnvironmentState.transitionProgress = 0;
      throw error;
    }
  }

  private async performSeasonalTransition(
    targetSeason: Season,
    targetTheme: SeasonalTheme,
    config: SeasonalTransitionConfig
  ): Promise<void> {
    const startTime = Date.now();
    const sourceTheme = this.seasonalThemes.get(this.currentEnvironmentState.currentSeason)!;

    // Start ambient sound transition
    if (config.enableSounds) {
      await this.transitionAmbientSounds(sourceTheme.ambientSounds, targetTheme.ambientSounds);
    }

    // Animated transition loop
    return new Promise((resolve) => {
      const animateTransition = () => {
        const elapsed = Date.now() - startTime;
        const rawProgress = elapsed / config.duration;
        
        // Apply easing
        let progress = this.applyEasing(rawProgress, config.easing);
        progress = Math.min(progress, 1);
        
        this.currentEnvironmentState.transitionProgress = progress;

        // Update lighting
        if (config.enableLightingChanges) {
          this.interpolateLighting(sourceTheme.lighting, targetTheme.lighting, progress);
        }

        // Update particles
        if (config.enableParticles) {
          this.transitionParticleEffects(
            sourceTheme.particleEffects,
            targetTheme.particleEffects,
            progress
          );
        }

        // Update decorations
        if (config.enableDecorationSwap && progress > 0.5) {
          this.swapDecorations(sourceTheme.decorations, targetTheme.decorations, progress);
        }

        // Update scene fog
        this.updateSeasonalFog(targetTheme.colorPalette.ambient, progress);

        if (progress >= 1) {
          this.finalizeSeasonalTransition(targetTheme);
          resolve();
        } else {
          this.animationFrameId = requestAnimationFrame(animateTransition);
        }
      };

      animateTransition();
    });
  }

  private applyEasing(t: number, type: string): number {
    switch (type) {
      case 'linear':
        return t;
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'spring':
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      default:
        return t;
    }
  }

  private interpolateLighting(
    source: LightingConfig,
    target: LightingConfig,
    progress: number
  ): void {
    // Find and update ambient light
    this.scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight) {
        const sourceColor = new THREE.Color(source.ambientLight.color);
        const targetColor = new THREE.Color(target.ambientLight.color);
        
        object.color.copy(sourceColor.lerp(targetColor, progress));
        object.intensity = THREE.MathUtils.lerp(
          source.ambientLight.intensity,
          target.ambientLight.intensity,
          progress
        );
      }
      
      if (object instanceof THREE.DirectionalLight) {
        const sourceColor = new THREE.Color(source.directionalLight.color);
        const targetColor = new THREE.Color(target.directionalLight.color);
        
        object.color.copy(sourceColor.lerp(targetColor, progress));
        object.intensity = THREE.MathUtils.lerp(
          source.directionalLight.intensity,
          target.directionalLight.intensity,
          progress
        );
        
        // Animate position
        object.position.lerpVectors(
          source.directionalLight.position,
          target.directionalLight.position,
          progress
        );
      }
    });
  }

  private async transitionParticleEffects(
    sourceEffects: ParticleEffectConfig[],
    targetEffects: ParticleEffectConfig[],
    progress: number
  ): Promise<void> {
    // Fade out old particle systems
    sourceEffects.forEach((effect, index) => {
      const systemKey = `${this.currentEnvironmentState.currentSeason}_${index}`;
      const system = this.particleSystems.get(systemKey);
      
      if (system && system.material) {
        const material = system.material as THREE.PointsMaterial;
        material.opacity = (1 - progress) * effect.opacity;
        
        if (progress >= 0.8) {
          // Remove old system
          this.scene.remove(system.points);
          this.particleSystems.delete(systemKey);
        }
      }
    });

    // Fade in new particle systems
    if (progress >= 0.2) {
      targetEffects.forEach(async (effect, index) => {
        const systemKey = `temp_transition_${index}`;
        let system = this.particleSystems.get(systemKey);
        
        if (!system) {
          system = await this.createParticleSystem(effect);
          this.particleSystems.set(systemKey, system);
          this.scene.add(system.points);
        }
        
        if (system.material) {
          const material = system.material as THREE.PointsMaterial;
          material.opacity = (progress - 0.2) / 0.8 * effect.opacity;
        }
      });
    }
  }

  private async createParticleSystem(config: ParticleEffectConfig): Promise<ParticleSystem> {
    const particles = config.count;
    const geometry = new THREE.BufferGeometry();
    
    // Positions
    const positions = new Float32Array(particles * 3);
    const velocities = new Float32Array(particles * 3);
    const lifetimes = new Float32Array(particles);
    const sizes = new Float32Array(particles);
    const ages = new Float32Array(particles);
    
    for (let i = 0; i < particles; i++) {
      const i3 = i * 3;
      
      // Random positions within a sphere
      const radius = Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Velocities
      velocities[i3] = config.velocity.x + (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = config.velocity.y + (Math.random() - 0.5) * 0.1;
      velocities[i3 + 2] = config.velocity.z + (Math.random() - 0.5) * 0.1;
      
      // Lifetimes and ages
      lifetimes[i] = config.lifetime + (Math.random() - 0.5) * config.lifetime * 0.3;
      ages[i] = Math.random() * lifetimes[i];
      sizes[i] = config.size + (Math.random() - 0.5) * config.size * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    
    // Load texture
    let material: THREE.PointsMaterial | THREE.ShaderMaterial;
    
    if (config.texture) {
      const texture = await this.loadTexture(config.texture);
      
      if (this.shaderMaterials.has('particle')) {
        material = this.shaderMaterials.get('particle')!.clone();
        material.uniforms.map.value = texture;
        material.uniforms.color.value = new THREE.Color(config.color);
        material.uniforms.opacity.value = config.opacity;
      } else {
        material = new THREE.PointsMaterial({
          map: texture,
          color: config.color,
          size: config.size,
          transparent: true,
          opacity: config.opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
      }
    } else {
      material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: true,
        opacity: config.opacity
      });
    }
    
    const points = new THREE.Points(geometry, material);
    
    return {
      geometry,
      material,
      points,
      velocities,
      lifetimes,
      config
    };
  }

  private swapDecorations(
    sourceDecorations: string[],
    targetDecorations: string[],
    progress: number
  ): void {
    // This is a simplified version - in a real implementation,
    // you would load the actual 3D models and position them appropriately
    
    if (progress > 0.5) {
      // Remove old decorations
      this.currentEnvironmentState.activeDecorations.forEach(decoration => {
        decoration.visible = false;
        // In real implementation: this.scene.remove(decoration);
      });
      
      // Add new decorations (placeholder)
      console.log(`Swapping to ${targetDecorations.length} new seasonal decorations`);
      // In real implementation: load and add new 3D models
    }
  }

  private updateSeasonalFog(ambientColor: string, progress: number): void {
    if (this.scene.fog instanceof THREE.Fog) {
      const targetColor = new THREE.Color(ambientColor);
      const currentColor = new THREE.Color(this.scene.fog.color);
      
      this.scene.fog.color.copy(currentColor.lerp(targetColor, progress));
    }
  }

  private async transitionAmbientSounds(
    sourceSounds: string[],
    targetSounds: string[]
  ): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Fade out current sounds
      this.currentEnvironmentState.ambientSounds.forEach(audio => {
        const fadeOut = () => {
          if (audio.volume > 0.1) {
            audio.volume -= 0.1;
            setTimeout(fadeOut, 100);
          } else {
            audio.pause();
          }
        };
        fadeOut();
      });

      // Load and fade in new sounds
      const newAudioElements: HTMLAudioElement[] = [];
      
      for (const soundPath of targetSounds) {
        try {
          const audio = new Audio(soundPath);
          audio.loop = true;
          audio.volume = 0;
          
          await new Promise((resolve, reject) => {
            audio.oncanplaythrough = resolve;
            audio.onerror = reject;
            audio.load();
          });
          
          audio.play();
          
          // Fade in
          const fadeIn = () => {
            if (audio.volume < 0.3) {
              audio.volume += 0.05;
              setTimeout(fadeIn, 100);
            }
          };
          fadeIn();
          
          newAudioElements.push(audio);
        } catch (error) {
          console.warn(`Failed to load ambient sound: ${soundPath}`, error);
        }
      }
      
      this.currentEnvironmentState.ambientSounds = newAudioElements;
    } catch (error) {
      console.warn('Failed to transition ambient sounds:', error);
    }
  }

  private finalizeSeasonalTransition(targetTheme: SeasonalTheme): void {
    // Clean up temporary resources
    Array.from(this.particleSystems.keys()).forEach(key => {
      if (key.startsWith('temp_transition_')) {
        const newKey = key.replace('temp_transition_', `${this.currentEnvironmentState.currentSeason}_`);
        const system = this.particleSystems.get(key);
        if (system) {
          this.particleSystems.set(newKey, system);
          this.particleSystems.delete(key);
        }
      }
    });

    // Update current lighting config
    this.currentEnvironmentState.currentLighting = targetTheme.lighting;
    
    console.log('Seasonal transition finalized');
  }

  private async loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        resolve,
        undefined,
        reject
      );
    });
  }

  private getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  // Public API methods
  public getCurrentSeasonalState(): SeasonalEnvironmentState {
    return { ...this.currentEnvironmentState };
  }

  public async autoTransitionToCurrentSeason(): Promise<void> {
    const currentSeason = this.getCurrentSeason();
    if (currentSeason !== this.currentEnvironmentState.currentSeason) {
      await this.transitionToSeason(currentSeason);
    }
  }

  public enableSeasonalAutoTransition(intervalMinutes: number = 60): void {
    setInterval(() => {
      this.autoTransitionToCurrentSeason();
    }, intervalMinutes * 60 * 1000);
  }

  public updateParticleSystems(deltaTime: number): void {
    this.particleSystems.forEach(system => {
      if (system.material instanceof THREE.ShaderMaterial) {
        system.material.uniforms.time.value += deltaTime;
      }
      
      // Update particle positions and ages
      const positions = system.geometry.attributes.position.array as Float32Array;
      const ages = system.geometry.attributes.age.array as Float32Array;
      const lifetimes = system.geometry.attributes.lifetime.array as Float32Array;
      
      for (let i = 0; i < ages.length; i++) {
        ages[i] += deltaTime;
        
        if (ages[i] > lifetimes[i]) {
          // Reset particle
          ages[i] = 0;
          const i3 = i * 3;
          
          // Reset position
          const radius = Math.random() * 10;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          
          positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = radius * Math.cos(phi);
          positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        } else {
          // Update position based on velocity and physics
          const i3 = i * 3;
          positions[i3] += system.velocities[i3] * deltaTime;
          positions[i3 + 1] += system.velocities[i3 + 1] * deltaTime + system.config.gravity * deltaTime;
          positions[i3 + 2] += system.velocities[i3 + 2] * deltaTime;
        }
      }
      
      system.geometry.attributes.position.needsUpdate = true;
      system.geometry.attributes.age.needsUpdate = true;
    });
  }

  public dispose(): void {
    // Cancel any ongoing transitions
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Stop ambient sounds
    this.currentEnvironmentState.ambientSounds.forEach(audio => {
      audio.pause();
      audio.src = '';
    });

    // Dispose particle systems
    this.particleSystems.forEach(system => {
      system.geometry.dispose();
      if (system.material instanceof THREE.Material) {
        system.material.dispose();
      }
      this.scene.remove(system.points);
    });
    this.particleSystems.clear();

    // Dispose shader materials
    this.shaderMaterials.forEach(material => material.dispose());
    this.shaderMaterials.clear();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    console.log('Seasonal theme system disposed');
  }
}

export default SeasonalThemeSystem;