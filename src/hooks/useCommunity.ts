/**
 * Community Hook - Evolution V2
 * Social features integration for Smart Pantry Pro
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { 
  getCommunityService,
  CommunityService,
  CommunityRecipe,
  RecipeRating,
  RecipeComment,
  CookingChallenge,
  ChallengeSubmission,
  CommunityPost,
  SocialFeed,
  UserProfile,
  ExpertProfile,
  ExpertConsultation,
  UserFollow
} from '@/services/community/communityService';
import { toast } from 'sonner';

export interface CommunityState {
  socialFeed: SocialFeed | null;
  userProfile: UserProfile | null;
  following: UserFollow[];
  followers: UserFollow[];
  isLoadingFeed: boolean;
  isLoadingProfile: boolean;
  error: string | null;
}

export function useCommunity() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<CommunityState>({
    socialFeed: null,
    userProfile: null,
    following: [],
    followers: [],
    isLoadingFeed: false,
    isLoadingProfile: false,
    error: null
  });

  const communityService = useState<CommunityService | null>(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    return getCommunityService(apiUrl);
  })[0];

  // Update auth token when user changes
  useEffect(() => {
    if (user && communityService) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          communityService.setAuthToken(session.access_token);
        }
      });
    }
  }, [user, supabase, communityService]);

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadSocialFeed();
    }
  }, [user]);

  /**
   * Load user's community profile
   */
  const loadUserProfile = useCallback(async () => {
    if (!user || !communityService) return;

    setState(prev => ({ ...prev, isLoadingProfile: true, error: null }));

    try {
      const profile = await communityService.getUserProfile(user.id);
      setState(prev => ({ ...prev, userProfile: profile, isLoadingProfile: false }));
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoadingProfile: false 
      }));
    }
  }, [user, communityService]);

  /**
   * Load social feed
   */
  const loadSocialFeed = useCallback(async (limit = 20, offset = 0) => {
    if (!communityService) return;

    setState(prev => ({ ...prev, isLoadingFeed: true, error: null }));

    try {
      const feed = await communityService.getSocialFeed(limit, offset);
      setState(prev => ({ ...prev, socialFeed: feed, isLoadingFeed: false }));
    } catch (error: any) {
      console.error('Failed to load social feed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoadingFeed: false 
      }));
    }
  }, [communityService]);

  /**
   * Recipe sharing queries and mutations
   */
  const { data: trendingRecipes, isLoading: isLoadingTrending } = useQuery({
    queryKey: ['trending-recipes'],
    queryFn: async () => {
      if (!communityService) return [];
      const result = await communityService.getRecipes({ trending: true, limit: 10 });
      return result.recipes;
    },
    enabled: !!communityService,
    staleTime: 300000 // 5 minutes
  });

  const { data: featuredRecipes, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: async () => {
      if (!communityService) return [];
      const result = await communityService.getRecipes({ featured: true, limit: 6 });
      return result.recipes;
    },
    enabled: !!communityService,
    staleTime: 600000 // 10 minutes
  });

  const shareRecipeMutation = useMutation({
    mutationFn: async (recipe: Partial<CommunityRecipe>) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.shareRecipe(recipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['community-recipes']);
      toast.success('Recette partagée avec la communauté !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors du partage de la recette');
      console.error('Share recipe error:', error);
    }
  });

  const rateRecipeMutation = useMutation({
    mutationFn: async ({ recipeId, rating }: { recipeId: string; rating: Omit<RecipeRating, 'id' | 'createdAt'> }) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.rateRecipe(recipeId, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recipe-ratings']);
      toast.success('Note attribuée à la recette');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la notation');
      console.error('Rate recipe error:', error);
    }
  });

  /**
   * Challenge queries and mutations
   */
  const { data: activeChallenges, isLoading: isLoadingChallenges } = useQuery({
    queryKey: ['active-challenges'],
    queryFn: async () => {
      if (!communityService) return [];
      return communityService.getCookingChallenges('active');
    },
    enabled: !!communityService,
    staleTime: 300000 // 5 minutes
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.joinChallenge(challengeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['active-challenges']);
      queryClient.invalidateQueries(['user-challenges']);
      toast.success('Défi rejoint avec succès !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la participation au défi');
      console.error('Join challenge error:', error);
    }
  });

  const submitToChallengeM*utation = useMutation({
    mutationFn: async ({ challengeId, submission }: { 
      challengeId: string; 
      submission: Omit<ChallengeSubmission, 'id' | 'submittedAt'> 
    }) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.submitToChallenge(challengeId, submission);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['challenge-submissions']);
      toast.success('Participation soumise au défi !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la soumission');
      console.error('Submit to challenge error:', error);
    }
  });

  /**
   * Social interactions
   */
  const createPostMutation = useMutation({
    mutationFn: async (post: Omit<CommunityPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'shares'>) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.createPost(post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-feed']);
      loadSocialFeed(); // Refresh local feed
      toast.success('Publication partagée !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la publication');
      console.error('Create post error:', error);
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.likePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-feed']);
    },
    onError: (error: any) => {
      toast.error('Erreur lors du like');
      console.error('Like post error:', error);
    }
  });

  const followUserMutation = useMutation({
    mutationFn: async ({ userId, notifications = true }: { userId: string; notifications?: boolean }) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.followUser(userId, notifications);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-following']);
      queryClient.invalidateQueries(['user-followers']);
      toast.success('Utilisateur suivi !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors du suivi');
      console.error('Follow user error:', error);
    }
  });

  /**
   * Expert consultations
   */
  const { data: availableExperts, isLoading: isLoadingExperts } = useQuery({
    queryKey: ['available-experts'],
    queryFn: async () => {
      if (!communityService) return [];
      return communityService.getExperts();
    },
    enabled: !!communityService,
    staleTime: 600000 // 10 minutes
  });

  const requestConsultationMutation = useMutation({
    mutationFn: async (consultation: Omit<ExpertConsultation, 'id' | 'createdAt' | 'status'>) => {
      if (!communityService) throw new Error('Community service not available');
      return communityService.requestConsultation(consultation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-consultations']);
      toast.success('Consultation demandée ! L\'expert va vous répondre bientôt.');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la demande de consultation');
      console.error('Request consultation error:', error);
    }
  });

  /**
   * Search functionality
   */
  const searchRecipes = useCallback(async (query: string, filters?: any) => {
    if (!communityService || !query.trim()) return [];

    try {
      return await communityService.searchRecipes(query, filters);
    } catch (error) {
      console.error('Search recipes error:', error);
      return [];
    }
  }, [communityService]);

  const searchUsers = useCallback(async (query: string) => {
    if (!communityService || !query.trim()) return [];

    try {
      return await communityService.searchUsers(query);
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }, [communityService]);

  /**
   * Recipe discovery with advanced filters
   */
  const discoverRecipes = useCallback(async (filters: {
    category?: string;
    difficulty?: string;
    maxTime?: number;
    dietary?: string[];
    rating?: number;
    limit?: number;
  } = {}) => {
    if (!communityService) return { recipes: [], total: 0 };

    try {
      return await communityService.getRecipes(filters);
    } catch (error) {
      console.error('Discover recipes error:', error);
      return { recipes: [], total: 0 };
    }
  }, [communityService]);

  /**
   * Get user's community stats
   */
  const { data: userStats } = useQuery({
    queryKey: ['user-community-stats', user?.id],
    queryFn: async () => {
      if (!communityService || !user) return null;
      return communityService.getUserStats(user.id);
    },
    enabled: !!communityService && !!user,
    staleTime: 300000 // 5 minutes
  });

  /**
   * Community insights and analytics
   */
  const { data: communityStats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      if (!communityService) return null;
      return communityService.getCommunityStats();
    },
    enabled: !!communityService,
    staleTime: 600000 // 10 minutes
  });

  return {
    // State
    ...state,
    
    // Data from queries
    trendingRecipes,
    featuredRecipes,
    activeChallenges,
    availableExperts,
    userStats,
    communityStats,
    
    // Loading states
    isLoadingTrending,
    isLoadingFeatured,
    isLoadingChallenges,
    isLoadingExperts,
    
    // Actions
    loadUserProfile,
    loadSocialFeed,
    searchRecipes,
    searchUsers,
    discoverRecipes,
    
    // Mutations
    shareRecipe: shareRecipeMutation.mutate,
    isShareRecipeLoading: shareRecipeMutation.isLoading,
    
    rateRecipe: rateRecipeMutation.mutate,
    isRateRecipeLoading: rateRecipeMutation.isLoading,
    
    joinChallenge: joinChallengeMutation.mutate,
    isJoinChallengeLoading: joinChallengeMutation.isLoading,
    
    submitToChallenge: submitToChallengeM*utation.mutate,
    isSubmitToChallengeLoading: submitToChallengeM*utation.isLoading,
    
    createPost: createPostMutation.mutate,
    isCreatePostLoading: createPostMutation.isLoading,
    
    likePost: likePostMutation.mutate,
    isLikePostLoading: likePostMutation.isLoading,
    
    followUser: followUserMutation.mutate,
    isFollowUserLoading: followUserMutation.isLoading,
    
    requestConsultation: requestConsultationMutation.mutate,
    isRequestConsultationLoading: requestConsultationMutation.isLoading,
    
    // Computed properties
    hasProfile: !!state.userProfile,
    isActiveInCommunity: !!(state.userProfile && (
      state.userProfile.stats.recipesShared > 0 ||
      state.userProfile.stats.challengesParticipated > 0 ||
      state.userProfile.stats.followersCount > 0
    )),
    recommendationsAvailable: !!(state.socialFeed?.suggestions && (
      state.socialFeed.suggestions.recipesToTry.length > 0 ||
      state.socialFeed.suggestions.usersToFollow.length > 0 ||
      state.socialFeed.suggestions.challengesToJoin.length > 0
    ))
  };
}

