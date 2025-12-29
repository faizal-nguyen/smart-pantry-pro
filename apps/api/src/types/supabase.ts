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
