export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Utility types for table names and RPC functions
export type TableName = keyof Database['public']['Tables'];
export type RpcFunctionName = keyof Database['public']['Functions'];

export type Database = {
  public: {
    Tables: {
      inventory: {
        Row: {
          id: string
          user_id: string
          product_id: string
          name: string
          category: string | null
          quantity: number
          unit: string | null
          expiration_date: string | null
          location: Json | null
          freshness: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          name: string
          category?: string | null
          quantity?: number
          unit?: string | null
          expiration_date?: string | null
          location?: Json | null
          freshness?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          name?: string
          category?: string | null
          quantity?: number
          unit?: string | null
          expiration_date?: string | null
          location?: Json | null
          freshness?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          category: string | null
          barcode: string | null
          brand: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          barcode?: string | null
          brand?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          barcode?: string | null
          brand?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          ingredients: Json | null
          instructions: string | null
          prep_time_minutes: number | null
          servings: number | null
          difficulty: string | null
          category: string | null
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          ingredients?: Json | null
          instructions?: string | null
          prep_time_minutes?: number | null
          servings?: number | null
          difficulty?: string | null
          category?: string | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          ingredients?: Json | null
          instructions?: string | null
          prep_time_minutes?: number | null
          servings?: number | null
          difficulty?: string | null
          category?: string | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          name: string
          quantity: number | null
          unit: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          quantity?: number | null
          unit?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recipe_conversations: {
        Row: {
          id: string
          user_id: string
          recipe_id: string | null
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id?: string | null
          messages: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipe_id?: string | null
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          id: string
          user_id: string
          list_id: string
          name: string
          quantity: number
          unit: string | null
          category: string | null
          is_checked: boolean
          priority: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          list_id: string
          name: string
          quantity?: number
          unit?: string | null
          category?: string | null
          is_checked?: boolean
          priority?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          list_id?: string
          name?: string
          quantity?: number
          unit?: string | null
          category?: string | null
          is_checked?: boolean
          priority?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          preferences: Json | null
          dietary_restrictions: string[] | null
          allergens: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json | null
          dietary_restrictions?: string[] | null
          allergens?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json | null
          dietary_restrictions?: string[] | null
          allergens?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // PRP-223 PR1 — Assistant Memory Foundation. Mapping the SQL schema from
      // supabase/migrations/20260513120000_create_assistant_memory_foundation.sql.
      assistant_conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          mode: 'general' | 'kitchen' | 'shopping' | 'inventory' | 'recipes' | 'nutrition' | 'cooking'
          status: 'active' | 'archived' | 'deleted'
          last_message_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          mode?: 'general' | 'kitchen' | 'shopping' | 'inventory' | 'recipes' | 'nutrition' | 'cooking'
          status?: 'active' | 'archived' | 'deleted'
          last_message_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          mode?: 'general' | 'kitchen' | 'shopping' | 'inventory' | 'recipes' | 'nutrition' | 'cooking'
          status?: 'active' | 'archived' | 'deleted'
          last_message_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          content_format: 'text' | 'transcript' | 'tool_result' | 'summary'
          audio_transcript: string | null
          tool_calls: Json
          action_log_ids: string[]
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          content_format?: 'text' | 'transcript' | 'tool_result' | 'summary'
          audio_transcript?: string | null
          tool_calls?: Json
          action_log_ids?: string[]
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system' | 'tool'
          content?: string
          content_format?: 'text' | 'transcript' | 'tool_result' | 'summary'
          audio_transcript?: string | null
          tool_calls?: Json
          action_log_ids?: string[]
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      assistant_memory_items: {
        Row: {
          id: string
          user_id: string
          kind: 'preference' | 'negative_preference' | 'habit' | 'cooking_style' | 'diet_goal' | 'constraint' | 'recipe_feedback' | 'shopping_pattern' | 'response_style'
          scope: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary'
          status: 'candidate' | 'active' | 'rejected' | 'deleted'
          subject_type: string | null
          subject_id: string | null
          content: string
          normalized_content: string | null
          confidence: number
          sensitivity: 'normal' | 'personal' | 'health_sensitive'
          source: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system'
          evidence: Json
          approved_at: string | null
          last_used_at: string | null
          expires_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: 'preference' | 'negative_preference' | 'habit' | 'cooking_style' | 'diet_goal' | 'constraint' | 'recipe_feedback' | 'shopping_pattern' | 'response_style'
          scope?: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary'
          status?: 'candidate' | 'active' | 'rejected' | 'deleted'
          subject_type?: string | null
          subject_id?: string | null
          content: string
          normalized_content?: string | null
          confidence?: number
          sensitivity?: 'normal' | 'personal' | 'health_sensitive'
          source?: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system'
          evidence?: Json
          approved_at?: string | null
          last_used_at?: string | null
          expires_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: 'preference' | 'negative_preference' | 'habit' | 'cooking_style' | 'diet_goal' | 'constraint' | 'recipe_feedback' | 'shopping_pattern' | 'response_style'
          scope?: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary'
          status?: 'candidate' | 'active' | 'rejected' | 'deleted'
          subject_type?: string | null
          subject_id?: string | null
          content?: string
          normalized_content?: string | null
          confidence?: number
          sensitivity?: 'normal' | 'personal' | 'health_sensitive'
          source?: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system'
          evidence?: Json
          approved_at?: string | null
          last_used_at?: string | null
          expires_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_conversation_summaries: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          summary: string
          covered_message_ids: string[]
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          summary: string
          covered_message_ids?: string[]
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          summary?: string
          covered_message_ids?: string[]
          model_used?: string | null
          created_at?: string
        }
        Relationships: []
      }
      assistant_session_context: {
        Row: {
          id: string
          user_id: string
          conversation_id: string | null
          key: string
          value: Json
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id?: string | null
          key: string
          value: Json
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string | null
          key?: string
          value?: Json
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      cooking_journal_entries: {
        Row: {
          id: string
          user_id: string
          recipe_id: string | null
          recipe_title: string
          cooked_at: string
          rating: number | null
          outcome: 'loved' | 'liked' | 'ok' | 'disliked' | 'failed' | null
          notes: string | null
          substitutions: Json
          adjustments: Json
          would_cook_again: boolean | null
          created_from_message_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id?: string | null
          recipe_title: string
          cooked_at?: string
          rating?: number | null
          outcome?: 'loved' | 'liked' | 'ok' | 'disliked' | 'failed' | null
          notes?: string | null
          substitutions?: Json
          adjustments?: Json
          would_cook_again?: boolean | null
          created_from_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipe_id?: string | null
          recipe_title?: string
          cooked_at?: string
          rating?: number | null
          outcome?: 'loved' | 'liked' | 'ok' | 'disliked' | 'failed' | null
          notes?: string | null
          substitutions?: Json
          adjustments?: Json
          would_cook_again?: boolean | null
          created_from_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // PRP-226 PR3 — Kitchen Recommendation Engine event log + cache + interactions.
      recommendation_events: {
        Row: {
          id: string
          user_id: string
          conversation_id: string | null
          assistant_message_id: string | null
          request_text: string | null
          context: Json
          candidate_count: number
          results: Json
          selected_recipe_id: string | null
          accepted: boolean | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id?: string | null
          assistant_message_id?: string | null
          request_text?: string | null
          context?: Json
          candidate_count?: number
          results?: Json
          selected_recipe_id?: string | null
          accepted?: boolean | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string | null
          assistant_message_id?: string | null
          request_text?: string | null
          context?: Json
          candidate_count?: number
          results?: Json
          selected_recipe_id?: string | null
          accepted?: boolean | null
          feedback?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recipe_recommendation_cache: {
        Row: {
          id: string
          user_id: string
          cache_key: string
          result_json: Json
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cache_key: string
          result_json: Json
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cache_key?: string
          result_json?: Json
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      recipe_interactions: {
        Row: {
          id: string
          user_id: string
          recipe_id: string | null
          recommendation_event_id: string | null
          interaction_type:
            | 'viewed'
            | 'recommended'
            | 'accepted'
            | 'dismissed'
            | 'cooked'
            | 'added_missing_to_shopping'
            | 'planned'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id?: string | null
          recommendation_event_id?: string | null
          interaction_type:
            | 'viewed'
            | 'recommended'
            | 'accepted'
            | 'dismissed'
            | 'cooked'
            | 'added_missing_to_shopping'
            | 'planned'
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipe_id?: string | null
          recommendation_event_id?: string | null
          interaction_type?:
            | 'viewed'
            | 'recommended'
            | 'accepted'
            | 'dismissed'
            | 'cooked'
            | 'added_missing_to_shopping'
            | 'planned'
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      consume_inventory_item: {
        Args: {
          p_item_id: string
          p_user_id: string
          p_amount: number
        }
        Returns: Json
      }
      transfer_inventory: {
        Args: {
          p_from_id: string
          p_to_id: string
          p_user_id: string
          p_amount: number
        }
        Returns: Json
      }
      create_shopping_from_recipe: {
        Args: {
          p_recipe_id: string
          p_user_id: string
          p_list_id: string
        }
        Returns: Json[]
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
