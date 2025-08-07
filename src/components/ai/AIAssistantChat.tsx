import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ChatHeader } from './ChatHeader';
import { SuggestedActions } from './SuggestedActions';
import { ExpiryAlertBanner } from './ExpiryAlertBanner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AIAssistantChatProps {
  className?: string;
  defaultMode?: 'minimized' | 'expanded';
  onClose?: () => void;
}

export function AIAssistantChat({ 
  className, 
  defaultMode = 'expanded',
  onClose 
}: AIAssistantChatProps) {
  const {
    messages,
    isLoading,
    isListening,
    isStreaming,
    error,
    inputMode,
    sendMessage,
    startListening,
    stopListening,
    cancelStreaming,
    clearMessages,
    setInputMode,
    hasVoiceSupport
  } = useAIAssistant();

  const [isExpanded, setIsExpanded] = useState(defaultMode === 'expanded');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle suggested actions
  const handleSuggestedAction = (action: string) => {
    sendMessage(action);
    setShowSuggestions(false);
  };

  // Handle input submission
  const handleSubmit = (text: string) => {
    if (text.trim()) {
      sendMessage(text, inputMode);
      setShowSuggestions(false);
    }
  };

  // Handle voice input
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle mode change
  const handleModeChange = (mode: 'text' | 'voice' | 'visual') => {
    setInputMode(mode);
    if (mode === 'voice' && !isListening) {
      startListening();
    } else if (mode !== 'voice' && isListening) {
      stopListening();
    }
  };

  // Calculate if there are expiry alerts
  const hasExpiryAlerts = messages.some(msg => 
    msg.metadata?.expiryAlerts && msg.metadata.expiryAlerts.length > 0
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex flex-col bg-background rounded-lg shadow-xl border",
          isExpanded ? "h-[600px] w-full max-w-2xl" : "h-16 w-80",
          className
        )}
      >
        <Card className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <ChatHeader
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            onClose={onClose}
            onClearMessages={clearMessages}
            messageCount={messages.length}
          />

          {isExpanded && (
            <>
              {/* Expiry Alerts Banner */}
              {hasExpiryAlerts && (
                <ExpiryAlertBanner
                  alerts={messages[messages.length - 1]?.metadata?.expiryAlerts || []}
                />
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                {messages.length === 0 && showSuggestions ? (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center space-y-6"
                    >
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          Bonjour ! Je suis votre assistant culinaire 👨‍🍳
                        </h3>
                        <p className="text-muted-foreground">
                          Je peux vous aider à cuisiner, gérer votre inventaire et éviter le gaspillage.
                        </p>
                      </div>

                      <SuggestedActions
                        onActionClick={handleSuggestedAction}
                      />
                    </motion.div>
                  </div>
                ) : (
                  <MessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    onCancelStreaming={cancelStreaming}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-destructive/10 border-t border-destructive/20"
                >
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              {/* Loading Indicator */}
              {isLoading && !isStreaming && (
                <div className="px-4 py-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>L'assistant réfléchit...</span>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <InputArea
                ref={inputRef}
                onSubmit={handleSubmit}
                onModeChange={handleModeChange}
                onVoiceToggle={handleVoiceToggle}
                inputMode={inputMode}
                isListening={isListening}
                isLoading={isLoading || isStreaming}
                hasVoiceSupport={hasVoiceSupport}
              />
            </>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}