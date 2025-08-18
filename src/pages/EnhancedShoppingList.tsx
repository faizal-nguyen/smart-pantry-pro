import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Plus, 
  Share2, 
  Store,
  Settings,
  Users,
  Zap,
  Filter,
  Search,
  CheckCircle2,
  Euro,
  Clock,
  ArrowLeft,
  Smartphone
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEnhancedShoppingList } from "@/hooks/useEnhancedShoppingList";
import { useShoppingListRealtime } from "@/hooks/useShoppingListRealtime";
import { useStoreLayout } from "@/hooks/useStoreLayout";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import InStoreShopping from "@/components/shopping/InStoreShopping";
import ShoppingSection from "@/components/shopping/ShoppingSection";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import StoreLayoutManager from "@/components/shopping/StoreLayoutManager";
import { DEFAULT_STORE_SECTIONS } from '@/types/shopping-list';

const EnhancedShoppingList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("Tous");
  const [showPurchased, setShowPurchased] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermissions, setSharePermissions] = useState<'view' | 'edit' | 'admin'>('edit');
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const {
    shoppingList,
    sharedLists,
    activeList,
    loading,
    inStoreMode,
    checkedItems,
    inStoreConfig,
    addToShoppingList,
    updateShoppingItem,
    togglePurchased,
    removeFromShoppingList,
    setActiveList,
    createSharedList,
    toggleInStoreMode,
    updateInStoreConfig,
    getOptimalShoppingOrder,
    shareList,
    removeCollaborator,
    getTotalEstimatedCost,
    getCompletionPercentage,
    getSessionStats
  } = useEnhancedShoppingList();

  const { activeLayout } = useStoreLayout();

  // Real-time collaboration
  const {
    liveUsers,
    isConnected,
    joinSession,
    leaveSession,
    updateCurrentSection,
    broadcastItemUpdate
  } = useShoppingListRealtime({
    shoppingListId: activeList?.id || '',
    onItemUpdate: () => {
      // Handle real-time item updates
      toast({
        title: "Liste mise à jour",
        description: "Un collaborateur a modifié la liste."
      });
    },
    onUserJoined: (user) => {
      toast({
        title: "Nouveau collaborateur",
        description: `${user.user_name} a rejoint la session.`
      });
    },
    onUserLeft: (userId) => {
      // Handle user leaving
    }
  });

  // Organize items by store sections
  const organizedItems = useMemo(() => {
    const sections = activeLayout?.sections || DEFAULT_STORE_SECTIONS;
    const sectionMap = new Map();

    // Initialize sections
    sections.forEach(section => {
      sectionMap.set(section.name, []);
    });

    // Filter and distribute items
    const filteredItems = shoppingList.filter(item => {
      const matchesSearch = item.product?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = selectedSection === "Tous" || item.store_section === selectedSection;
      const matchesVisibility = showPurchased || !item.is_purchased;
      return matchesSearch && matchesSection && matchesVisibility;
    });

    filteredItems.forEach(item => {
      const sectionName = item.store_section || 'Autres';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName).push(item);
    });

    // Convert to sections with items
    return sections.map(section => ({
      ...section,
      items: sectionMap.get(section.name) || []
    })).filter(section => section.items.length > 0);
  }, [shoppingList, searchQuery, selectedSection, showPurchased, activeLayout]);

  // Enhanced item check handler with real-time sync
  const handleItemCheck = useCallback((item: any) => {
    const newStatus = !checkedItems.has(item.id);
    togglePurchased(item.id, newStatus);
    
    // Broadcast to collaborators
    broadcastItemUpdate(item, newStatus ? 'purchased' : 'updated');
  }, [checkedItems, togglePurchased, broadcastItemUpdate]);

  const handleShare = async () => {
    if (!activeList || !shareEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez saisir une adresse email valide."
      });
      return;
    }

    await shareList(activeList.id, shareEmail, sharePermissions);
    setShareEmail("");
    setShowShareDialog(false);
  };

  const handleEnterInStoreMode = () => {
    toggleInStoreMode();
    if (activeList && !inStoreMode) {
      joinSession();
    }
  };

  const handleExitInStoreMode = () => {
    toggleInStoreMode();
    leaveSession();
  };

  const stats = getSessionStats();

  // Show in-store mode if activated
  if (inStoreMode && activeList) {
    return (
      <InStoreShopping
        items={shoppingList}
        sections={organizedItems}
        checkedItems={checkedItems}
        config={inStoreConfig}
        collaborators={liveUsers}
        onItemCheck={handleItemCheck}
        onItemQuantityChange={(item, quantity) => {
          updateShoppingItem(item.id, { quantity });
          broadcastItemUpdate(item, 'updated');
        }}
        onItemEdit={(item) => {
          // Handle item editing in store mode
        }}
        onItemRemove={(item) => {
          removeFromShoppingList(item.id);
          broadcastItemUpdate(item, 'removed');
        }}
        onExit={handleExitInStoreMode}
        onConfigChange={updateInStoreConfig}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header with enhanced controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Liste de courses</h1>
            {isConnected && liveUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  En ligne
                </Badge>
                <div className="flex -space-x-2">
                  {liveUsers.slice(0, 3).map(user => (
                    <div
                      key={user.user_id}
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-white"
                      title={user.user_name}
                    >
                      {user.user_name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowLayoutManager(true)}
              variant="outline"
              size="sm"
            >
              <Store className="w-4 h-4 mr-2" />
              Magasins
            </Button>
            
            <Button
              onClick={() => setShowShareDialog(true)}
              variant="outline"
              size="sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            
            <AddShoppingItemDialog />
          </div>
        </div>

        {/* List selector and stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* List selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <Select 
                    value={activeList?.id || ''} 
                    onValueChange={setActiveList}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une liste" />
                    </SelectTrigger>
                    <SelectContent>
                      {sharedLists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.remainingItems}</p>
                  <p className="text-sm text-muted-foreground">À acheter</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{getTotalEstimatedCost().toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground">Budget estimé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{getCompletionPercentage()}%</p>
                  <p className="text-sm text-muted-foreground">Complété</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* In-store mode toggle */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Mode Magasin</h3>
                  <p className="text-sm text-muted-foreground">
                    Interface optimisée pour faire ses courses avec de gros boutons, contrôle vocal et suivi de progression
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleEnterInStoreMode}
                className="bg-blue-500 hover:bg-blue-600"
                disabled={stats.totalItems === 0}
              >
                <Zap className="w-4 h-4 mr-2" />
                Activer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rayon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les rayons</SelectItem>
              {DEFAULT_STORE_SECTIONS.map((section) => (
                <SelectItem key={section.id} value={section.name}>
                  {section.icon} {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={showPurchased}
              onCheckedChange={setShowPurchased}
              id="show-purchased"
            />
            <label htmlFor="show-purchased" className="text-sm">
              Voir achetés
            </label>
          </div>
        </div>
      </div>

      {/* Shopping sections */}
      <div className="space-y-6">
        {organizedItems.length === 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                Votre liste de courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-lg font-medium mb-2">Liste vide</p>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedSection !== "Tous" 
                    ? "Aucun produit ne correspond à votre recherche."
                    : "Votre liste de courses est vide. Commencez par ajouter des articles."
                  }
                </p>
                <AddShoppingItemDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {organizedItems.map((section) => (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ShoppingSection
                  section={section}
                  checkedItems={checkedItems}
                  inStoreMode={false}
                  showPrices={true}
                  onItemCheck={handleItemCheck}
                  onItemEdit={(item) => {
                    // Handle edit
                  }}
                  onItemRemove={removeFromShoppingList}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Share dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager la liste de courses</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email du collaborateur</label>
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="utilisateur@example.com"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Permissions</label>
              <Select value={sharePermissions} onValueChange={(value: 'view' | 'edit' | 'admin') => setSharePermissions(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Lecture seule</SelectItem>
                  <SelectItem value="edit">Lecture et écriture</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleShare}>
              Partager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store layout manager */}
      <StoreLayoutManager
        open={showLayoutManager}
        onOpenChange={setShowLayoutManager}
      />
    </div>
  );
};

export default EnhancedShoppingList;