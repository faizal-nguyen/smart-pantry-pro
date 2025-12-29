/**
 * Family Context Service - Gestion des Profils Famille et Contrôles Parentaux
 * Service centralisé pour le mode famille de Smart Pantry Pro
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  FamilyProfile, 
  ParentalControls, 
  FamilyNavigationConfig, 
  AgeAdaptiveInterface,
  FamilyActivityLog,
  NavigationHistoryEntry,
  NavigationSection,
  DEFAULT_AGE_GROUPS,
  FAMILY_NAVIGATION_SECTIONS
} from '@/types/family-mode';

export class FamilyContextService {
  private static instance: FamilyContextService;
  private currentConfig: FamilyNavigationConfig | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): FamilyContextService {
    if (!FamilyContextService.instance) {
      FamilyContextService.instance = new FamilyContextService();
    }
    return FamilyContextService.instance;
  }

  /**
   * Initialiser le service famille avec l'utilisateur actuel
   */
  async initialize(userId: string): Promise<FamilyNavigationConfig> {
    try {
      // Charger le profil principal de l'utilisateur
      const mainProfile = await this.loadMainProfile(userId);
      
      // Charger les profils enfants
      const childProfiles = await this.loadChildProfiles(userId);
      
      // Charger les contrôles parentaux
      const parentalControls = await this.loadParentalControls(userId);
      
      // Déterminer le profil actif (dernier utilisé ou principal)
      const activeProfile = await this.getActiveProfile(userId) || mainProfile;
      
      // Configurer l'interface adaptative
      const adaptiveInterface = this.generateAdaptiveInterface(activeProfile);
      
      this.currentConfig = {
        currentProfile: activeProfile,
        availableProfiles: [mainProfile, ...childProfiles],
        parentalControls,
        isFamilyModeActive: childProfiles.length > 0,
        isSupervisionMode: false,
        isEmergencyMode: false,
        adaptiveInterface,
        securityLevel: this.determineSecurityLevel(activeProfile, parentalControls),
        supervisionSettings: {
          showParentNotifications: parentalControls?.settings.childActivityAlerts || false,
          logNavigationHistory: parentalControls?.settings.realTimeMonitoring || false,
          requireConfirmation: this.getRequiredConfirmations(activeProfile, parentalControls)
        }
      };

      // Émettre l'événement d'initialisation
      this.emit('family_config_initialized', this.currentConfig);
      
      return this.currentConfig;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service famille:', error);
      throw error;
    }
  }

  /**
   * Charger le profil principal de l'utilisateur
   */
  private async loadMainProfile(userId: string): Promise<FamilyProfile> {
    try {
      // Essayer de charger depuis Supabase d'abord
      const { data: existingProfile } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'parent')
        .single();

      if (existingProfile) {
        return this.mapDatabaseToProfile(existingProfile);
      }

      // Créer un profil par défaut si aucun n'existe
      const { data: userData } = await supabase.auth.getUser();
      const defaultProfile: FamilyProfile = {
        id: userId,
        name: userData.user?.user_metadata?.full_name || 'Parent',
        type: 'parent',
        preferences: {
          language: 'fr',
          theme: 'auto',
          colorScheme: 'default',
          fontSize: 'medium',
          simplifiedUI: false,
          voiceEnabled: true,
          hapticFeedback: true,
          soundEffects: false
        },
        restrictions: {
          allowedSections: ['pantry', 'kitchen', 'shopping', 'assistant', 'insights', 'settings'],
          blockedFeatures: [],
          allergenAlerts: [],
          dietaryRestrictions: [],
          requireParentalApproval: false,
          logAllActivities: false,
          shareLocationInStore: false
        },
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: new Date()
      };

      // Sauvegarder le profil par défaut
      await this.saveProfile(defaultProfile, userId);
      
      return defaultProfile;
    } catch (error) {
      console.error('Erreur lors du chargement du profil principal:', error);
      throw error;
    }
  }

  /**
   * Charger les profils enfants
   */
  private async loadChildProfiles(userId: string): Promise<FamilyProfile[]> {
    try {
      const { data: childProfiles } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'child')
        .order('created_at', { ascending: true });

      return childProfiles?.map(profile => this.mapDatabaseToProfile(profile)) || [];
    } catch (error) {
      console.error('Erreur lors du chargement des profils enfants:', error);
      return [];
    }
  }

  /**
   * Charger les contrôles parentaux
   */
  private async loadParentalControls(userId: string): Promise<ParentalControls | null> {
    try {
      const { data: controls } = await supabase
        .from('parental_controls')
        .select('*')
        .eq('parent_id', userId)
        .single();

      if (!controls) return null;

      return {
        id: controls.id,
        parentId: controls.parent_id,
        isEnabled: controls.is_enabled,
        settings: controls.settings,
        createdAt: new Date(controls.created_at),
        updatedAt: new Date(controls.updated_at)
      };
    } catch (error) {
      console.error('Erreur lors du chargement des contrôles parentaux:', error);
      return null;
    }
  }

  /**
   * Obtenir le profil actuellement actif
   */
  private async getActiveProfile(userId: string): Promise<FamilyProfile | null> {
    try {
      const { data: activeSession } = await supabase
        .from('family_sessions')
        .select('profile_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!activeSession) return null;

      const { data: profile } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('id', activeSession.profile_id)
        .single();

      return profile ? this.mapDatabaseToProfile(profile) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil actif:', error);
      return null;
    }
  }

  /**
   * Générer l'interface adaptative selon le profil
   */
  private generateAdaptiveInterface(profile: FamilyProfile): AgeAdaptiveInterface {
    if (profile.type === 'parent') {
      return DEFAULT_AGE_GROUPS['18+'];
    }

    const age = profile.age || 18;
    
    if (age <= 6) return DEFAULT_AGE_GROUPS['3-6'];
    if (age <= 12) return DEFAULT_AGE_GROUPS['7-12'];
    if (age <= 17) return DEFAULT_AGE_GROUPS['13-17'];
    
    return DEFAULT_AGE_GROUPS['18+'];
  }

  /**
   * Déterminer le niveau de sécurité
   */
  private determineSecurityLevel(
    profile: FamilyProfile, 
    controls: ParentalControls | null
  ): 'minimal' | 'standard' | 'strict' | 'maximum' {
    if (profile.type === 'parent') return 'minimal';
    
    if (!controls || !controls.isEnabled) return 'standard';
    
    const age = profile.age || 18;
    if (age <= 6) return 'maximum';
    if (age <= 12) return 'strict';
    if (age <= 17) return 'standard';
    
    return 'minimal';
  }

  /**
   * Obtenir les actions nécessitant confirmation
   */
  private getRequiredConfirmations(
    profile: FamilyProfile, 
    controls: ParentalControls | null
  ): string[] {
    if (profile.type === 'parent') return [];
    
    const confirmations: string[] = [];
    
    if (controls?.settings.approvalRequired.purchases) {
      confirmations.push('purchase', 'add_to_cart', 'modify_shopping_list');
    }
    
    if (controls?.settings.approvalRequired.recipeSharing) {
      confirmations.push('share_recipe', 'save_recipe', 'rate_recipe');
    }
    
    if (controls?.settings.approvalRequired.socialFeatures) {
      confirmations.push('join_community', 'post_comment', 'share_achievement');
    }
    
    return confirmations;
  }

  /**
   * Changer de profil actif
   */
  async switchProfile(profileId: string, userId: string): Promise<FamilyProfile> {
    try {
      // Vérifier que le profil appartient à l'utilisateur
      const { data: profile } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('id', profileId)
        .eq('user_id', userId)
        .single();

      if (!profile) {
        throw new Error('Profil non trouvé ou non autorisé');
      }

      // Désactiver l'ancienne session
      await supabase
        .from('family_sessions')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Créer une nouvelle session active
      await supabase
        .from('family_sessions')
        .insert({
          user_id: userId,
          profile_id: profileId,
          is_active: true,
          started_at: new Date().toISOString()
        });

      // Mettre à jour la dernière activité du profil
      await supabase
        .from('family_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', profileId);

      const familyProfile = this.mapDatabaseToProfile(profile);
      
      // Mettre à jour la configuration actuelle
      if (this.currentConfig) {
        this.currentConfig.currentProfile = familyProfile;
        this.currentConfig.adaptiveInterface = this.generateAdaptiveInterface(familyProfile);
        this.currentConfig.securityLevel = this.determineSecurityLevel(familyProfile, this.currentConfig.parentalControls);
      }

      // Enregistrer l'activité
      await this.logActivity(profileId, 'navigation', `Basculement vers le profil ${familyProfile.name}`, 'info');

      this.emit('profile_switched', familyProfile);
      
      return familyProfile;
    } catch (error) {
      console.error('Erreur lors du changement de profil:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau profil enfant
   */
  async createChildProfile(
    childData: Omit<FamilyProfile, 'id'>,
    parentUserId: string
  ): Promise<FamilyProfile> {
    try {
      const profileData = {
        user_id: parentUserId,
        name: childData.name,
        type: 'child',
        age: childData.age,
        avatar: childData.avatar,
        preferences: childData.preferences,
        restrictions: childData.restrictions,
        is_active: true,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      };

      const { data: newProfile, error } = await supabase
        .from('family_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;

      const familyProfile = this.mapDatabaseToProfile(newProfile);
      
      // Mettre à jour la configuration si nécessaire
      if (this.currentConfig) {
        this.currentConfig.availableProfiles.push(familyProfile);
        this.currentConfig.isFamilyModeActive = true;
      }

      // Enregistrer l'activité
      await this.logActivity(
        parentUserId, 
        'navigation', 
        `Création du profil enfant ${familyProfile.name}`, 
        'info'
      );

      this.emit('child_profile_created', familyProfile);
      
      return familyProfile;
    } catch (error) {
      console.error('Erreur lors de la création du profil enfant:', error);
      throw error;
    }
  }

  /**
   * Vérifier l'accès à une section
   */
  canAccessSection(section: NavigationSection, profile?: FamilyProfile): boolean {
    const currentProfile = profile || this.currentConfig?.currentProfile;
    if (!currentProfile) return false;

    // Les parents ont accès à tout
    if (currentProfile.type === 'parent') return true;

    // Vérifier les restrictions du profil
    if (!currentProfile.restrictions.allowedSections.includes(section)) return false;

    // Vérifier l'âge minimum
    const sectionConfig = FAMILY_NAVIGATION_SECTIONS[section];
    if (sectionConfig && currentProfile.age && currentProfile.age < sectionConfig.minAge) {
      return false;
    }

    return true;
  }

  /**
   * Vérifier si une action nécessite une approbation parentale
   */
  requiresParentalApproval(action: string, profile?: FamilyProfile): boolean {
    const currentProfile = profile || this.currentConfig?.currentProfile;
    if (!currentProfile || currentProfile.type === 'parent') return false;

    const requiredConfirmations = this.currentConfig?.supervisionSettings.requireConfirmation || [];
    return requiredConfirmations.includes(action);
  }

  /**
   * Enregistrer une activité dans le journal
   */
  async logActivity(
    profileId: string,
    type: FamilyActivityLog['type'],
    description: string,
    severity: 'info' | 'warning' | 'alert',
    data?: any
  ): Promise<void> {
    try {
      await supabase
        .from('family_activity_logs')
        .insert({
          profile_id: profileId,
          type,
          description,
          data,
          severity,
          timestamp: new Date().toISOString(),
          parent_notified: false
        });

      // Si c'est une alerte ou un warning et que les notifications sont activées
      if (severity !== 'info' && this.currentConfig?.supervisionSettings.showParentNotifications) {
        await this.notifyParent(profileId, description, severity);
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    }
  }

  /**
   * Enregistrer l'historique de navigation
   */
  async logNavigation(
    profileId: string,
    section: NavigationSection,
    path: string,
    duration: number,
    actions: string[]
  ): Promise<void> {
    try {
      if (!this.currentConfig?.supervisionSettings.logNavigationHistory) return;

      await supabase
        .from('navigation_history')
        .insert({
          profile_id: profileId,
          section,
          path,
          timestamp: new Date().toISOString(),
          duration,
          actions,
          parent_approval_required: this.requiresParentalApproval('navigation'),
          parent_approval_granted: false
        });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la navigation:', error);
    }
  }

  /**
   * Notifier les parents
   */
  private async notifyParent(
    childProfileId: string,
    message: string,
    severity: 'warning' | 'alert'
  ): Promise<void> {
    // Implémentation des notifications push/email pour les parents
    // À implémenter selon les besoins spécifiques
    console.log(`NOTIFICATION PARENT [${severity}]: ${message} pour le profil ${childProfileId}`);
  }

  /**
   * Mapper les données de la base vers le type FamilyProfile
   */
  private mapDatabaseToProfile(dbProfile: any): FamilyProfile {
    return {
      id: dbProfile.id,
      name: dbProfile.name,
      type: dbProfile.type,
      age: dbProfile.age,
      avatar: dbProfile.avatar,
      preferences: dbProfile.preferences,
      restrictions: dbProfile.restrictions,
      isActive: dbProfile.is_active,
      createdAt: new Date(dbProfile.created_at),
      lastActiveAt: new Date(dbProfile.last_active_at)
    };
  }

  /**
   * Sauvegarder un profil
   */
  private async saveProfile(profile: FamilyProfile, userId: string): Promise<void> {
    const profileData = {
      id: profile.id,
      user_id: userId,
      name: profile.name,
      type: profile.type,
      age: profile.age,
      avatar: profile.avatar,
      preferences: profile.preferences,
      restrictions: profile.restrictions,
      is_active: profile.isActive,
      created_at: profile.createdAt.toISOString(),
      last_active_at: profile.lastActiveAt.toISOString()
    };

    await supabase
      .from('family_profiles')
      .upsert(profileData);
  }

  /**
   * Obtenir la configuration actuelle
   */
  getCurrentConfig(): FamilyNavigationConfig | null {
    return this.currentConfig;
  }

  /**
   * Système d'événements
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }
}

export default FamilyContextService;