// Analytics tracking for smart input functionality

interface Analytics {
  track: (event: string, properties?: Record<string, any>) => void;
}

// Mock analytics implementation - replace with your actual analytics service
const analytics: Analytics = {
  track: (event: string, properties = {}) => {
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Analytics: ${event}`, properties);
    }
    
    // In production, send to your analytics service
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    if (typeof window !== 'undefined') {
      // Google Analytics 4 example
      if (window.gtag) {
        window.gtag('event', event, properties);
      }
      
      // Custom analytics implementation
      if (window.smartPantryAnalytics) {
        window.smartPantryAnalytics.track(event, properties);
      }
    }
  }
};

export const trackSmartInput = {
  // Text input analytics
  textPasted: (length: number) => {
    analytics.track('smart_input_text_pasted', { 
      character_count: length,
      timestamp: new Date().toISOString()
    });
  },
  
  textTyped: (length: number) => {
    analytics.track('smart_input_text_typed', { 
      character_count: length,
      timestamp: new Date().toISOString()
    });
  },
  
  templateUsed: (templateName: string, itemCount: number) => {
    analytics.track('smart_input_template_used', {
      template_name: templateName,
      item_count: itemCount,
      timestamp: new Date().toISOString()
    });
  },
  
  // Voice input analytics
  voiceRecorded: (duration: number) => {
    analytics.track('smart_input_voice_recorded', { 
      duration_seconds: duration,
      timestamp: new Date().toISOString()
    });
  },
  
  voiceTranscriptionSuccess: (transcriptionLength: number, duration: number) => {
    analytics.track('smart_input_voice_transcription_success', {
      transcription_length: transcriptionLength,
      recording_duration: duration,
      timestamp: new Date().toISOString()
    });
  },
  
  voiceTranscriptionError: (error: string, duration: number) => {
    analytics.track('smart_input_voice_transcription_error', {
      error_type: error,
      recording_duration: duration,
      timestamp: new Date().toISOString()
    });
  },
  
  // Parsing analytics
  itemsParsed: (data: {
    method: 'text' | 'voice';
    itemCount: number;
    successRate: number;
    averageConfidence: number;
    processingTime?: number;
  }) => {
    analytics.track('smart_input_items_parsed', {
      ...data,
      timestamp: new Date().toISOString()
    });
  },
  
  parsingError: (method: 'text' | 'voice', error: string, inputLength: number) => {
    analytics.track('smart_input_parsing_error', {
      method,
      error_type: error,
      input_length: inputLength,
      timestamp: new Date().toISOString()
    });
  },
  
  // Item management analytics
  itemEdited: (field: string, originalValue: any, newValue: any) => {
    analytics.track('smart_input_item_edited', {
      field,
      original_value: originalValue,
      new_value: newValue,
      timestamp: new Date().toISOString()
    });
  },
  
  itemRemoved: (itemName: string, confidence: number) => {
    analytics.track('smart_input_item_removed', {
      item_name: itemName,
      confidence,
      timestamp: new Date().toISOString()
    });
  },
  
  itemsConfirmed: (itemCount: number, method: 'text' | 'voice') => {
    analytics.track('smart_input_items_confirmed', {
      item_count: itemCount,
      method,
      timestamp: new Date().toISOString()
    });
  },
  
  // UI interaction analytics
  tabSwitched: (from: 'text' | 'voice', to: 'text' | 'voice') => {
    analytics.track('smart_input_tab_switched', {
      from,
      to,
      timestamp: new Date().toISOString()
    });
  },
  
  advancedOptionsToggled: (isShown: boolean) => {
    analytics.track('smart_input_advanced_options_toggled', {
      is_shown: isShown,
      timestamp: new Date().toISOString()
    });
  },
  
  // Performance analytics
  performanceMetric: (metric: {
    action: string;
    duration: number;
    success: boolean;
    itemCount?: number;
  }) => {
    analytics.track('smart_input_performance', {
      ...metric,
      timestamp: new Date().toISOString()
    });
  },
  
  // Error tracking
  error: (context: string, error: string, additionalData?: Record<string, any>) => {
    analytics.track('smart_input_error', {
      context,
      error,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
  }
};

// Global analytics interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    smartPantryAnalytics?: Analytics;
  }
}

export default trackSmartInput;