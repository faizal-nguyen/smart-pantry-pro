import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { UserRepository } from '../repositories/UserRepository.js';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type CreateUserProfileData = Database['public']['Tables']['user_profiles']['Insert'];
type UpdateUserProfileData = Database['public']['Tables']['user_profiles']['Update'];

/**
 * UserService - Business logic for user profile management
 */
export class UserService {
  private repository: UserRepository;

  constructor(supabase: SupabaseClient<Database>) {
    this.repository = new UserRepository(supabase);
  }

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get full user profile with statistics
   */
  async getFullProfile(userId: string) {
    return this.repository.getFullProfile(userId);
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(
    userId: string,
    data: Partial<UpdateUserProfileData>
  ): Promise<UserProfile> {
    return this.repository.upsertProfile({
      id: userId,
      ...data,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<UserProfile> {
    // Validate preferences structure (optional - add your validation logic)
    const validatedPreferences = this.validatePreferences(preferences);

    return this.repository.updatePreferences(userId, validatedPreferences);
  }

  /**
   * Update dietary restrictions
   */
  async updateDietaryRestrictions(
    userId: string,
    restrictions: string[]
  ): Promise<UserProfile> {
    // Validate restrictions
    const validRestrictions = restrictions.filter(r => r && r.trim().length > 0);

    return this.repository.updateDietaryRestrictions(userId, validRestrictions);
  }

  /**
   * Update allergens
   */
  async updateAllergens(
    userId: string,
    allergens: string[]
  ): Promise<UserProfile> {
    // Validate allergens
    const validAllergens = allergens.filter(a => a && a.trim().length > 0);

    return this.repository.updateAllergens(userId, validAllergens);
  }

  /**
   * Check if user has specific dietary restriction
   */
  async hasDietaryRestriction(userId: string, restriction: string): Promise<boolean> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile || !profile.dietary_restrictions) {
      return false;
    }

    return profile.dietary_restrictions.includes(restriction);
  }

  /**
   * Check if user has specific allergen
   */
  async hasAllergen(userId: string, allergen: string): Promise<boolean> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile || !profile.allergens) {
      return false;
    }

    return profile.allergens.includes(allergen);
  }

  /**
   * Get user preference value
   */
  async getPreference<T = any>(userId: string, key: string, defaultValue?: T): Promise<T | undefined> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile || !profile.preferences) {
      return defaultValue;
    }

    const preferences = profile.preferences as Record<string, any>;
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }

  /**
   * Set user preference value
   */
  async setPreference(userId: string, key: string, value: any): Promise<UserProfile> {
    const profile = await this.repository.findByUserId(userId);
    const currentPreferences = (profile?.preferences as Record<string, any>) || {};

    const updatedPreferences = {
      ...currentPreferences,
      [key]: value
    };

    return this.repository.updatePreferences(userId, updatedPreferences);
  }

  /**
   * Soft delete user profile
   */
  async deactivate(userId: string): Promise<void> {
    return this.repository.softDelete(userId);
  }

  /**
   * Reactivate user profile
   */
  async reactivate(userId: string): Promise<UserProfile> {
    return this.repository.reactivate(userId);
  }

  /**
   * Validate preferences structure
   */
  private validatePreferences(preferences: Record<string, any>): Record<string, any> {
    // Add your preference validation logic here
    // For now, just return the preferences as-is
    return preferences;
  }

  /**
   * Get user statistics summary
   */
  async getStatsSummary(userId: string): Promise<{
    inventoryItems: number;
    recipes: number;
    shoppingLists: number;
    dietaryRestrictions: number;
    allergens: number;
  }> {
    const fullProfile = await this.repository.getFullProfile(userId);

    return {
      ...fullProfile.stats,
      dietaryRestrictions: fullProfile.profile.dietary_restrictions?.length || 0,
      allergens: fullProfile.profile.allergens?.length || 0
    };
  }

  /**
   * Check if profile is complete (has all required fields)
   */
  async isProfileComplete(userId: string): Promise<boolean> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      return false;
    }

    // Define required fields for a complete profile
    const requiredFields = [
      'full_name',
      'email'
    ];

    return requiredFields.every(field => {
      const value = profile[field as keyof UserProfile];
      return value !== null && value !== undefined && value !== '';
    });
  }

  /**
   * Get profile completion percentage
   */
  async getProfileCompletionPercentage(userId: string): Promise<number> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      return 0;
    }

    const fields = [
      'full_name',
      'email',
      'avatar_url',
      'dietary_restrictions',
      'allergens',
      'preferences'
    ];

    let completedFields = 0;
    fields.forEach(field => {
      const value = profile[field as keyof UserProfile];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          completedFields++;
        } else if (!Array.isArray(value)) {
          completedFields++;
        }
      }
    });

    return Math.round((completedFields / fields.length) * 100);
  }
}
