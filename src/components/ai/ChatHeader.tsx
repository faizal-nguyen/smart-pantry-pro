import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Minimize2, 
  Maximize2, 
  X, 
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface ChatHeaderProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose?: () => void;
  onClearMessages: () => void;
  messageCount: number;
}

export function ChatHeader({ 
  isExpanded, 
  onToggleExpand, 
  onClose,
  onClearMessages,
  messageCount 
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Assistant Culinaire</h3>
          {messageCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {messageCount} messages
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isExpanded && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClearMessages}>
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer la conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">
                  Powered by GPT-4
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          className="h-8 w-8"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}