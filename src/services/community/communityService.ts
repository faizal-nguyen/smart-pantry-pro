/**
 * Community Service - Evolution V2
 * Social features for recipe sharing, cooking challenges, and expert interactions
 */

export interface CommunityRecipe {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description: string;
  ingredients: CommunityIngredient[];
  instructions: string[];
  images: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  rating: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isVerified: boolean;
  featuredAt?: Date;
}

export interface CommunityIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
  notes?: string;
}

export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  review?: string;
  images?: string[];
  helpfulVotes: number;
  createdAt: Date;
  verifiedCook: boolean; // User actually made the recipe
}

export interface RecipeComment {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentCommentId?: string; // For replies
  images?: string[];
  likes: number;
  isAuthorReply: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RecipeCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  recipes: string[]; // Recipe IDs
  followers: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface CookingChallenge {
  id: string;
  title: string;
  description: string;
  rules: string[];
  startDate: Date;
  endDate: Date;
  prizes: ChallengePrize[];
  participants: ChallengeParticipant[];
  submissions: ChallengeSubmission[];
  judges: ChallengeJudge[];
  status: 'upcoming' | 'active' | 'judging' | 'completed';
  type: 'weekly' | 'seasonal' | 'special' | 'sustainability';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'any';
  theme: {
    category: string;
    requiredIngredients?: string[];
    forbiddenIngredients?: string[];
    specialConstraints?: string[];
  };
  coverImage: string;
  sponsoredBy?: string;
}

export interface ChallengePrize {
  position: number;
  description: string;
  value?: number;
  sponsor?: string;
}

export interface ChallengeParticipant {
  userId: string;
  userName: string;
  joinedAt: Date;
  submissionId?: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  recipeId: string;
  title: string;
  description: string;
  images: string[];
  video?: string;
  cookingStory: string;
  ingredientsCost?: number;
  timeSpent: number;
  submittedAt: Date;
  judgeScores: JudgeScore[];
  publicVotes: number;
  finalScore?: number;
  position?: number;
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  scores: {
    taste: number; // 1-10
    presentation: number; // 1-10
    creativity: number; // 1-10
    technique: number; // 1-10
    adherence: number; // 1-10 (to challenge rules)
  };
  comments: string;
  submittedAt: Date;
}

export interface ChallengeJudge {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  expertise: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    website?: string;
  };
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  type: 'recipe_share' | 'cooking_tip' | 'question' | 'success_story' | 'challenge_entry';
  title: string;
  content: string;
  images?: string[];
  video?: string;
  recipeId?: string; // If sharing a recipe
  challengeId?: string; // If related to challenge
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt?: Date;
  isSticky: boolean;
  isFeatured: boolean;
}

export interface UserFollow {
  followerId: string;
  followingId: string;
  followingName: string;
  followingAvatar?: string;
  createdAt: Date;
  notifications: boolean; // Get notified of their activities
}

export interface ExpertProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  specialties: string[];
  credentials: string[];
  experience: number; // years
  rating: number;
  consultations: number;
  isVerified: boolean;
  isAvailable: boolean;
  hourlyRate?: number;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  stats: {
    recipesShared: number;
    followersCount: number;
    totalLikes: number;
    challengesJudged: number;
  };
}

export interface ExpertConsultation {
  id: string;
  expertId: string;
  userId: string;
  type: 'nutrition' | 'technique' | 'menu_planning' | 'dietary_needs' | 'general';
  question: string;
  additionalInfo?: any;
  response?: string;
  status: 'pending' | 'answered' | 'follow_up' | 'closed';
  isPublic: boolean; // Can be shared with community
  scheduledAt?: Date; // For live consultations
  createdAt: Date;
  answeredAt?: Date;
  rating?: number;
  feedback?: string;
}

export interface SocialFeed {
  posts: CommunityPost[];
  suggestions: {
    recipesToTry: CommunityRecipe[];
    usersToFollow: UserProfile[];
    challengesToJoin: CookingChallenge[];
    expertsToConsult: ExpertProfile[];
  };
  trending: {
    hashtags: string[];
    recipes: CommunityRecipe[];
    ingredients: string[];
  };
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedAt: Date;
  stats: {
    recipesShared: number;
    followersCount: number;
    followingCount: number;
    totalLikes: number;
    challengesParticipated: number;
    challengesWon: number;
  };
  badges: UserBadge[];
  preferences: {
    showEmail: boolean;
    showLocation: boolean;
    allowMessages: boolean;
    notifyOnFollow: boolean;
    notifyOnLike: boolean;
    notifyOnComment: boolean;
  };
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: Date;
  category: 'cooking' | 'community' | 'challenge' | 'expert' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export class CommunityService {
  private apiUrl: string;
  private authToken?: string;

  constructor(apiUrl: string, authToken?: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  /**
   * Recipe sharing and discovery
   */
  async shareRecipe(recipe: Partial<CommunityRecipe>): Promise<CommunityRecipe> {
    const response = await this.post('/community/recipes', recipe);
    return response.data;
  }

  async getRecipes(filters: {
    category?: string;
    difficulty?: string;
    maxTime?: number;
    dietary?: string[];
    author?: string;
    rating?: number;
    trending?: boolean;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ recipes: CommunityRecipe[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await this.get(`/community/recipes?${params}`);
    return response.data;
  }

  async getRecipeById(id: string): Promise<CommunityRecipe> {
    const response = await this.get(`/community/recipes/${id}`);
    return response.data;
  }

  async rateRecipe(recipeId: string, rating: Omit<RecipeRating, 'id' | 'createdAt'>): Promise<RecipeRating> {
    const response = await this.post(`/community/recipes/${recipeId}/ratings`, rating);
    return response.data;
  }

  async commentOnRecipe(recipeId: string, comment: Omit<RecipeComment, 'id' | 'createdAt'>): Promise<RecipeComment> {
    const response = await this.post(`/community/recipes/${recipeId}/comments`, comment);
    return response.data;
  }

  /**
   * Recipe collections
   */
  async createCollection(collection: Omit<RecipeCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecipeCollection> {
    const response = await this.post('/community/collections', collection);
    return response.data;
  }

  async getUserCollections(userId: string): Promise<RecipeCollection[]> {
    const response = await this.get(`/community/users/${userId}/collections`);
    return response.data;
  }

  async addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
    await this.post(`/community/collections/${collectionId}/recipes`, { recipeId });
  }

  /**
   * Cooking challenges
   */
  async getCookingChallenges(status?: CookingChallenge['status']): Promise<CookingChallenge[]> {
    const params = status ? `?status=${status}` : '';
    const response = await this.get(`/community/challenges${params}`);
    return response.data;
  }

  async joinChallenge(challengeId: string): Promise<void> {
    await this.post(`/community/challenges/${challengeId}/join`);
  }

  async submitToChallenge(challengeId: string, submission: Omit<ChallengeSubmission, 'id' | 'submittedAt'>): Promise<ChallengeSubmission> {
    const response = await this.post(`/community/challenges/${challengeId}/submissions`, submission);
    return response.data;
  }

  async voteOnSubmission(submissionId: string): Promise<void> {
    await this.post(`/community/submissions/${submissionId}/vote`);
  }

  /**
   * Social feed
   */
  async getSocialFeed(limit: number = 20, offset: number = 0): Promise<SocialFeed> {
    const response = await this.get(`/community/feed?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async createPost(post: Omit<CommunityPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'shares'>): Promise<CommunityPost> {
    const response = await this.post('/community/posts', post);
    return response.data;
  }

  async likePost(postId: string): Promise<void> {
    await this.post(`/community/posts/${postId}/like`);
  }

  async sharePost(postId: string, message?: string): Promise<void> {
    await this.post(`/community/posts/${postId}/share`, { message });
  }

  /**
   * User following system
   */
  async followUser(userId: string, notifications: boolean = true): Promise<UserFollow> {
    const response = await this.post('/community/follows', { 
      followingId: userId, 
      notifications 
    });
    return response.data;
  }

  async unfollowUser(userId: string): Promise<void> {
    await this.delete(`/community/follows/${userId}`);
  }

  async getFollowing(userId: string): Promise<UserFollow[]> {
    const response = await this.get(`/community/users/${userId}/following`);
    return response.data;
  }

  async getFollowers(userId: string): Promise<UserFollow[]> {
    const response = await this.get(`/community/users/${userId}/followers`);
    return response.data;
  }

  /**
   * Expert consultations
   */
  async getExperts(specialty?: string): Promise<ExpertProfile[]> {
    const params = specialty ? `?specialty=${specialty}` : '';
    const response = await this.get(`/community/experts${params}`);
    return response.data;
  }

  async requestConsultation(consultation: Omit<ExpertConsultation, 'id' | 'createdAt' | 'status'>): Promise<ExpertConsultation> {
    const response = await this.post('/community/consultations', consultation);
    return response.data;
  }

  async getMyConsultations(): Promise<ExpertConsultation[]> {
    const response = await this.get('/community/consultations/me');
    return response.data;
  }

  /**
   * User profile and badges
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await this.get(`/community/users/${userId}/profile`);
    return response.data;
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.put('/community/profile', profile);
    return response.data;
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const response = await this.get(`/community/users/${userId}/badges`);
    return response.data;
  }

  /**
   * Search functionality
   */
  async searchRecipes(query: string, filters?: any): Promise<CommunityRecipe[]> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await this.get(`/community/search/recipes?${params}`);
    return response.data;
  }

  async searchUsers(query: string): Promise<UserProfile[]> {
    const response = await this.get(`/community/search/users?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async searchChallenges(query: string): Promise<CookingChallenge[]> {
    const response = await this.get(`/community/search/challenges?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Content moderation
   */
  async reportContent(contentType: 'recipe' | 'post' | 'comment', contentId: string, reason: string): Promise<void> {
    await this.post('/community/reports', {
      contentType,
      contentId,
      reason
    });
  }

  async blockUser(userId: string): Promise<void> {
    await this.post(`/community/users/${userId}/block`);
  }

  async unblockUser(userId: string): Promise<void> {
    await this.delete(`/community/users/${userId}/block`);
  }

  /**
   * Analytics and insights
   */
  async getCommunityStats(): Promise<{
    totalRecipes: number;
    totalUsers: number;
    activeChallenges: number;
    totalInteractions: number;
    topChefs: UserProfile[];
    trendingRecipes: CommunityRecipe[];
    upcomingChallenges: CookingChallenge[];
  }> {
    const response = await this.get('/community/stats');
    return response.data;
  }

  async getUserStats(userId: string): Promise<{
    recipesShared: number;
    totalLikes: number;
    totalComments: number;
    challengesParticipated: number;
    challengesWon: number;
    followersGained: number;
    engagementRate: number;
    topRecipes: CommunityRecipe[];
    recentActivity: CommunityPost[];
  }> {
    const response = await this.get(`/community/users/${userId}/stats`);
    return response.data;
  }

  /**
   * Helper methods for API calls
   */
  private async get(endpoint: string): Promise<any> {
    return this.request('GET', endpoint);
  }

  private async post(endpoint: string, data?: any): Promise<any> {
    return this.request('POST', endpoint, data);
  }

  private async put(endpoint: string, data?: any): Promise<any> {
    return this.request('PUT', endpoint, data);
  }

  private async delete(endpoint: string): Promise<any> {
    return this.request('DELETE', endpoint);
  }

  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Community API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Update authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }
}

// Export singleton instance
let communityServiceInstance: CommunityService | null = null;

export function getCommunityService(apiUrl?: string, authToken?: string): CommunityService {
  const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  if (!communityServiceInstance) {
    communityServiceInstance = new CommunityService(apiUrl || defaultApiUrl, authToken);
  }
  
  // Update auth token if provided
  if (authToken) {
    communityServiceInstance.setAuthToken(authToken);
  }
  
  return communityServiceInstance;
}