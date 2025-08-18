import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Clock, ShoppingCart, ChefHat, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface MessageAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface MessageBubbleProps {
  message: {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: MessageAction[];
    metadata?: {
      mode?: string;
      confidence?: number;
      processingTime?: number;
    };
  };
  isAI: boolean;
  animated?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isAI,
  animated = true
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({
      title: "Copié !",
      description: "Le message a été copié dans le presse-papiers"
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderContent = () => {
    // Parse markdown-like content
    const lines = message.content.split('\n');
    return lines.map((line, index) => {
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={index} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      
      // Lists
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <li key={index} className="ml-4 mb-1 list-disc">
            {line.substring(2)}
          </li>
        );
      }
      
      // Regular text
      return line ? <p key={index} className="mb-1">{line}</p> : <br key={index} />;
    });
  };

  const animationProps = animated ? {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 300, damping: 20 }
  } : {};

  return (
    <motion.div
      {...animationProps}
      className={cn(
        "flex gap-3",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] space-y-2",
        !isAI && "items-end"
      )}>
        <Card className={cn(
          "p-4",
          isAI 
            ? "bg-muted/50 border-muted" 
            : "bg-primary text-primary-foreground border-primary"
        )}>
          <div className="space-y-2">
            <div className="text-sm">{renderContent()}</div>
            
            {/* Metadata */}
            {message.metadata && (
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-current/10">
                {message.metadata.mode && (
                  <span className="text-xs opacity-70">
                    Mode: {message.metadata.mode}
                  </span>
                )}
                {message.metadata.confidence && (
                  <span className="text-xs opacity-70">
                    Confiance: {Math.round(message.metadata.confidence * 100)}%
                  </span>
                )}
                {message.metadata.processingTime && (
                  <span className="text-xs opacity-70">
                    {message.metadata.processingTime}ms
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
        
        {/* Actions */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(message.timestamp)}</span>
          
          {isAI && (
            <>
              <span>•</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {copied ? "Copié" : "Copier"}
              </Button>
            </>
          )}
          
          {message.actions && (
            <>
              <span>•</span>
              {message.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={action.onClick}
                >
                  {action.icon}
                  <span className="ml-1">{action.label}</span>
                </Button>
              ))}
            </>
          )}
        </div>
      </div>
      
      {!isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      )}
    </motion.div>
  );
};