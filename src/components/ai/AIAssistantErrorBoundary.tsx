import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AIAssistantErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Assistant error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Oops ! Une erreur s'est produite
              </h3>
              <p className="text-muted-foreground mb-4">
                L'assistant AI a rencontré un problème inattendu.
              </p>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}