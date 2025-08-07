import React from 'react';
import { Message } from '@/hooks/useAIAssistant';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Bot, Mic, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const timestamp = format(new Date(message.timestamp), 'HH:mm', { locale: fr });

  // Get mode icon
  const getModeIcon = () => {
    switch (message.mode) {
      case 'voice':
        return <Mic className="h-3 w-3" />;
      case 'visual':
        return <ImageIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {isUser ? (
          <>
            <AvatarImage src="/avatar-placeholder.png" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        isUser && "items-end"
      )}>
        {/* Metadata */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isUser && "flex-row-reverse"
        )}>
          <span>{isUser ? 'Vous' : 'Assistant'}</span>
          {getModeIcon()}
          <span>{timestamp}</span>
          {message.metadata?.confidence && (
            <span className="text-xs">
              ({Math.round(message.metadata.confidence * 100)}% sûr)
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2 break-words",
            isUser ? (
              "bg-primary text-primary-foreground rounded-tr-sm"
            ) : (
              "bg-muted rounded-tl-sm"
            ),
            isStreaming && "animate-pulse"
          )}
        >
          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Custom renderers for recipe formatting
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mt-4 mb-2 flex items-center gap-2">
                      {children}
                    </h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1 my-2">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Voice/Image Metadata */}
        {message.metadata?.audioUrl && (
          <audio
            src={message.metadata.audioUrl}
            controls
            className="mt-2 h-8"
          />
        )}
        
        {message.metadata?.imageUrl && (
          <img
            src={message.metadata.imageUrl}
            alt="Image jointe"
            className="mt-2 rounded-lg max-w-xs"
          />
        )}
      </div>
    </div>
  );
}