/**
 * Color Extractor Service
 * Platform-specific color extraction from images
 */

import { Platform } from '@/lib/utils';

export interface ExtractorOptions {
  platform: 'web' | 'ios' | 'android';
  quality: 'low' | 'medium' | 'high';
  fallback: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ColorResult {
  dominant: string;
  vibrant?: string;
  muted?: string;
  darkVibrant?: string;
  lightVibrant?: string;
  darkMuted?: string;
  lightMuted?: string;
  palette?: string[];
}

export class ColorExtractor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }
  
  /**
   * Route external URLs through proxy to avoid CORS issues
   */
  private getProxiedImageUrl(imageUrl: string): string {
    // Si c'est une data URL ou une URL locale, pas besoin de proxy
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('/') || imageUrl.includes('localhost')) {
      return imageUrl;
    }
    
    // Pour les URLs externes, utiliser le proxy
    const proxyBaseUrl = '/api/proxy/image';
    
    return `${proxyBaseUrl}?url=${encodeURIComponent(imageUrl)}`;
  }
  
  /**
   * Extract dominant color from image
   */
  async extractFromImage(
    imageUrl: string,
    options: Partial<ExtractorOptions> = {}
  ): Promise<string> {
    const opts = {
      platform: options.platform || 'web',
      quality: options.quality || 'medium',
      fallback: options.fallback || '#2DD4BF',
      region: options.region,
    };
    
    try {
      switch (opts.platform) {
        case 'web':
          return await this.extractWeb(imageUrl, opts);
        case 'ios':
        case 'android':
          // In React Native, this would use react-native-image-colors
          // For now, we'll use web extraction as fallback
          return await this.extractWeb(imageUrl, opts);
        default:
          return opts.fallback;
      }
    } catch (error) {
      console.error('Color extraction failed:', error);
      return opts.fallback;
    }
  }
  
  /**
   * Web-based color extraction using Canvas API
   */
  private async extractWeb(
    imageUrl: string,
    options: ExtractorOptions
  ): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available');
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Set canvas size based on quality
          const sampleSize = this.getSampleSize(options.quality);
          const { width, height } = this.getScaledDimensions(
            img.width,
            img.height,
            sampleSize
          );
          
          this.canvas!.width = width;
          this.canvas!.height = height;
          
          // Draw image to canvas
          this.ctx!.drawImage(img, 0, 0, width, height);
          
          // Extract region if specified
          const region = options.region || {
            x: 0,
            y: 0,
            width: width,
            height: height,
          };
          
          // Get image data
          const imageData = this.ctx!.getImageData(
            region.x,
            region.y,
            region.width,
            region.height
          );
          
          // Extract dominant color
          const dominantColor = this.getDominantColor(imageData);
          resolve(dominantColor);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = this.getProxiedImageUrl(imageUrl);
    });
  }
  
  /**
   * Get sample size based on quality setting
   */
  private getSampleSize(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'low':
        return 10;
      case 'medium':
        return 50;
      case 'high':
        return 100;
      default:
        return 50;
    }
  }
  
  /**
   * Calculate scaled dimensions while maintaining aspect ratio
   */
  private getScaledDimensions(
    originalWidth: number,
    originalHeight: number,
    maxSize: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      return {
        width: Math.min(originalWidth, maxSize),
        height: Math.min(originalWidth, maxSize) / aspectRatio,
      };
    } else {
      return {
        width: Math.min(originalHeight, maxSize) * aspectRatio,
        height: Math.min(originalHeight, maxSize),
      };
    }
  }
  
  /**
   * Extract dominant color from image data using color quantization
   */
  private getDominantColor(imageData: ImageData): string {
    const pixels = imageData.data;
    const pixelCount = pixels.length / 4;
    
    // Simple color quantization
    const colorMap = new Map<string, number>();
    const step = 4; // Sample every 4th pixel for performance
    
    for (let i = 0; i < pixels.length; i += 4 * step) {
      const r = Math.round(pixels[i] / 16) * 16; // Quantize to 16 levels
      const g = Math.round(pixels[i + 1] / 16) * 16;
      const b = Math.round(pixels[i + 2] / 16) * 16;
      const a = pixels[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      const color = `${r},${g},${b}`;
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    }
    
    // Find most frequent color
    let maxCount = 0;
    let dominantColor = '0,0,0';
    
    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }
    
    // Convert to hex
    const [r, g, b] = dominantColor.split(',').map(Number);
    return this.rgbToHex(r, g, b);
  }
  
  /**
   * Extract color palette using k-means clustering
   */
  async extractPalette(
    imageUrl: string,
    colorCount: number = 5,
    options: Partial<ExtractorOptions> = {}
  ): Promise<ColorResult> {
    // This is a simplified implementation
    // In production, use a proper color quantization library
    const dominant = await this.extractFromImage(imageUrl, options);
    
    return {
      dominant,
      palette: [dominant], // Simplified - would include k-means results
    };
  }
  
  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * Check if color is suitable for UI (not too dark/light)
   */
  isColorSuitable(hexColor: string): boolean {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return false;
    
    // Calculate relative luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    // Color should not be too dark or too light
    return luminance > 0.2 && luminance < 0.8;
  }
  
  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
  
  /**
   * Enhance color for food context (boost saturation)
   */
  enhanceForFood(hexColor: string): string {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return hexColor;
    
    // Convert to HSL
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // Boost saturation for food appeal
    hsl.s = Math.min(hsl.s * 1.2, 100);
    
    // Convert back to RGB then hex
    const enhancedRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return this.rgbToHex(enhancedRgb.r, enhancedRgb.g, enhancedRgb.b);
  }
  
  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(
    r: number,
    g: number,
    b: number
  ): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }
  
  /**
   * Convert HSL to RGB
   */
  private hslToRgb(
    h: number,
    s: number,
    l: number
  ): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }
}

export default ColorExtractor;
