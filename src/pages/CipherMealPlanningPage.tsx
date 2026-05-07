"use client";

import { useEffect, useState } from 'react';
import { useCipherMealPlanning } from '@/hooks/useCipherMealPlanning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChefHat, DollarSign, TrendingUp, Shield, Users, Lock, Unlock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyCalendar } from '@/components/meal-planning/WeeklyCalendar';
import { RecommendationsPanel } from '@/components/meal-planning/RecommendationsPanel';
import { NutritionalOverview } from '@/components/meal-planning/NutritionalOverview';
import { ShoppingListPreview } from '@/components/meal-planning/ShoppingListPreview';
import { ShoppingListBridge } from '@/services/planning/core/ShoppingListBridge';
import { supabase } from '@/integrations/supabase/client';
import { SmartAdvicePanel } from '@/components/meal-planning/SmartAdvicePanel';
import { ContextualAdaptationsPanel } from '@/components/meal-planning/ContextualAdaptationsPanel';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function CipherMealPlanningPage() {
  const navigate = useNavigate();
  const {
    // Meal planning features
    currentPlan,
    generateWeeklyPlan,
    optimizeShoppingList,
    userPreferences,
    
    // Cipher features
    encryptedPlanId,
    isEncrypting,
    isDecrypting,
    encryptMealPlan,
    decryptMealPlan,
    securityStatus,
    
    // Family mode features
    isFamilyModeActive,
    currentProfile,
    availableProfiles,
    switchFamilyProfile,
    familyAdaptations,
    getFamilyAdaptedSuggestions,
    
    // Navigation intelligence
    navigationSuggestions,
    handleSmartNavigation,
    updateNavigationSuggestions,
    
    // Computed
    isSecure,
    canEncrypt,
    hasFamilyAdaptations
  } = useCipherMealPlanning();

  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string | null>(null);

  useEffect(() => {
    // Update navigation suggestions when page loads
    updateNavigationSuggestions();
  }, []);

  const handleGeneratePlan = async () => {
    await generateWeeklyPlan();
  };

  const handleExportShopping = async () => {
    try {
      if (!currentPlan) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      const bridge = new ShoppingListBridge();
      const result = await bridge.convertMealPlanToShoppingList(currentPlan as any, user.id, true);
      toast.success(`Liste générée: ${result.summary.totalItems} items (dont ${result.summary.newItems} nouveaux)`);
      // Optionnel: naviguer vers la liste
      // navigate('/shopping/list');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la génération de la liste');
    }
  };

  const handleEncryptPlan = async () => {
    if (canEncrypt) {
      await encryptMealPlan();
    }
  };

  const handleProfileSwitch = async (profileId: string) => {
    setSelectedFamilyMember(profileId);
    await switchFamilyProfile(profileId);
    toast.success(`Profil changé: ${availableProfiles.find(p => p.id === profileId)?.name}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Security Status Bar */}
      <motion.div 
        className={`p-3 rounded-lg flex items-center justify-between ${
          isSecure ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        } border`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Shield className={`h-5 w-5 ${isSecure ? 'text-green-600' : 'text-yellow-600'}`} />
          <span className={`font-medium ${isSecure ? 'text-green-800' : 'text-yellow-800'}`}>
            {isSecure ? 'Plan sécurisé avec Cipher' : 'Plan non chiffré'}
          </span>
          {securityStatus.lastEncrypted && (
            <span className="text-sm text-muted-foreground">
              Dernière mise à jour: {new Date(securityStatus.lastEncrypted).toLocaleString('fr-FR')}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEncryptPlan}
          disabled={!canEncrypt || isEncrypting}
          className="gap-2"
        >
          {isSecure ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          {isEncrypting ? 'Chiffrement...' : isSecure ? 'Mettre à jour' : 'Sécuriser'}
        </Button>
      </motion.div>

      {/* Header with Family Mode */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Planification des Repas Intelligente
            </h1>
            {isFamilyModeActive && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                Mode Famille
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {currentProfile?.type === 'child' 
              ? `Salut ${currentProfile.name}! Planifions des super repas ensemble!`
              : 'Planification sécurisée et adaptée à votre famille'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Family Member Selector */}
          {isFamilyModeActive && availableProfiles.length > 0 && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {availableProfiles.map(profile => (
                <Button
                  key={profile.id}
                  variant={currentProfile?.id === profile.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleProfileSwitch(profile.id)}
                  className="gap-1"
                >
                  {profile.type === 'child' ? '👦' : '👨'}
                  {profile.name}
                </Button>
              ))}
            </div>
          )}

          <Button 
            onClick={handleGeneratePlan}
            className="gap-2"
            size={currentProfile?.type === 'child' ? 'lg' : 'default'}
          >
            <ChefHat className="h-4 w-4" />
            {currentProfile?.type === 'child' ? 'Créer la Magie!' : 'Générer Plan'}
          </Button>
        </div>
      </div>

      {/* Navigation Suggestions */}
      <AnimatePresence>
        {navigationSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {navigationSuggestions.slice(0, 3).map((suggestion, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  suggestion.action();
                  handleSmartNavigation(suggestion.type, suggestion);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{suggestion.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{suggestion.suggestion}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        Priorité: {suggestion.priority}/10
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats with Family Adaptations */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={hasFamilyAdaptations ? 'ring-2 ring-primary/20' : ''}>
          <CardContent className="flex items-center p-6">
            <CalendarDays className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Semaine
              </p>
              <p className="text-2xl font-bold">
                {currentPlan ? 
                  currentPlan.weekStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : 'Aucun plan'
                }
              </p>
              {hasFamilyAdaptations && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Adapté famille
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Budget
              </p>
              <p className="text-2xl font-bold">
                {currentPlan?.totalEstimatedCost.toFixed(2) || '0'}€
              </p>
              <p className="text-xs text-muted-foreground">
                /{userPreferences?.budgetConstraints.weeklyBudget || 100}€
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Shield className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Sécurité
              </p>
              <p className="text-lg font-bold">
                {isSecure ? 'Chiffré' : 'Non sécurisé'}
              </p>
              <p className="text-xs text-muted-foreground">
                Cipher v{securityStatus.encryptionVersion}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Famille
              </p>
              <p className="text-2xl font-bold">
                {availableProfiles.length || 1}
              </p>
              <p className="text-xs text-muted-foreground">
                {isFamilyModeActive ? 'Actif' : 'Individuel'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Enhanced Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Calendar - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Planning Hebdomadaire
                  {isSecure && <Lock className="h-4 w-4 text-green-600" />}
                </div>
                {hasFamilyAdaptations && (
                  <Badge variant="secondary">
                    Adapté pour {currentProfile?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyCalendar 
                plan={currentPlan}
                onMealChange={(dayIndex, mealType, recipeId) => {
                  console.log('Meal changed:', { dayIndex, mealType, recipeId });
                }}
                isEditable={!isEncrypting}
              />
            </CardContent>
          </Card>

          {/* Family Adaptations Panel */}
          {hasFamilyAdaptations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Adaptations Famille
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(familyAdaptations).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Sidebar with Contextual Intelligence */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="context" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="context" className="text-xs">
                    ⚡ Contexte
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs">
                    🔒 Sécurité
                  </TabsTrigger>
                  <TabsTrigger value="family" className="text-xs">
                    👨‍👩‍👧‍👦 Famille
                  </TabsTrigger>
                  <TabsTrigger value="shopping" className="text-xs">
                    🛒 Courses
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="context" className="mt-0">
                    <ContextualAdaptationsPanel
                      userId={currentProfile?.id || 'user-123'}
                      currentPlan={currentPlan}
                      onPlanAdapted={(adaptedPlan) => {
                        console.log('Plan adapted:', adaptedPlan);
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="security" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Sécurité Cipher
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">État du chiffrement</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isSecure ? 'Vos données sont chiffrées avec AES-256-GCM' : 'Activez le chiffrement pour sécuriser vos données'}
                          </p>
                        </div>
                        
                        {encryptedPlanId && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">ID Sécurisé</p>
                            <p className="text-xs font-mono text-muted-foreground mt-1">
                              {encryptedPlanId.substring(0, 20)}...
                            </p>
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowSecurityPanel(!showSecurityPanel)}
                        >
                          Paramètres de sécurité
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="family" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Gestion Famille
                      </h3>
                      
                      {isFamilyModeActive ? (
                        <div className="space-y-3">
                          {availableProfiles.map(profile => (
                            <div 
                              key={profile.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                currentProfile?.id === profile.id 
                                  ? 'bg-primary/10 border-primary' 
                                  : 'bg-muted hover:bg-muted/80'
                              } border`}
                              onClick={() => handleProfileSwitch(profile.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{profile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {profile.type === 'child' ? 'Enfant' : 'Adulte'}
                                    {profile.age && ` - ${profile.age} ans`}
                                  </p>
                                </div>
                                {currentProfile?.id === profile.id && (
                                  <Badge variant="default" className="text-xs">
                                    Actif
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Mode famille désactivé</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => navigate('/settings')}
                          >
                            Activer
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="shopping" className="mt-0">
                  {currentPlan ? (
                    <div className="space-y-3">
                      <ShoppingListPreview 
                        shoppingList={currentPlan.shoppingList}
                        onExportToShoppingList={handleExportShopping}
                      />
                      <Button onClick={handleExportShopping} className="w-full">
                        Exporter les manquants vers la liste de courses
                      </Button>
                    </div>
                  ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <div className="text-4xl mb-2">🛒</div>
                        <h3 className="font-medium mb-1">Pas de liste de courses</h3>
                        <p className="text-sm">
                          Générez un plan de repas pour créer votre liste
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
