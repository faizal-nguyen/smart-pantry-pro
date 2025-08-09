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
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { useShoppingList } from "@/hooks/useShoppingList";
import MessageDisplay from "@/components/MessageDisplay";
import { SocialImportCard } from "@/components/social/SocialImportCard";
import { VideoImportCard } from "@/components/social/VideoImportCard";
import { useNavigate } from "react-router-dom";

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
  const [showVideoImport, setShowVideoImport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { inventory } = useInventory();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">Assistant Chef</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showVideoImport ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVideoImport(!showVideoImport)}
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Import Vidéo</span>
              {showVideoImport && <Sparkles className="w-3 h-3 text-yellow-400" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
            >
              <Home className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

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

        {/* Import Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">
              {showVideoImport ? 'Import Vidéo Intelligent' : 'Import de Recettes'}
            </h2>
            {showVideoImport && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Nouveau
              </Badge>
            )}
          </div>
          
          {/* Toggle between standard and video import */}
          {showVideoImport ? (
            <VideoImportCard 
              onImport={(recipe) => {
                toast({
                  title: "Recette extraite de la vidéo !",
                  description: `"${recipe.name}" a été analysée avec succès.`
                });
                // Add the recipe to conversation context
                const newMessage: Message = {
                  id: Date.now().toString(),
                  type: 'assistant',
                  content: `🎥 **${recipe.name}** extraite depuis une vidéo !\n\n⏱️ **Temps total**: ${recipe.totalTime} min\n👥 **Portions**: ${recipe.servings}\n🍳 **Difficulté**: ${recipe.difficulty}\n\n**Ingrédients:**\n${recipe.ingredients.map(ing => `• ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`).join('\n')}\n\n**Instructions:**\n${recipe.instructions.map((inst) => `${inst.step}. ${inst.text}`).join('\n')}\n\n${recipe.videoUrl ? `📹 [Voir la vidéo originale](${recipe.videoUrl})` : ''}\n\nVoulez-vous que je vous aide à préparer cette recette ou à ajouter les ingrédients manquants à votre liste de courses ?`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
              }}
            />
          ) : (
            <SocialImportCard 
              variant="default"
              onImport={(recipe) => {
                toast({
                  title: "Recette importée !",
                  description: `"${recipe.title}" a été ajoutée avec succès.`
                });
                // Add the recipe to conversation context
                const newMessage: Message = {
                  id: Date.now().toString(),
                  type: 'assistant',
                  content: `📍 **${recipe.title}** importée depuis ${recipe.platform}!\n\n⏱️ **Temps**: ${recipe.prepTime}\n👥 **Portions**: ${recipe.servings}\n\n**Ingrédients:**\n${recipe.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n**Instructions:**\n${recipe.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}\n\nVoulez-vous que je vous aide à préparer cette recette ou à ajouter les ingrédients manquants à votre liste de courses ?`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
              }}
            />
          )}
        </div>

      {/* Chat Area */}
      <Card className="h-[60vh] overflow-hidden">
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <MessageDisplay
                  key={message.id}
                  type={message.type}
                  content={message.content}
                  timestamp={message.timestamp}
                  inventoryCount={message.inventoryCount}
                  onAddToShoppingList={message.type === 'assistant' ? addToShoppingList : undefined}
                />
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
    </div>
  );
};

export default RecipeAssistant;