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
  User,
  ArrowLeft,
  Home,
  Video,
  Sparkles,
  Mic,
  Keyboard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import MessageDisplay from "@/components/MessageDisplay";
import { SocialImportCard } from "@/components/social/SocialImportCard";
import { InstagramVideoExtractor } from "@/components/recipes/InstagramVideoExtractor";
import { ProactiveSuggestions } from "@/components/assistant/ProactiveSuggestions";
import { ConversationModes, ConversationMode, MODES } from "@/components/assistant/ConversationModes";
import { MessageBubble } from "@/components/assistant/MessageBubble";
import { QuickActions, QuickAction } from "@/components/assistant/QuickActions";
import { VoiceInput } from "@/components/assistant/VoiceInput";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  inventoryCount?: number;
  actions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
  metadata?: {
    mode?: string;
    confidence?: number;
    processingTime?: number;
  };
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
  const [showVideoImport, setShowVideoImport] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [selectedMode, setSelectedMode] = useState<ConversationMode['id'] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const navigate = useNavigate();

  useEffect(() => {
    // Load conversation history
    loadConversationHistory();
    
    // Add welcome message with context
    const greeting = getGreeting();
    const inventoryStatus = getInventoryStatus();
    
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: `${greeting} ! Je suis votre Chef Assistant personnel.\n\n${inventoryStatus}\n\nComment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date(),
      metadata: {
        mode: 'greeting',
        confidence: 1
      }
    }]);
  }, [inventory.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌅 Bonjour";
    if (hour < 18) return "☀️ Bon après-midi";
    return "🌙 Bonsoir";
  };

  const getInventoryStatus = () => {
    const expiringCount = inventory.filter(item => {
      if (!item.expiry_date) return false;
      const daysUntilExpiry = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 3;
    }).length;

    const lowStockCount = inventory.filter(item => 
      item.quantity <= (item.min_quantity || 1)
    ).length;

    let status = `📦 Vous avez **${inventory.length} produits** en stock`;
    
    if (expiringCount > 0) {
      status += `\n⚠️ **${expiringCount} produit${expiringCount > 1 ? 's' : ''} expire${expiringCount > 1 ? 'nt' : ''} bientôt**`;
    }
    
    if (lowStockCount > 0) {
      status += `\n📉 **${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} en stock faible**`;
    }
    
    return status;
  };

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

  const sendMessage = async (messageContent: string = input) => {
    if (!messageContent.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setShowSuggestions(false);

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
        inventoryCount: response.data.inventoryCount,
        metadata: {
          mode: selectedMode || 'general',
          confidence: response.data.confidence || 0.95,
          processingTime: response.data.processingTime
        },
        actions: generateMessageActions(response.data.response)
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

  const { addToShoppingList: addItemToShoppingList } = useShoppingList();

  const addToShoppingList = async (ingredients: string[]) => {
    try {
      let successCount = 0;
      
      for (const ingredient of ingredients) {
        // Parse ingredient string (e.g., "2 oeufs" or "200g de farine")
        const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s*(?:de\s+)?(.+)$/);
        
        let productName = ingredient;
        let quantity = 1;
        let unit = 'unité';
        
        if (match) {
          quantity = parseFloat(match[1]);
          unit = match[2] || 'unité';
          productName = match[3];
        }
        
        try {
          await addItemToShoppingList({
            productName,
            quantity,
            unit,
            category: getCategoryForIngredient(productName),
            storeSection: getStoreSectionForIngredient(productName)
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to add ${productName}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Ajouté à la liste de courses",
          description: `${successCount} ingrédient(s) ajouté(s) à votre liste.`
        });
      }
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter à la liste de courses."
      });
    }
  };
  
  // Helper functions for categorizing ingredients
  const getCategoryForIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('tomate') || name.includes('carotte') || name.includes('oignon') || 
        name.includes('pomme') || name.includes('salade') || name.includes('légume') || 
        name.includes('fruit')) {
      return 'Fruits/Légumes';
    }
    if (name.includes('viande') || name.includes('poulet') || name.includes('boeuf') || 
        name.includes('porc')) {
      return 'Viandes';
    }
    if (name.includes('lait') || name.includes('fromage') || name.includes('yaourt') || 
        name.includes('beurre') || name.includes('crème')) {
      return 'Produits laitiers';
    }
    
    return 'Épicerie';
  };
  
  const getStoreSectionForIngredient = (ingredientName: string): string => {
    const category = getCategoryForIngredient(ingredientName);
    
    const sectionMap: Record<string, string> = {
      'Fruits/Légumes': 'Fruits & Légumes',
      'Viandes': 'Boucherie/Poissonnerie',
      'Produits laitiers': 'Frais/Produits laitiers',
      'Épicerie': 'Épicerie salée'
    };
    
    return sectionMap[category] || 'Épicerie salée';
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const generateMessageActions = (content: string): Message['actions'] => {
    const actions: Message['actions'] = [];
    
    // Detect if message contains recipe suggestions
    if (content.toLowerCase().includes('recette')) {
      actions.push({
        label: 'Voir les recettes',
        icon: <ChefHat className="w-4 h-4" />,
        onClick: () => navigate('/recipes')
      });
    }
    
    // Detect if message mentions shopping list
    if (content.toLowerCase().includes('courses') || content.toLowerCase().includes('acheter')) {
      actions.push({
        label: 'Liste de courses',
        icon: <ShoppingCart className="w-4 h-4" />,
        onClick: () => navigate('/shopping')
      });
    }
    
    return actions;
  };

  const handleModeSelect = (mode: ConversationMode) => {
    setSelectedMode(mode.id);
    sendMessage(mode.prompt);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleSuggestionClick = (suggestion: any) => {
    sendMessage(suggestion.message);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header avec contexte */}
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Chef Assistant</h3>
                  <p className="text-xs text-gray-500">
                    {getGreeting()} • {inventory.length} produits en stock
                  </p>
                </div>
              </div>
              
              {/* Mode Switcher */}
              <div className="flex items-center gap-2">
                <Button
                  variant={inputMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('text')}
                >
                  <Keyboard className="w-4 h-4" />
                </Button>
                <Button
                  variant={inputMode === 'voice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('voice')}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3">
              <QuickActions onActionClick={handleQuickAction} />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Conversation Modes */}
            {messages.length === 1 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Choisissez un mode</h3>
                <ConversationModes
                  selectedMode={selectedMode}
                  onModeSelect={handleModeSelect}
                />
              </div>
            )}
            
            {/* Proactive Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div className="p-4">
                <ProactiveSuggestions onSuggestionClick={handleSuggestionClick} />
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message, i) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isAI={message.type === 'assistant'}
                      animated={true}
                    />
                  ))}
                </AnimatePresence>
                
                {/* Typing Indicator */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <Card className="p-3 bg-muted/50 border-muted">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">L'assistant réfléchit...</span>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
              {inputMode === 'text' ? (
                <div className="space-y-2">
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
                      placeholder="Demandez-moi n'importe quoi sur la cuisine..."
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => sendMessage()} 
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
                  
                  {/* Context-aware suggestions */}
                  {input.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Suggestions:</span>
                      {['avec mes ingrédients', 'rapide', 'pour ce soir', 'végétarien'].map(suggestion => (
                        <Button
                          key={suggestion}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setInput(prev => prev + ' ' + suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default RecipeAssistant;