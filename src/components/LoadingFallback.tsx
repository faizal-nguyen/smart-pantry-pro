import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  message?: string;
}

/**
 * Loading fallback component for React.lazy Suspense
 */
export function LoadingFallback({ message = 'Chargement...' }: LoadingFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

export default LoadingFallback;
