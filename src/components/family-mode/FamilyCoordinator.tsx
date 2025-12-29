"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  X,
  MessageCircle,
  Vote,
  ChefHat,
  ShoppingCart,
  Settings,
  Heart,
  Utensils,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { familyModeService } from '@/services/family/FamilyModeService';
import { useCipherIntegration } from '@/hooks/useCipherIntegration';
import { cn } from '@/lib/utils';

interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child' | 'teen' | 'adult';
  avatar?: string;
  preferences: {
    cuisines: string[];
    dislikes: string[];
    favorites: string[];
  };
  status: 'available' | 'busy' | 'offline';
  cooking_skills: 1 | 2 | 3 | 4 | 5;
}

interface FamilyDecision {
  id: string;
  title: string;
  description: string;
  type: 'meal_choice' | 'panic_solution' | 'shopping_list' | 'schedule_change';
  deadline: Date;
  votes: Record<string, string>;
  options: Array<{
    id: string;
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    cost?: number;
    time?: number;
  }>;
  status: 'voting' | 'decided' | 'implemented';
}

interface FamilyCoordinatorProps {
  familyId: string;
  currentUserId: string;
  className?: string;
}

export const FamilyCoordinator: React.FC<FamilyCoordinatorProps> = ({
  familyId,
  currentUserId,
  className
}) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeDecisions, setActiveDecisions] = useState<FamilyDecision[]>([]);
  const [familyMode, setFamilyMode] = useState<'normal' | 'panic' | 'coordination'>('normal');
  const [communicationHub, setCommunicationHub] = useState<any[]>([]);
  const [isCoordinating, setIsCoordinating] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const { recordExperience, integrateFamilyModeData } = useCipherIntegration();

  useEffect(() => {
    loadFamilyData();
  }, [familyId]);

  const loadFamilyData = async () => {
    try {
      // Simuler le chargement des données famille
      const mockMembers: FamilyMember[] = [
        {
          id: 'member_1',
          name: 'Alex (Parent)',
          role: 'parent',
          avatar: '/avatars/parent1.jpg',
          preferences: {
            cuisines: ['italien', 'français'],
            dislikes: ['épicé'],
            favorites: ['pasta', 'salade']
          },
          status: 'available',
          cooking_skills: 4
        },
        {
          id: 'member_2',
          name: 'Emma (15 ans)',
          role: 'teen',
          avatar: '/avatars/teen1.jpg',
          preferences: {
            cuisines: ['américain', 'japonais'],
            dislikes: ['légumes verts'],
            favorites: ['burger', 'sushi']
          },
          status: 'available',
          cooking_skills: 2
        },
        {
          id: 'member_3',
          name: 'Lucas (8 ans)',
          role: 'child',
          avatar: '/avatars/child1.jpg',
          preferences: {
            cuisines: ['simple'],
            dislikes: ['épices', 'champignons'],
            favorites: ['pâtes', 'nuggets']
          },
          status: 'available',
          cooking_skills: 1
        }
      ];

      const mockDecisions: FamilyDecision[] = [
        {
          id: 'decision_1',
          title: 'Menu de demain soir',
          description: 'Choisir le repas de demain soir - Lucas a une activité jusqu\'à 19h',
          type: 'meal_choice',
          deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h
          votes: {},
          options: [
            {
              id: 'option_1',
              title: 'Pâtes carbonara',
              description: 'Rapide et aimé de tous',
              pros: ['Rapide (15min)', 'Tout le monde aime', 'Ingrédients disponibles'],
              cons: ['Pas très équilibré'],
              time: 15,
              cost: 8
            },
            {
              id: 'option_2',
              title: 'Saumon grillé + légumes',
              description: 'Option plus saine',
              pros: ['Très nutritif', 'Emma adore le saumon'],
              cons: ['Lucas n\'aime pas les légumes', 'Plus long à préparer'],
              time: 30,
              cost: 18
            },
            {
              id: 'option_3',
              title: 'Pizza maison',
              description: 'Activité familiale',
              pros: ['Amusant à faire ensemble', 'Chacun customise sa part'],
              cons: ['Temps de préparation', 'Un peu salissant'],
              time: 45,
              cost: 12
            }
          ],
          status: 'voting'
        }
      ];

      setFamilyMembers(mockMembers);
      setActiveDecisions(mockDecisions);

      // Intégrer dans Cipher
      await integrateFamilyModeData({
        members: mockMembers.map(m => ({
          id: m.id,
          name: m.name,
          preferences: m.preferences
        })),
        interactions: [],
        conflicts: []
      });
    } catch (error) {
      console.error('Failed to load family data:', error);
    }
  };

  const handleFamilyPanic = async (panicType: string, stressLevel: number) => {
    setFamilyMode('panic');
    setIsCoordinating(true);

    try {
      const panicResult = await familyModeService.handleFamilyPanic(familyId, {
        triggeredBy: currentUserId,
        panicType: panicType as any,
        stressLevel,
        affectedMembers: familyMembers.map(m => m.id),
        timeConstraint: 30
      });

      // Créer une décision d'urgence si vote nécessaire
      if (panicResult.votingRequired) {
        const panicDecision: FamilyDecision = {
          id: `panic_${Date.now()}`,
          title: '🆘 Situation d\'urgence repas!',
          description: 'Nous devons choisir une solution rapidement',
          type: 'panic_solution',
          deadline: panicResult.decisionDeadline,
          votes: {},
          options: panicResult.solutions.map(sol => ({
            id: sol.id,
            title: sol.title,
            description: sol.description,
            pros: sol.compromise_factors,
            cons: [],
            time: sol.estimated_time,
            cost: sol.estimated_cost
          })),
          status: 'voting'
        };

        setActiveDecisions(prev => [panicDecision, ...prev]);
      }

      // Enregistrer dans Cipher
      await recordExperience({
        type: 'panic_triggered',
        data: { panicType, familyMode: true, solutionsOffered: panicResult.solutions.length },
        outcome: 'success'
      });
    } catch (error) {
      console.error('Family panic handling failed:', error);
      await recordExperience({
        type: 'panic_triggered',
        data: { panicType, familyMode: true },
        outcome: 'failure'
      });
    } finally {
      setIsCoordinating(false);
    }
  };

  const handleVote = async (decisionId: string, optionId: string) => {
    setActiveDecisions(prev => prev.map(decision => {
      if (decision.id === decisionId) {
        const updatedVotes = { ...decision.votes };
        updatedVotes[currentUserId] = optionId;

        // Vérifier si tous les membres éligibles ont voté
        const eligibleMembers = familyMembers.filter(m => 
          m.role !== 'child' || (m.role === 'child' && m.name.includes('15')) // Teens peuvent voter
        );
        
        const allVoted = eligibleMembers.every(member => updatedVotes[member.id]);
        
        return {
          ...decision,
          votes: updatedVotes,
          status: allVoted ? 'decided' : 'voting'
        };
      }
      return decision;
    }));

    // Enregistrer l'interaction dans Cipher
    await recordExperience({
      type: 'solution_selected',
      data: { decisionId, optionId, familyVoting: true },
      outcome: 'success',
      satisfaction: 4
    });
  };

  const getVoteResults = (decision: FamilyDecision) => {
    const voteCounts: Record<string, number> = {};
    Object.values(decision.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });

    const winner = Object.entries(voteCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      counts: voteCounts,
      winner: winner ? winner[0] : null,
      totalVotes: Object.keys(decision.votes).length
    };
  };

  const getMemberStatusColor = (status: FamilyMember['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSkillBadge = (level: number) => {
    const skills = ['Débutant', 'Novice', 'Intermédiaire', 'Avancé', 'Expert'];
    const colors = ['bg-red-100 text-red-800', 'bg-orange-100 text-orange-800', 
                   'bg-yellow-100 text-yellow-800', 'bg-blue-100 text-blue-800', 
                   'bg-green-100 text-green-800'];
    return { label: skills[level - 1] || 'Novice', color: colors[level - 1] || colors[1] };
  };

  const formatTimeRemaining = (deadline: Date) => {
    const remaining = Math.max(0, deadline.getTime() - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (remaining < 5 * 60 * 1000) return `${Math.floor(remaining / (1000 * 60))}min (URGENT!)`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <div className={cn("family-coordinator space-y-6", className)}>
      {/* Header avec status famille */}
      <Card className={cn(
        "transition-colors duration-300",
        familyMode === 'panic' && "border-red-300 bg-red-50",
        familyMode === 'coordination' && "border-blue-300 bg-blue-50"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                <CardTitle>Mode Famille</CardTitle>
              </div>
              
              {familyMode === 'panic' && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Situation d'urgence
                </Badge>
              )}
              
              {isCoordinating && (
                <Badge variant="default">
                  <Timer className="w-3 h-3 mr-1 animate-spin" />
                  Coordination en cours...
                </Badge>
              )}
            </div>

            <Button
              onClick={() => handleFamilyPanic('meal_emergency', 4)}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              SOS Repas
            </Button>
          </div>

          {/* Membres de la famille */}
          <div className="flex items-center gap-3 mt-4">
            {familyMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                    getMemberStatusColor(member.status)
                  )} />
                </div>
                <div className="text-sm">
                  <div className="font-medium">{member.name.split(' ')[0]}</div>
                  <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Tabs principales */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Users className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-2">
            <Vote className="w-4 h-4" />
            Décisions
            {activeDecisions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeDecisions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coordination" className="gap-2">
            <Calendar className="w-4 h-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="w-4 h-4" />
            Préférences
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Statut des membres */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Membres disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {familyMembers.map(member => {
                  const skill = getSkillBadge(member.cooking_skills);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                            getMemberStatusColor(member.status)
                          )} />
                        </div>
                        
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-600">
                            {member.preferences.favorites.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <Badge className={cn("text-xs", skill.color)}>
                          <ChefHat className="w-3 h-3 mr-1" />
                          {skill.label}
                        </Badge>
                        <div className={cn(
                          "text-xs px-2 py-1 rounded capitalize",
                          member.status === 'available' && "bg-green-100 text-green-800",
                          member.status === 'busy' && "bg-yellow-100 text-yellow-800",
                          member.status === 'offline' && "bg-gray-100 text-gray-800"
                        )}>
                          {member.status === 'available' ? 'Disponible' :
                           member.status === 'busy' ? 'Occupé' : 'Absent'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Actions rapides famille */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start gap-3"
                  variant="outline"
                  onClick={() => handleFamilyPanic('time_shortage', 3)}
                >
                  <Clock className="w-4 h-4" />
                  Plan express (< 20min)
                </Button>
                
                <Button 
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Liste courses automatique
                </Button>
                
                <Button 
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <Heart className="w-4 h-4" />
                  Menu favoris famille
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Décisions en cours */}
        <TabsContent value="decisions" className="space-y-4">
          <AnimatePresence>
            {activeDecisions.map(decision => {
              const voteResults = getVoteResults(decision);
              const timeRemaining = formatTimeRemaining(decision.deadline);
              const isUrgent = decision.deadline.getTime() - Date.now() < 5 * 60 * 1000;
              
              return (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={cn(
                    "border rounded-lg overflow-hidden",
                    isUrgent && "border-red-300 shadow-red-100 shadow-lg",
                    decision.type === 'panic_solution' && "border-red-400 bg-red-50"
                  )}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {decision.type === 'panic_solution' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                            {decision.type === 'meal_choice' && <Utensils className="w-5 h-5 text-blue-500" />}
                            {decision.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{decision.description}</p>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant={isUrgent ? "destructive" : "secondary"}>
                            <Timer className="w-3 h-3 mr-1" />
                            {timeRemaining}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {voteResults.totalVotes}/{familyMembers.filter(m => m.role !== 'child' || m.name.includes('15')).length} votes
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Options de vote */}
                      <div className="space-y-3">
                        {decision.options.map(option => {
                          const votes = voteResults.counts[option.id] || 0;
                          const percentage = voteResults.totalVotes > 0 
                            ? (votes / voteResults.totalVotes) * 100 
                            : 0;
                          const userVoted = decision.votes[currentUserId] === option.id;
                          const isWinner = voteResults.winner === option.id;

                          return (
                            <div
                              key={option.id}
                              className={cn(
                                "p-4 border rounded-lg cursor-pointer transition-all",
                                userVoted && "border-blue-500 bg-blue-50",
                                isWinner && decision.status === 'decided' && "border-green-500 bg-green-50",
                                !userVoted && !isWinner && "hover:border-gray-300 hover:bg-gray-50"
                              )}
                              onClick={() => decision.status === 'voting' && handleVote(decision.id, option.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{option.title}</h4>
                                    {isWinner && decision.status === 'decided' && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                  
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    {option.time && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {option.time}min
                                      </div>
                                    )}
                                    {option.cost && (
                                      <div className="flex items-center gap-1">
                                        💰 {option.cost}€
                                      </div>
                                    )}
                                  </div>

                                  {/* Avantages/Inconvénients */}
                                  <div className="mt-3 space-y-1">
                                    {option.pros.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {option.pros.map((pro, index) => (
                                          <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                            ✓ {pro}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {option.cons.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {option.cons.map((con, index) => (
                                          <Badge key={index} variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                            ⚠ {con}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right ml-4">
                                  <div className="text-lg font-bold text-blue-600">{votes}</div>
                                  <div className="text-xs text-gray-500">votes</div>
                                  {percentage > 0 && (
                                    <Progress value={percentage} className="w-16 h-2 mt-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Statut de la décision */}
                      {decision.status === 'decided' && voteResults.winner && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Décision prise!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            {decision.options.find(o => o.id === voteResults.winner)?.title} a été choisi
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeDecisions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Aucune décision en attente</h3>
                <p className="text-gray-600 text-sm">Votre famille est bien organisée!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Planning famille */}
        <TabsContent value="coordination" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planning de la semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4" />
                <p>Planning famille à venir...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Préférences famille */}
        <TabsContent value="preferences" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyMembers.map(member => (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {member.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-green-700 mb-2">❤️ Adore</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.preferences.favorites.map(fav => (
                        <Badge key={fav} className="bg-green-100 text-green-800 text-xs">
                          {fav}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-red-700 mb-2">❌ N'aime pas</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.preferences.dislikes.map(dislike => (
                        <Badge key={dislike} className="bg-red-100 text-red-800 text-xs">
                          {dislike}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-blue-700 mb-2">🍽️ Cuisines préférées</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.preferences.cuisines.map(cuisine => (
                        <Badge key={cuisine} className="bg-blue-100 text-blue-800 text-xs">
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};