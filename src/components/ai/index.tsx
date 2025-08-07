/**
 * AI Assistant Components Export
 * Central export file for all AI assistant related components
 */

export { AIAssistantChat } from './AIAssistantChat';
export { AIAssistantErrorBoundary } from './ErrorBoundary';
export { MessageList } from './MessageList';
export { MessageItem } from './MessageItem';
export { InputArea } from './InputArea';
export { ChatHeader } from './ChatHeader';
export { SuggestedActions } from './SuggestedActions';
export { ExpiryAlertBanner } from './ExpiryAlertBanner';
export { StreamingIndicator } from './StreamingIndicator';

// Re-export types
export type { Message } from '@/hooks/useAIAssistant';