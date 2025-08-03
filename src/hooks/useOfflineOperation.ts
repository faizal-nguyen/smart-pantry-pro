import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore, OfflineActionTypes } from '@/store/appStore';
import { useConnectionStatus } from './useConnectionStatus';

interface OfflineOperationOptions {
  optimistic?: boolean;
  retryOnError?: boolean;
  showToast?: boolean;
}

export const useOfflineOperation = () => {
  const { isOnline } = useConnectionStatus();
  const { addOfflineAction } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    fallbackAction: {
      type: keyof typeof OfflineActionTypes;
      data: any;
    },
    options: OfflineOperationOptions = {}
  ): Promise<T | null> => {
    const { optimistic = true, retryOnError = true, showToast = true } = options;

    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      if (isOnline) {
        // Try online operation first
        const result = await operation();
        setIsLoading(false);
        return result;
      } else {
        // Queue for offline sync
        addOfflineAction(fallbackAction);
        
        if (showToast) {
          // Show offline notification via toast
          // This would typically be handled by the calling component
        }
        
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      console.error('Operation failed:', error);
      
      if (retryOnError && !isOnline) {
        // Queue for retry when back online
        addOfflineAction(fallbackAction);
      }
      
      setIsLoading(false);
      throw error;
    }
  }, [isOnline, addOfflineAction]);

  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    executeOperation,
    cancelOperation,
    isLoading,
    isOnline,
  };
};