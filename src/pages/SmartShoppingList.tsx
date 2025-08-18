import { useState } from "react";
import Layout from "@/components/Layout";
// import InStoreShopping from "@/components/shopping/InStoreShopping";
import { ShoppingListErrorBoundary } from "@/components/shopping/ShoppingListErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  Store, 
  Settings, 
  Users,
  MapPin,
  Mic,
  Phone,
  Info
} from "lucide-react";
import ShoppingList from "./ShoppingList";
import StoreLayoutManager from "@/components/shopping/StoreLayoutManager";
// import { useShoppingListRealtime } from "@/hooks/useShoppingListRealtime";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const SmartShoppingList = () => {
  const [activeTab, setActiveTab] = useState("planning");
  // const { connectedUsers, shoppingList } = useShoppingListRealtime();
  const connectedUsers = []; // Temporairement désactivé
  const [showInStoreMode, setShowInStoreMode] = useState(false);
  const { toast } = useToast();

  // Features flags pour activer progressivement les fonctionnalités
  const features = {
    voiceControl: true,
    realTimeSync: true,
    hapticFeedback: true,
    storeLayouts: true
  };

  // Mode magasin temporairement désactivé - nécessite intégration complète
  // if (showInStoreMode) {
  //   return (
  //     <Layout>
  //       <ShoppingListErrorBoundary>
  //         <InStoreShopping onExit={() => setShowInStoreMode(false)} />
  //       </ShoppingListErrorBoundary>
  //     </Layout>
  //   );
  // }

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-20">
        {/* Header avec statut en temps réel */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Liste de courses intelligente</h1>
            <p className="text-sm text-muted-foreground">
              Optimisée pour vos courses en magasin
            </p>
          </div>
          
          {features.realTimeSync && connectedUsers.length > 1 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Badge variant="secondary">
                {connectedUsers.length} en ligne
              </Badge>
            </div>
          )}
        </div>

        {/* Alerte fonctionnalités */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Améliorations disponibles !</strong> Organisation intelligente par rayons, 
            configuration personnalisée des magasins et recherche avancée.
          </AlertDescription>
        </Alert>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => {
                  toast({
                    title: "Mode Magasin",
                    description: "Cette fonctionnalité arrive bientôt ! En attendant, utilisez la liste de courses améliorée ci-dessous."
                  });
                }}
                className="h-auto flex flex-col gap-2 py-4"
                variant="default"
              >
                <Store className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Mode Magasin</div>
                  <div className="text-xs opacity-90">
                    Interface optimisée pour faire vos courses
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs mt-1">Bientôt</Badge>
              </Button>
              
              <Button 
                onClick={() => setActiveTab("store-config")}
                className="h-auto flex flex-col gap-2 py-4"
                variant="outline"
              >
                <Settings className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Configuration</div>
                  <div className="text-xs text-muted-foreground">
                    Personnaliser les rayons
                  </div>
                </div>
              </Button>
            </div>

            {/* Fonctionnalités disponibles */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {features.voiceControl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Mic className="w-4 h-4 text-green-500" />
                  <span>Commandes vocales</span>
                </motion.div>
              )}
              
              {features.hapticFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span>Retour haptique</span>
                </motion.div>
              )}
              
              {features.realTimeSync && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Synchronisation temps réel</span>
                </motion.div>
              )}
              
              {features.storeLayouts && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Organisation par rayons</span>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs pour basculer entre les vues */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planning">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Planification
            </TabsTrigger>
            <TabsTrigger value="store-config">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="mt-4">
            <ShoppingListErrorBoundary>
              <ShoppingList />
            </ShoppingListErrorBoundary>
          </TabsContent>

          <TabsContent value="store-config" className="mt-4">
            <ShoppingListErrorBoundary>
              <StoreLayoutManager />
            </ShoppingListErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SmartShoppingList;