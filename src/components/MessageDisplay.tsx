import React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Bot, User } from "lucide-react";

interface MessageDisplayProps {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  inventoryCount?: number;
  onAddToShoppingList?: (ingredients: string[]) => void;
}

interface IngredientItem {
  name: string;
  quantity?: string;
  unit?: string;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  type,
  content,
  timestamp,
  inventoryCount,
  onAddToShoppingList
}) => {
  // Extract missing ingredients from structured content
  const extractMissingIngredients = (message: string): IngredientItem[] => {
    const ingredients: IngredientItem[] = [];
    
    // Split by lines and look for missing ingredients section
    const lines = message.split('\n');
    let inMissingSection = false;
    
    for (const line of lines) {
      // Check if we're in the missing ingredients section
      if (line.includes('❌') && line.toLowerCase().includes('manquant')) {
        inMissingSection = true;
        continue;
      }
      
      // Check if we've left the missing section
      if (inMissingSection && (line.includes('📝') || line.includes('✅') || line.trim() === '')) {
        inMissingSection = false;
        continue;
      }
      
      // Extract ingredients if we're in the missing section
      if (inMissingSection && line.trim()) {
        // Parse lines like "- 2 oeufs" or "• 200g de farine"
        const match = line.match(/^[\-•]\s*(\d+(?:\.\d+)?)\s*(\w+)?\s*(?:de\s+)?(.+)$/);
        if (match) {
          ingredients.push({
            quantity: match[1],
            unit: match[2] || '',
            name: match[3].trim()
          });
        } else {
          // Simple format without quantity
          const simpleName = line.replace(/^[\-•]\s*/, '').trim();
          if (simpleName) {
            ingredients.push({ name: simpleName });
          }
        }
      }
    }
    
    return ingredients;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const missingIngredients = type === 'assistant' ? extractMissingIngredients(content) : [];
  const hasMissingIngredients = missingIngredients.length > 0;

  return (
    <div className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        type === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {type === 'user' ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
          <span className="text-xs opacity-70">
            {formatTimestamp(timestamp)}
          </span>
          {inventoryCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              {inventoryCount} produits analysés
            </Badge>
          )}
        </div>
        
        {/* Use ReactMarkdown for better formatting */}
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              // Custom renderers for better display
              h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              p: ({ children }) => <p className="my-1">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Add to shopping list button for missing ingredients */}
        {hasMissingIngredients && onAddToShoppingList && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const ingredientNames = missingIngredients.map(ing => 
                  ing.quantity && ing.unit 
                    ? `${ing.quantity} ${ing.unit} ${ing.name}`
                    : ing.name
                );
                onAddToShoppingList(ingredientNames);
              }}
              className="text-xs"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Ajouter {missingIngredients.length} ingrédient{missingIngredients.length > 1 ? 's' : ''} manquant{missingIngredients.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageDisplay;