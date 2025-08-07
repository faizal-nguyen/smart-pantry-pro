import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/hooks/useAIAssistant';
import { MessageItem } from './MessageItem';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { StopCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onCancelStreaming?: () => void;
}

export function MessageList({ 
  messages, 
  isStreaming,
  onCancelStreaming 
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages or streaming content
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isStreaming]);

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
      <div className="py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isStreamingMessage = isLastMessage && isStreaming && message.role === 'assistant';

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                ref={isLastMessage ? lastMessageRef : null}
              >
                <MessageItem 
                  message={message}
                  isStreaming={isStreamingMessage}
                />
                
                {isStreamingMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 mt-2"
                  >
                    <StreamingIndicator />
                    {onCancelStreaming && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancelStreaming}
                        className="text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Arrêter
                      </Button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}