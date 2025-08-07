import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Mic, 
  MicOff, 
  Camera, 
  Keyboard,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface InputAreaProps {
  onSubmit: (text: string) => void;
  onModeChange: (mode: 'text' | 'voice' | 'visual') => void;
  onVoiceToggle: () => void;
  inputMode: 'text' | 'voice' | 'visual';
  isListening: boolean;
  isLoading: boolean;
  hasVoiceSupport: boolean;
}

export const InputArea = forwardRef<HTMLTextAreaElement, InputAreaProps>(
  ({ 
    onSubmit, 
    onModeChange, 
    onVoiceToggle,
    inputMode, 
    isListening, 
    isLoading,
    hasVoiceSupport 
  }, ref) => {
    const [text, setText] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle text submission
    const handleSubmit = () => {
      if (text.trim() && !isLoading) {
        onSubmit(text.trim());
        setText('');
      }
    };

    // Handle Enter key (shift+enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    };

    // Handle image upload
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('L\'image est trop volumineuse (max 5MB)');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onSubmit('Analyse cette image', 'visual', { imageData: base64 });
        };
        reader.readAsDataURL(file);
      }
    };

    // Voice recording animation
    const pulseAnimation = {
      scale: [1, 1.2, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    };

    return (
      <div className="border-t p-4 space-y-3">
        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={inputMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('text')}
              className="h-7 px-2"
            >
              <Keyboard className="h-4 w-4" />
              <span className="ml-1 text-xs">Texte</span>
            </Button>
            
            {hasVoiceSupport && (
              <Button
                variant={inputMode === 'voice' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('voice')}
                className="h-7 px-2"
              >
                <Mic className="h-4 w-4" />
                <span className="ml-1 text-xs">Voix</span>
              </Button>
            )}
            
            <Button
              variant={inputMode === 'visual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('visual')}
              className="h-7 px-2"
            >
              <Camera className="h-4 w-4" />
              <span className="ml-1 text-xs">Photo</span>
            </Button>
          </div>

          {inputMode === 'voice' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isListening ? (
                <>
                  <motion.div
                    animate={pulseAnimation}
                    className="h-2 w-2 bg-red-500 rounded-full"
                  />
                  <span>Écoute en cours...</span>
                </>
              ) : (
                <span>Appuyez pour parler</span>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <AnimatePresence mode="wait">
          {inputMode === 'text' && (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2"
            >
              <Textarea
                ref={ref}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Demandez-moi une recette, des conseils..."
                className="resize-none min-h-[60px] max-h-[120px]"
                disabled={isLoading}
              />
              
              <Button
                onClick={handleSubmit}
                disabled={!text.trim() || isLoading}
                size="icon"
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          )}

          {inputMode === 'voice' && (
            <motion.div
              key="voice-input"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-center py-4"
            >
              <Button
                onClick={onVoiceToggle}
                disabled={isLoading}
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className={cn(
                  "rounded-full h-20 w-20 transition-all",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </motion.div>
          )}

          {inputMode === 'visual' && (
            <motion.div
              key="visual-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Camera className="h-5 w-5" />
                Prendre une photo
              </Button>
              
              <p className="text-xs text-muted-foreground mt-2">
                Photographiez votre frigo, un plat ou un ticket de caisse
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character count for text mode */}
        {inputMode === 'text' && text.length > 0 && (
          <div className="text-xs text-muted-foreground text-right">
            {text.length}/1000 caractères
          </div>
        )}
      </div>
    );
  }
);

InputArea.displayName = 'InputArea';