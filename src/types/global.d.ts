export {};

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
      captureMessage: (message: string, level?: string) => void;
    };
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    SpeechGrammarList?: any;
    webkitSpeechGrammarList?: any;
  }
}

// Extend NodeJS types
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NEXT_PUBLIC_OPENAI_API_KEY: string;
    OPENAI_API_KEY: string;
    JWT_SECRET: string;
    NEXT_PUBLIC_APP_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}