/**
 * Hook for recipe-specific community features
 */
export function useRecipeCommunity(recipeId: string) {
  const { data: recipeDetails } = useQuery({
    queryKey: ['community-recipe', recipeId],
    queryFn: async () => {
      const communityService = getCommunityService();
      return communityService.getRecipeById(recipeId);
    },
    enabled: !!recipeId,
    staleTime: 300000 // 5 minutes
  });

  const { data: recipeComments } = useQuery({
    queryKey: ['recipe-comments', recipeId],
    queryFn: async () => {
      // This would need to be implemented in the service
      return [];
    },
    enabled: !!recipeId,
    staleTime: 60000 // 1 minute
  });

  const { data: recipeRatings } = useQuery({
    queryKey: ['recipe-ratings', recipeId],
    queryFn: async () => {
      // This would need to be implemented in the service
      return [];
    },
    enabled: !!recipeId,
    staleTime: 300000 // 5 minutes
  });

  return {
    recipeDetails,
    recipeComments: recipeComments || [],
    recipeRatings: recipeRatings || [],
    averageRating: recipeDetails?.rating.average || 0,
    ratingsCount: recipeDetails?.rating.count || 0,
    isPopular: (recipeDetails?.rating.count || 0) > 50 && (recipeDetails?.rating.average || 0) > 4.0,
    isTrending: recipeDetails?.featuredAt && 
                new Date(recipeDetails.featuredAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
  };
}

/**
 * Hook for challenge-specific features
 */
export function useChallenge(challengeId: string) {
  const { data: challengeDetails } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      // This would need to be implemented in the service
      return null;
    },
    enabled: !!challengeId,
    staleTime: 300000 // 5 minutes
  });

  const { data: challengeSubmissions } = useQuery({
    queryKey: ['challenge-submissions', challengeId],
    queryFn: async () => {
      // This would need to be implemented in the service
      return [];
    },
    enabled: !!challengeId,
    staleTime: 60000 // 1 minute
  });

  return {
    challengeDetails,
    challengeSubmissions: challengeSubmissions || [],
    participantsCount: challengeDetails?.participants.length || 0,
    submissionsCount: challengeDetails?.submissions.length || 0,
    isActive: challengeDetails?.status === 'active',
    canParticipate: challengeDetails?.status === 'active',
    timeRemaining: challengeDetails?.endDate ? 
      Math.max(0, new Date(challengeDetails.endDate).getTime() - Date.now()) : 0
  };
}