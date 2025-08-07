import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface CameraConstraints {
  video: {
    facingMode?: 'user' | 'environment' | { exact: 'environment' };
    width?: { ideal: number };
    height?: { ideal: number };
    aspectRatio?: { ideal: number };
  };
  audio: false;
}

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  resolution?: 'low' | 'medium' | 'high';
  batteryMode?: boolean;
}

export interface CameraState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isStreaming: boolean;
  isTakingPhoto: boolean;
  error: string | null;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
}

const RESOLUTION_PRESETS = {
  low: { width: 640, height: 480 },
  medium: { width: 1280, height: 720 },
  high: { width: 1920, height: 1080 }
};

export function useCamera(options: CameraOptions = {}) {
  const {
    facingMode = 'environment',
    resolution = 'medium',
    batteryMode = false
  } = options;

  const [state, setState] = useState<CameraState>({
    isSupported: false,
    isPermissionGranted: false,
    isStreaming: false,
    isTakingPhoto: false,
    error: null,
    devices: [],
    activeDeviceId: null
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check camera support
  useEffect(() => {
    const isSupported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.enumerateDevices
    );

    setState(prev => ({ ...prev, isSupported }));

    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Votre navigateur ne supporte pas l\'accès à la caméra'
      }));
    }
  }, []);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setState(prev => ({ ...prev, devices: videoDevices }));
      
      // Auto-select back camera on mobile
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setState(prev => ({ ...prev, activeDeviceId: backCamera.deviceId }));
      }
      
      return videoDevices;
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  }, []);

  // iOS Safari specific fixes
  const applyIOSFixes = useCallback((video: HTMLVideoElement) => {
    // iOS Safari requires specific attributes
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    
    // Prevent iOS zoom on double-tap
    video.style.touchAction = 'none';
    video.style.userSelect = 'none';
    video.style.webkitUserSelect = 'none';
    
    // Fix for iOS 15+ camera orientation
    if (window.orientation !== undefined) {
      const handleOrientationChange = () => {
        video.style.transform = `rotate(${-window.orientation}deg)`;
      };
      
      window.addEventListener('orientationchange', handleOrientationChange);
      return () => window.removeEventListener('orientationchange', handleOrientationChange);
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('La caméra n\'est pas supportée');
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Stop any existing stream
      if (streamRef.current) {
        stopCamera();
      }

      // Build constraints
      const constraints: CameraConstraints = {
        audio: false,
        video: {
          facingMode: facingMode === 'environment' ? { exact: 'environment' } : 'user',
          ...RESOLUTION_PRESETS[resolution]
        }
      };

      // Use specific device if selected
      if (state.activeDeviceId) {
        constraints.video = {
          deviceId: { exact: state.activeDeviceId },
          ...RESOLUTION_PRESETS[resolution]
        };
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Apply to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Apply iOS fixes
        const cleanup = applyIOSFixes(videoRef.current);
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(resolve).catch(console.error);
            };
          }
        });

        setState(prev => ({
          ...prev,
          isPermissionGranted: true,
          isStreaming: true
        }));

        // Get devices after permission granted
        await getDevices();

        // Battery optimization
        if (batteryMode) {
          applyBatteryOptimizations(stream);
        }

        return cleanup;
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      
      let errorMessage = 'Erreur lors de l\'accès à la caméra';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La caméra est déjà utilisée par une autre application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'La caméra ne supporte pas la résolution demandée.';
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false
      }));
      
      toast.error(errorMessage);
    }
  }, [state.isSupported, state.activeDeviceId, facingMode, resolution, batteryMode, applyIOSFixes, getDevices]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false
    }));
  }, []);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    const devices = state.devices;
    if (devices.length < 2) return;

    const currentIndex = devices.findIndex(d => d.deviceId === state.activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    setState(prev => ({ ...prev, activeDeviceId: nextDevice.deviceId }));
    
    if (state.isStreaming) {
      await startCamera();
    }
  }, [state.devices, state.activeDeviceId, state.isStreaming, startCamera]);

  // Take photo
  const takePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !state.isStreaming) {
      toast.error('La caméra n\'est pas active');
      return null;
    }

    setState(prev => ({ ...prev, isTakingPhoto: true }));

    try {
      // Create canvas if not exists
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Add capture effect
      addCaptureEffect();

      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create image'));
            }
          },
          'image/jpeg',
          0.9 // Quality
        );
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Erreur lors de la capture');
      return null;
    } finally {
      setState(prev => ({ ...prev, isTakingPhoto: false }));
    }
  }, [state.isStreaming]);

  // Battery optimizations
  const applyBatteryOptimizations = useCallback((stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();

    // Apply constraints for battery saving
    videoTrack.applyConstraints({
      frameRate: { ideal: 15, max: 30 }, // Reduce frame rate
      width: { ideal: 1280 },
      height: { ideal: 720 },
      ...(capabilities.torch && { torch: false }), // Disable torch
      ...(capabilities.zoom && { zoom: settings.zoom || 1 }) // Reset zoom
    }).catch(console.error);

    // Reduce power consumption on mobile
    if ('powerEfficient' in capabilities) {
      videoTrack.applyConstraints({
        // @ts-ignore - powerEfficient might not be in types yet
        powerEfficient: true
      }).catch(console.error);
    }
  }, []);

  // Visual capture effect
  const addCaptureEffect = useCallback(() => {
    if (!videoRef.current) return;

    // Flash effect
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = '0';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.3s';

    document.body.appendChild(flash);

    // Trigger flash
    requestAnimationFrame(() => {
      flash.style.opacity = '0.8';
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(flash);
        }, 300);
      }, 100);
    });

    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // State
    ...state,
    
    // Refs
    videoRef,
    
    // Actions
    startCamera,
    stopCamera,
    switchCamera,
    takePhoto,
    getDevices,
    
    // Helpers
    hasMultipleCameras: state.devices.length > 1,
    isReady: state.isSupported && state.isPermissionGranted && state.isStreaming
  };
}