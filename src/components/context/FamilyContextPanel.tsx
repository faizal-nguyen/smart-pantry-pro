"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Vote,
  Calendar,
  ChefHat,
  TrendingUp,
  MessageSquare,
  Settings,
  Heart,
  Shield,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  FamilyContextualState,
  FamilyConflict,
  ConflictResolution,
  FamilyMemberProfile,
  FamilyAdaptationResult
} from '@/services/context/types';

interface FamilyContextPanelProps {
  familyId: string;
  planId: string;
  onRefresh?: () => void;
  className?: string;
}

export const FamilyContextPanel: React.FC<FamilyContextPanelProps> = ({ 
  familyId, 
  planId,
  onRefresh,
  className 
}) => {
  const [familyState, setFamilyState] = useState<FamilyContextualState | null>(null);
  const [adaptationResult, setAdaptationResult] = useState<FamilyAdaptationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'conflicts' | 'preferences' | 'history'>('overview');
  const [votingActive, setVotingActive] = useState(false);

  useEffect(() => {
    loadFamilyContext();
  }, [familyId, planId]);

  const loadFamilyContext = async () => {
    setLoading(true);
    try {
      const [state, result] = await Promise.all([
        fetchFamilyState(familyId),
        fetchAdaptationResult(familyId, planId)
      ]);
      setFamilyState(state);
      setAdaptationResult(result);
    } catch (error) {
      console.error('Failed to load family context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConflictVote = async (conflictId: string, memberId: string, vote: 'accept' | 'reject') => {
    // Implémenter le vote
    console.log('Voting:', conflictId, memberId, vote);
  };

  const handleRefresh = async () => {
    await loadFamilyContext();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card className={cn("family-context-panel animate-pulse", className)}>
        <CardContent className="h-96" />
      </Card>
    );
  }

  if (!familyState) {
    return (
      <Card className={cn("family-context-panel", className)}>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Contexte famille non disponible</AlertTitle>
            <AlertDescription>
              Impossible de charger les informations familiales.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("family-context-panel", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Coordination Famille
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Consensus: {Math.round((adaptationResult?.consensusScore || 0.8) * 100)}%
              </Badge>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="conflicts">
                Conflits {adaptationResult?.conflicts.length ? 
                  <Badge variant="destructive" className="ml-1 h-5 px-1">
                    {adaptationResult.conflicts.length}
                  </Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="preferences">Préférences</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <TabsContent value="overview" className="space-y-4">
                  <FamilyOverview 
                    familyState={familyState}
                    adaptationResult={adaptationResult}
                  />
                </TabsContent>
                
                <TabsContent value="conflicts" className="space-y-4">
                  <ConflictsView
                    conflicts={adaptationResult?.conflicts || []}
                    resolutions={adaptationResult?.resolutions || []}
                    members={familyState.members}
                    onVote={handleConflictVote}
                    votingActive={votingActive}
                  />
                </TabsContent>
                
                <TabsContent value="preferences" className="space-y-4">
                  <FamilyPreferencesView
                    familyState={familyState}
                    onUpdate={loadFamilyContext}
                  />
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <ConflictHistoryView
                    history={familyState.conflictHistory}
                    members={familyState.members}
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// === COMPOSANTS INTERNES ===

interface FamilyOverviewProps {
  familyState: FamilyContextualState;
  adaptationResult: FamilyAdaptationResult | null;
}

const FamilyOverview: React.FC<FamilyOverviewProps> = ({ familyState, adaptationResult }) => {
  return (
    <div className="space-y-4">
      {/* Membres de la famille */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Membres de la famille</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {familyState.members.map((member, index) => (
            <div key={member.userId} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{member.role.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">{member.role}</p>
                {member.dietaryRestrictions.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {member.dietaryRestrictions.length} restriction(s)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stratégie d'adaptation */}
      <div className="p-4 bg-purple-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Stratégie familiale</h4>
          <Badge variant="secondary" className="capitalize">
            {familyState.adaptationStrategy}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {getStrategyDescription(familyState.adaptationStrategy)}
        </p>
      </div>

      {/* Résumé des adaptations */}
      {adaptationResult && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Adaptations appliquées</h4>
          
          {/* Stats globales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">
                {adaptationResult.memberAdaptations.size}
              </p>
              <p className="text-xs text-gray-600">Membres adaptés</p>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-700">
                {adaptationResult.resolutions.filter(r => r.outcome === 'resolved').length}
              </p>
              <p className="text-xs text-gray-600">Conflits résolus</p>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Vote className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-2xl font-bold text-orange-700">
                {adaptationResult.resolutions.filter(r => r.outcome === 'pending').length}
              </p>
              <p className="text-xs text-gray-600">En attente</p>
            </div>
          </div>
        </div>
      )}

      {/* Niveau de consensus */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Niveau de consensus</h4>
          <span className="text-sm text-gray-500">
            {Math.round((adaptationResult?.consensusScore || familyState.consensusLevel) * 100)}%
          </span>
        </div>
        <Progress 
          value={(adaptationResult?.consensusScore || familyState.consensusLevel) * 100} 
          className="h-2"
        />
        <p className="text-xs text-gray-500">
          Plus le consensus est élevé, plus les adaptations satisfont tous les membres
        </p>
      </div>
    </div>
  );
};

interface ConflictsViewProps {
  conflicts: FamilyConflict[];
  resolutions: ConflictResolution[];
  members: FamilyMemberProfile[];
  onVote: (conflictId: string, memberId: string, vote: 'accept' | 'reject') => void;
  votingActive: boolean;
}

const ConflictsView: React.FC<ConflictsViewProps> = ({ 
  conflicts, 
  resolutions, 
  members,
  onVote,
  votingActive
}) => {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
        <p className="text-gray-600">Aucun conflit détecté!</p>
        <p className="text-sm text-gray-500 mt-1">
          Les préférences familiales sont alignées
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conflicts.map((conflict, index) => {
        const resolution = resolutions.find(r => r.conflictId === conflict.id);
        
        return (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-lg border",
              conflict.severity === 'high' ? 'border-red-200 bg-red-50' :
              conflict.severity === 'medium' ? 'border-orange-200 bg-orange-50' :
              'border-yellow-200 bg-yellow-50'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn(
                  "w-5 h-5 mt-0.5",
                  conflict.severity === 'high' ? 'text-red-600' :
                  conflict.severity === 'medium' ? 'text-orange-600' :
                  'text-yellow-600'
                )} />
                <div>
                  <h5 className="font-medium">{conflict.description}</h5>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {conflict.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {conflict.members.length} membres concernés
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant={
                conflict.severity === 'high' ? 'destructive' :
                conflict.severity === 'medium' ? 'default' :
                'secondary'
              }>
                {conflict.severity}
              </Badge>
            </div>

            {/* Résolution */}
            {resolution ? (
              <div className="mt-3 p-3 bg-white/50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Résolution: {resolution.method}</span>
                  <Badge variant={
                    resolution.outcome === 'resolved' ? 'default' :
                    resolution.outcome === 'compromise' ? 'secondary' :
                    'outline'
                  }>
                    {resolution.outcome}
                  </Badge>
                </div>
                
                {/* Satisfaction des membres */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Array.from(resolution.satisfaction.entries()).map(([memberId, satisfaction]) => {
                    const member = members.find(m => m.userId === memberId);
                    return (
                      <div key={memberId} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{member?.role}:</span>
                        <Progress value={satisfaction * 100} className="flex-1 h-1.5" />
                        <span className="text-xs font-medium">{Math.round(satisfaction * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  Suggestion: {conflict.suggestedResolution}
                </p>
                {votingActive && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Vote className="w-3 h-3 mr-1" />
                      Voter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

interface FamilyPreferencesViewProps {
  familyState: FamilyContextualState;
  onUpdate: () => void;
}

const FamilyPreferencesView: React.FC<FamilyPreferencesViewProps> = ({ familyState, onUpdate }) => {
  const [preferences, setPreferences] = useState(familyState.sharedPreferences);

  const handlePreferenceChange = async (key: string, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    // TODO: Sauvegarder dans la base
    await updateFamilyPreferences(familyState.familyId, newPrefs);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <Alert className="border-purple-200 bg-purple-50">
        <Shield className="h-4 w-4 text-purple-600" />
        <AlertTitle>Préférences partagées</AlertTitle>
        <AlertDescription>
          Ces préférences s'appliquent à tous les membres de la famille
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Mode économie famille</p>
            <p className="text-xs text-gray-600">Optimiser pour les achats en gros</p>
          </div>
          <Switch
            checked={preferences.bulk_buying_enabled || false}
            onCheckedChange={(checked) => 
              handlePreferenceChange('bulk_buying_enabled', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Batch cooking automatique</p>
            <p className="text-xs text-gray-600">Suggérer des préparations à l'avance</p>
          </div>
          <Switch
            checked={preferences.batch_cooking_enabled || false}
            onCheckedChange={(checked) => 
              handlePreferenceChange('batch_cooking_enabled', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Alternatives automatiques</p>
            <p className="text-xs text-gray-600">Proposer des variantes pour chaque plat</p>
          </div>
          <Switch
            checked={preferences.auto_alternatives || false}
            onCheckedChange={(checked) => 
              handlePreferenceChange('auto_alternatives', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Vote familial pour conflits</p>
            <p className="text-xs text-gray-600">Activer le système de vote démocratique</p>
          </div>
          <Switch
            checked={preferences.voting_enabled || false}
            onCheckedChange={(checked) => 
              handlePreferenceChange('voting_enabled', checked)
            }
          />
        </div>
      </div>

      {/* Stratégie d'adaptation */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Stratégie d'adaptation</h4>
        <div className="grid grid-cols-1 gap-2">
          {['balanced', 'health_focused', 'budget_focused', 'time_focused'].map(strategy => (
            <button
              key={strategy}
              onClick={() => handlePreferenceChange('adaptation_strategy', strategy)}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                familyState.adaptationStrategy === strategy
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <p className="font-medium text-sm capitalize">
                {strategy.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {getStrategyDescription(strategy)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ConflictHistoryViewProps {
  history: FamilyConflict[];
  members: FamilyMemberProfile[];
}

const ConflictHistoryView: React.FC<ConflictHistoryViewProps> = ({ history, members }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">Aucun historique de conflit</p>
        <p className="text-sm text-gray-500 mt-1">
          C'est une bonne nouvelle!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.slice(-10).reverse().map((conflict, index) => (
        <motion.div
          key={`${conflict.id}_${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="sm">
                {conflict.category}
              </Badge>
              <span className="text-sm text-gray-600">{conflict.description}</span>
            </div>
            <Badge 
              variant={
                conflict.severity === 'high' ? 'destructive' :
                conflict.severity === 'medium' ? 'default' :
                'secondary'
              }
              size="sm"
            >
              {conflict.severity}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {conflict.members.length} membres impliqués
          </p>
        </motion.div>
      ))}
    </div>
  );
};

// === FONCTIONS UTILITAIRES ===

function getStrategyDescription(strategy: string): string {
  const descriptions: Record<string, string> = {
    balanced: "Équilibre entre santé, budget et temps",
    health_focused: "Priorité aux choix nutritionnels",
    budget_focused: "Optimisation maximale des coûts",
    time_focused: "Repas rapides et pratiques"
  };
  return descriptions[strategy] || "Stratégie personnalisée";
}

async function fetchFamilyState(familyId: string): Promise<FamilyContextualState | null> {
  // En production, appeler l'API
  return {
    familyId,
    members: [
      { userId: 'user1', role: 'parent', dietaryRestrictions: [], preferences: {} },
      { userId: 'user2', role: 'parent', dietaryRestrictions: ['vegetarian'], preferences: {} },
      { userId: 'user3', role: 'child', dietaryRestrictions: [], preferences: {} },
      { userId: 'user4', role: 'child', dietaryRestrictions: ['lactose'], preferences: {} }
    ],
    sharedPreferences: {
      bulk_buying_enabled: true,
      batch_cooking_enabled: false,
      auto_alternatives: true,
      voting_enabled: false
    },
    conflictHistory: [],
    lastSync: new Date(),
    consensusLevel: 0.85,
    adaptationStrategy: 'balanced',
    lastUpdated: new Date()
  };
}

async function fetchAdaptationResult(familyId: string, planId: string): Promise<FamilyAdaptationResult | null> {
  // En production, appeler l'API
  return null;
}

async function updateFamilyPreferences(familyId: string, preferences: any): Promise<void> {
  // En production, sauvegarder dans la base
  console.log('Updating family preferences:', familyId, preferences);
}