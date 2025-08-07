/**
 * Mobile Performance Optimization Utilities
 * Optimizations for camera, image processing, and general mobile performance
 */

import { debounce, throttle } from 'lodash';

/**
 * Device capability detection
 */
export const deviceCapabilities = {
  // Check if device is mobile
  isMobile: () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  },

  // Check if device is iOS
  isIOS: () => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  },

  // Check if device is Android
  isAndroid: () => {
    return /Android/i.test(navigator.userAgent);
  },

  // Check if device supports WebGL (for advanced image processing)
  hasWebGL: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  },

  // Get device memory (in GB)
  getDeviceMemory: () => {
    // @ts-ignore - navigator.deviceMemory might not be in types
    return navigator.deviceMemory || 4; // Default to 4GB if not available
  },

  // Check connection type
  getConnectionType: () => {
    // @ts-ignore - navigator.connection might not be in types
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.effectiveType || '4g';
  },

  // Check if device is in power save mode
  isPowerSaveMode: async () => {
    if ('getBattery' in navigator) {
      try {
        // @ts-ignore - Battery API
        const battery = await navigator.getBattery();
        return battery.level < 0.2; // Consider < 20% as power save threshold
      } catch {
        return false;
      }
    }
    return false;
  }
};

/**
 * Performance monitoring
 */
export const performanceMonitor = {
  // Measure function execution time
  measureTime: async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  // Monitor memory usage
  getMemoryInfo: () => {
    // @ts-ignore - performance.memory might not be in types
    if (performance.memory) {
      return {
        // @ts-ignore
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        // @ts-ignore
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        // @ts-ignore
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };
    }
    return null;
  }
};

/**
 * Image optimization utilities
 */
export const imageOptimizer = {
  // Compress image blob
  compressImage: async (
    blob: Blob,
    maxWidth: number = 1024,
    quality: number = 0.8
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Apply smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              console.log(`[Image] Compressed from ${(blob.size / 1024).toFixed(0)}KB to ${(compressedBlob.size / 1024).toFixed(0)}KB`);
              resolve(compressedBlob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  },

  // Create thumbnail
  createThumbnail: async (blob: Blob, size: number = 200): Promise<string> => {
    const compressed = await imageOptimizer.compressImage(blob, size, 0.7);
    return URL.createObjectURL(compressed);
  },

  // Lazy load images
  lazyLoadImage: (src: string, placeholder?: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(placeholder || '');
      img.src = src;
    });
  }
};

/**
 * Camera optimization utilities
 */
export const cameraOptimizer = {
  // Get optimal camera constraints based on device
  getOptimalConstraints: async () => {
    const memory = deviceCapabilities.getDeviceMemory();
    const connection = deviceCapabilities.getConnectionType();
    const isPowerSave = await deviceCapabilities.isPowerSaveMode();

    let constraints = {
      width: 1920,
      height: 1080,
      frameRate: 30
    };

    // Adjust based on device capabilities
    if (memory < 3 || connection === '3g' || connection === '2g' || isPowerSave) {
      constraints = {
        width: 1280,
        height: 720,
        frameRate: 15
      };
    } else if (memory < 4) {
      constraints = {
        width: 1280,
        height: 720,
        frameRate: 30
      };
    }

    return constraints;
  },

  // Apply iOS-specific fixes
  applyIOSCameraFixes: (videoElement: HTMLVideoElement) => {
    if (!deviceCapabilities.isIOS()) return;

    // iOS requires these attributes
    videoElement.setAttribute('autoplay', '');
    videoElement.setAttribute('muted', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    
    // Prevent iOS zoom
    videoElement.style.touchAction = 'none';
    
    // Fix orientation issues
    const handleOrientation = () => {
      const orientation = window.orientation || 0;
      videoElement.style.transform = `rotate(${-orientation}deg)`;
    };
    
    window.addEventListener('orientationchange', handleOrientation);
    handleOrientation();
  }
};

/**
 * Performance optimized hooks
 */
export const optimizedHooks = {
  // Debounced state update
  useDebouncedState: <T>(value: T, delay: number = 300) => {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
  },

  // Throttled callback
  useThrottledCallback: <T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
  ) => {
    return React.useCallback(throttle(callback, delay), [callback, delay]);
  },

  // Intersection observer for lazy loading
  useIntersectionObserver: (
    ref: React.RefObject<Element>,
    options?: IntersectionObserverInit
  ) => {
    const [isIntersecting, setIntersecting] = React.useState(false);

    React.useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        setIntersecting(entry.isIntersecting);
      }, options);

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, [ref, options]);

    return isIntersecting;
  }
};

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = 
  window.requestIdleCallback ||
  function (cb: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline);
    }, 1);
  };

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback = 
  window.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id);
  };

// Import React for hooks
import * as React from 'react';