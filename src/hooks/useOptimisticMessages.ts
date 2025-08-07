import { useState, useCallback, useRef } from 'react';
import { Message } from './useAIAssistant';

interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
  originalContent?: string;
}

export function useOptimisticMessages(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(initialMessages);
  const optimisticTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Add an optimistic message that will be confirmed or reverted
   */
  const addOptimisticMessage = useCallback((message: Message, timeout = 30000) => {
    const optimisticMessage: OptimisticMessage = {
      ...message,
      isOptimistic: true,
      originalContent: message.content
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Set timeout to auto-revert if not confirmed
    const timeoutId = setTimeout(() => {
      revertOptimisticMessage(message.id);
    }, timeout);

    optimisticTimeouts.current.set(message.id, timeoutId);

    return optimisticMessage.id;
  }, []);

  /**
   * Confirm an optimistic message
   */
  const confirmOptimisticMessage = useCallback((
    messageId: string, 
    finalContent?: string
  ) => {
    // Clear timeout
    const timeoutId = optimisticTimeouts.current.get(messageId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      optimisticTimeouts.current.delete(messageId);
    }

    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          isOptimistic: false,
          content: finalContent || msg.content,
          originalContent: undefined
        };
      }
      return msg;
    }));
  }, []);

  /**
   * Revert an optimistic message
   */
  const revertOptimisticMessage = useCallback((messageId: string) => {
    // Clear timeout
    const timeoutId = optimisticTimeouts.current.get(messageId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      optimisticTimeouts.current.delete(messageId);
    }

    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  /**
   * Update message content (for streaming)
   */
  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, content };
      }
      return msg;
    }));
  }, []);

  /**
   * Add error to message
   */
  const addMessageError = useCallback((messageId: string, error: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            error
          }
        };
      }
      return msg;
    }));
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    // Clear all timeouts
    optimisticTimeouts.current.forEach(timeout => clearTimeout(timeout));
    optimisticTimeouts.current.clear();
    
    setMessages([]);
  }, []);

  /**
   * Get messages with optimistic state
   */
  const getMessagesWithState = useCallback(() => {
    return messages.map(msg => ({
      ...msg,
      state: msg.isOptimistic ? 'pending' : 'confirmed'
    }));
  }, [messages]);

  return {
    messages,
    addOptimisticMessage,
    confirmOptimisticMessage,
    revertOptimisticMessage,
    updateMessageContent,
    addMessageError,
    clearMessages,
    getMessagesWithState
  };
}