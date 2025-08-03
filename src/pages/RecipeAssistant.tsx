import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  ChefHat, 
  Loader2, 
  ShoppingCart, 
  Trash2,
  Package,
  Bot,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  inventoryCount?: number;
}

interface ConversationHistory {
  id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

const RecipeAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { inventory } = useInventory();

  useEffect(() => {
    // Load conversation history
    loadConversationHistory();
    
    // Add welcome message
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: `👋 Bonjour ! Je suis votre assistant culinaire.\n\nJe peux vous aider à :\n• Suggérer des recettes avec vos ingrédients actuels\n• Calculer les ingrédients manquants\n• Donner des conseils de cuisine\n• Créer des listes de courses\n\nVous avez actuellement **${inventory.length} produits** en stock. Que souhaitez-vous cuisiner aujourd'hui ?`,
      timestamp: new Date()
    }]);
  }, [inventory.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversationHistory(data || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await supabase.functions.invoke('recipe-assistant', {
        body: {
          message: userMessage.content,
          userId: user.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        inventoryCount: response.data.inventoryCount
      };

      setMessages(prev => [...prev, assistantMessage]);
      loadConversationHistory(); // Refresh history

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ Désolé, je rencontre un problème technique. Veuillez réessayer.\n\nErreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de contacter l'assistant. Vérifiez votre connexion."
      });
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('recipe_conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setMessages([{
        id: 'welcome-clear',
        type: 'assistant',
        content: `Conversation effacée ! Comment puis-je vous aider aujourd'hui ?`,
        timestamp: new Date()
      }]);
      
      setConversationHistory([]);
      
      toast({
        title: "Conversation effacée",
        description: "L'historique a été supprimé avec succès."
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'effacer la conversation."
      });
    }
  };

  const extractMissingIngredients = (message: string): string[] => {
    // Extract ingredients from AI response (simple pattern matching)
    const lines = message.split('\n');
    const missingLine = lines.find(line => 
      line.includes('❌') || 
      line.toLowerCase().includes('manquant') ||
      line.toLowerCase().includes('à acheter')
    );
    
    if (!missingLine) return [];
    
    // Extract ingredients from the line (basic parsing)
    const ingredients = missingLine
      .replace(/❌|Ingrédients manquants|à acheter|:/gi, '')
      .split(',')
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0);
    
    return ingredients;
  };

  const addToShoppingList = async (ingredients: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // For each ingredient, try to find matching product or create new one
      for (const ingredient of ingredients) {
        // This is a simplified implementation
        // In reality, you'd want more sophisticated ingredient parsing
        await supabase
          .from('shopping_list')
          .insert({
            user_id: user.id,
            product_id: 'temp', // Would need product matching logic
            quantity: 1
          });
      }

      toast({
        title: "Ajouté à la liste de courses",
        description: `${ingredients.length} ingrédient(s) ajouté(s) à votre liste.`
      });
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter à la liste de courses."
      });
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="p-4 space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            Assistant Recettes
            <Badge variant="secondary" className="ml-auto">
              <Package className="w-3 h-3 mr-1" />
              {inventory.length} produits
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Area */}
      <Card className="h-[60vh]">
        <CardContent className="p-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.type === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-xs opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.inventoryCount !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {message.inventoryCount} produits analysés
                        </Badge>
                      )}
                    </div>
                    
                    <div className="whitespace-pre-line text-sm">
                      {message.content}
                    </div>

                    {/* Extract missing ingredients for shopping list */}
                    {message.type === 'assistant' && message.content.includes('❌') && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const ingredients = extractMissingIngredients(message.content);
                            if (ingredients.length > 0) {
                              addToShoppingList(ingredients);
                            }
                          }}
                          className="text-xs"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Ajouter à ma liste de courses
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">L'assistant réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Demandez-moi ce que vous pouvez cuisiner avec vos ingrédients..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button 
              onClick={clearConversation}
              variant="outline"
              size="icon"
              title="Effacer la conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Exemples : "Que puis-je cuisiner avec ce que j'ai ?", "Suggère-moi une recette rapide", "J'ai envie de pâtes"
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      {conversationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversations récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {conversationHistory.slice(0, 5).map((conv) => (
                  <div key={conv.id} className="text-xs space-y-1">
                    <div className="font-medium truncate">
                      Q: {conv.user_message}
                    </div>
                    <div className="text-muted-foreground truncate">
                      R: {conv.ai_response.substring(0, 100)}...
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecipeAssistant;