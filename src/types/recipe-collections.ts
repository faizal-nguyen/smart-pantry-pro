// Recipe Collections types (pattern Cipher)

export interface RecipeCollection {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_public: boolean;
  share_code?: string; // Unique code for sharing
  tags: string[];
  recipe_count?: number;
  view_count: number;
  favorite_count: number;
  // Metadata
  created_by?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CollectionRecipe {
  id: string;
  collection_id: string;
  recipe_id: string;
  added_at: string;
  added_by: string;
  notes?: string;
  order_index: number;
  // Joined recipe data
  recipe?: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    cuisine_category?: string;
    prep_time: number;
    cook_time: number;
    servings: number;
    difficulty: number;
    tags: string[];
  };
}

export interface CollectionShare {
  id: string;
  collection_id: string;
  shared_by: string;
  shared_with?: string; // Email or user_id
  share_type: 'public' | 'private' | 'link';
  permissions: 'view' | 'edit';
  expires_at?: string;
  created_at: string;
  access_count: number;
}

export interface CollectionActivity {
  id: string;
  collection_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'shared' | 'recipe_added' | 'recipe_removed' | 'viewed';
  details?: any;
  created_at: string;
}

// Collection permissions
export interface CollectionPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canAddRecipes: boolean;
  canRemoveRecipes: boolean;
  isOwner: boolean;
}

// Collection filters
export interface CollectionFilters {
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'recipe_count' | 'view_count';
  sortOrder?: 'asc' | 'desc';
}

// Collection statistics
export interface CollectionStats {
  total_collections: number;
  public_collections: number;
  private_collections: number;
  total_recipes: number;
  total_views: number;
  total_favorites: number;
  most_popular?: RecipeCollection;
  recently_updated?: RecipeCollection[];
}