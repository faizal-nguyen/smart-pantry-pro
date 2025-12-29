import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../utils/errors.js';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export class UserRepository extends BaseRepository<UserProfile> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'user_profiles');
  }

  /**
   * Find user profile by user ID (override to handle user_id differently)
   */
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ preferences })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  /**
   * Update dietary restrictions
   */
  async updateDietaryRestrictions(
    userId: string,
    restrictions: string[]
  ): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ dietary_restrictions: restrictions })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  /**
   * Update allergens
   */
  async updateAllergens(
    userId: string,
    allergens: string[]
  ): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ allergens })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  /**
   * Get user full profile with related data counts
   */
  async getFullProfile(userId: string): Promise<{
    profile: UserProfile;
    stats: {
      inventoryItems: number;
      recipes: number;
      shoppingLists: number;
    };
  }> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    // Get counts for related entities
    const [inventoryCount, recipesCount, shoppingCount] = await Promise.all([
      this.supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then(({ count }) => count || 0),

      this.supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then(({ count }) => count || 0),

      this.supabase
        .from('shopping_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then(({ count }) => count || 0)
    ]);

    return {
      profile,
      stats: {
        inventoryItems: inventoryCount,
        recipes: recipesCount,
        shoppingLists: shoppingCount
      }
    };
  }

  /**
   * Create or update user profile (upsert)
   */
  async upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(profile as any, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  /**
   * Soft delete user profile (mark as inactive)
   */
  async softDelete(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Reactivate user profile
   */
  async reactivate(userId: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }
}
