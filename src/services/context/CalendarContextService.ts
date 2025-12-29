// Google APIs are handled server-side only - client uses API endpoints
import { supabase } from '@/integrations/supabase/client';
import { contextualPerformanceOptimizer } from './PerformanceOptimizer';
import {
  CalendarEvent,
  EventCategory,
  MealTimeSlots,
  DaySchedule,
  CalendarContext,
  MealRecommendation,
  FamilyScheduleContext,
  GoogleCalendarEvent
} from './types';
import { addDays, isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Service d'intégration calendrier pour adapter les repas selon l'emploi du temps
 * Supporte Google Calendar et Outlook avec mode famille
 */
export class CalendarContextService {
  private googleOAuth2Client: any;
  private outlookClient: any;
  
  constructor() {
    // Initialiser les clients OAuth
    this.initializeOAuthClients();
  }

  /**
   * Initialise les clients OAuth pour les calendriers
   */
  private initializeOAuthClients() {
    // OAuth clients are handled server-side
    // Client-side service makes API calls to our backend
    console.log('Calendar service initialized - using server-side APIs');
  }

  /**
   * Obtient le contexte calendrier complet pour une semaine
   */
  async getCalendarContext(
    userId: string, 
    weekStart: Date,
    familyMode: boolean = false
  ): Promise<CalendarContext> {
    const cacheKey = `calendar:${userId}:${format(weekStart, 'yyyy-MM-dd')}:${familyMode ? 'family' : 'single'}`;
    
    // Utiliser le cache optimisé avec gestion intelligente
    return contextualPerformanceOptimizer.getCached(
      cacheKey,
      async () => {
        try {
          const preferences = await this.getUserCalendarPreferences(userId);
          
          if (!preferences) {
            return this.getDefaultCalendarContext(weekStart);
          }

          const events: CalendarEvent[] = [];
          const familyEvents: Map<string, CalendarEvent[]> = new Map();
          
          // Récupérer les événements depuis les calendriers connectés en parallèle
          const calendarPromises: Promise<CalendarEvent[]>[] = [];
          
          if (preferences.google_calendar_connected && preferences.google_calendar_token) {
            calendarPromises.push(
              this.fetchGoogleEvents(preferences.google_calendar_token, weekStart)
            );
          }
          
          if (preferences.outlook_calendar_connected && preferences.outlook_calendar_token) {
            calendarPromises.push(
              this.fetchOutlookEvents(preferences.outlook_calendar_token, weekStart)
            );
          }
          
          // Exécuter les requêtes calendrier en parallèle
          const calendarResults = await Promise.allSettled(calendarPromises);
          calendarResults.forEach(result => {
            if (result.status === 'fulfilled') {
              events.push(...result.value);
            }
          });

          // En mode famille, récupérer les calendriers des membres
          if (familyMode && preferences.family_context_enabled) {
            const familyMemberEvents = await this.fetchFamilyCalendars(userId, weekStart);
            familyMemberEvents.forEach((memberEvents, memberId) => {
              events.push(...memberEvents);
              familyEvents.set(memberId, memberEvents);
            });
          }
          
          // Traiter les événements pour la planification des repas
          const context = this.processCalendarEvents(events, weekStart);
          
          // Ajouter le contexte famille si applicable
          if (familyMode && familyEvents.size > 0) {
            context.familySchedule = this.processFamilySchedule(familyEvents, weekStart);
          }
          
          return context;
        } catch (error) {
          console.error('Failed to get calendar context:', error);
          return this.getDefaultCalendarContext(weekStart);
        }
      },
      1800000, // 30 minutes TTL pour les données calendrier
      'medium' // Priorité moyenne pour les données calendrier
    );
  }

  /**
   * Récupère les événements Google Calendar via API server-side
   */
  private async fetchGoogleEvents(
    token: string, 
    weekStart: Date
  ): Promise<CalendarEvent[]> {
    try {
      const weekEnd = addDays(weekStart, 7);
      
      // Faire appel à notre API backend au lieu de googleapis directement
      const response = await fetch('/api/calendar/google/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          timeMin: weekStart.toISOString(),
          timeMax: weekEnd.toISOString(),
          maxResults: 100
        })
      });
      
      if (!response.ok) {
        // Si le token est expiré, marquer pour renouvellement
        if (response.status === 401) {
          await this.markTokenForRenewal(token, 'google');
        }
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.items || []).map((event: GoogleCalendarEvent) => 
        this.convertGoogleEvent(event)
      );
    } catch (error) {
      console.error('Failed to fetch Google events:', error);
      return [];
    }
  }

  /**
   * Récupère les événements Outlook
   */
  private async fetchOutlookEvents(
    token: string,
    weekStart: Date
  ): Promise<CalendarEvent[]> {
    // TODO: Implémenter l'intégration Microsoft Graph
    console.log('Outlook integration not yet implemented');
    return [];
  }

  /**
   * Récupère les calendriers de la famille
   */
  private async fetchFamilyCalendars(
    userId: string,
    weekStart: Date
  ): Promise<Map<string, CalendarEvent[]>> {
    const familyEvents = new Map<string, CalendarEvent[]>();
    
    try {
      // Récupérer les membres de la famille
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('member_id, calendar_connected, calendar_token')
        .eq('family_id', userId)
        .eq('calendar_connected', true);
      
      if (!familyMembers) return familyEvents;
      
      // Récupérer les événements de chaque membre en parallèle
      const promises = familyMembers.map(async member => {
        if (member.calendar_token) {
          const events = await this.fetchGoogleEvents(
            member.calendar_token,
            weekStart
          );
          return { memberId: member.member_id, events };
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result) {
          familyEvents.set(result.memberId, result.events);
        }
      });
    } catch (error) {
      console.error('Failed to fetch family calendars:', error);
    }
    
    return familyEvents;
  }

  /**
   * Convertit un événement Google Calendar
   */
  private convertGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
    const title = event.summary || 'Sans titre';
    const start = new Date(event.start?.dateTime || event.start?.date!);
    const end = new Date(event.end?.dateTime || event.end?.date!);
    
    return {
      id: event.id!,
      title,
      start,
      end,
      allDay: !event.start?.dateTime,
      location: event.location,
      attendees: event.attendees?.length || 1,
      type: this.categorizeEvent(title, event.location),
      impact: this.calculateEventImpact(event, start, end)
    };
  }

  /**
   * Catégorise un événement selon son titre et lieu
   */
  private categorizeEvent(title: string, location?: string): EventCategory {
    const lowerTitle = title.toLowerCase();
    const lowerLocation = location?.toLowerCase() || '';
    
    // Anniversaires et fêtes
    if (lowerTitle.includes('anniversaire') || lowerTitle.includes('birthday') || 
        lowerTitle.includes('fête') || lowerTitle.includes('party')) {
      return 'birthday';
    }
    
    // Réunions de travail
    if (lowerTitle.includes('meeting') || lowerTitle.includes('réunion') ||
        lowerTitle.includes('call') || lowerTitle.includes('conf') ||
        lowerLocation.includes('bureau') || lowerLocation.includes('office')) {
      return 'work_meeting';
    }
    
    // Sport et activités physiques
    if (lowerTitle.includes('sport') || lowerTitle.includes('gym') ||
        lowerTitle.includes('tennis') || lowerTitle.includes('foot') ||
        lowerTitle.includes('yoga') || lowerTitle.includes('fitness')) {
      return 'sport';
    }
    
    // Voyages et déplacements
    if (lowerTitle.includes('voyage') || lowerTitle.includes('travel') ||
        lowerTitle.includes('vol') || lowerTitle.includes('flight') ||
        lowerTitle.includes('train') || lowerTitle.includes('vacances')) {
      return 'travel';
    }
    
    // Dîners et repas planifiés
    if (lowerTitle.includes('dîner') || lowerTitle.includes('dinner') ||
        lowerTitle.includes('restaurant') || lowerTitle.includes('repas')) {
      return 'dinner_event';
    }
    
    // Événements familiaux
    if (lowerTitle.includes('famille') || lowerTitle.includes('family') ||
        lowerTitle.includes('enfants') || lowerTitle.includes('école')) {
      return 'family_event';
    }
    
    return 'other';
  }

  /**
   * Calcule l'impact d'un événement sur la planification des repas
   */
  private calculateEventImpact(
    event: GoogleCalendarEvent,
    start: Date,
    end: Date
  ): 'low' | 'medium' | 'high' {
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // heures
    const hour = start.getHours();
    
    // Événement toute la journée = impact élevé
    if (!event.start?.dateTime) {
      return 'high';
    }
    
    // Événement pendant les heures de repas = impact élevé
    if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
      return 'high';
    }
    
    // Événement long = impact moyen à élevé
    if (duration > 4) return 'high';
    if (duration > 2) return 'medium';
    
    // Événement en soirée (préparation du dîner) = impact moyen
    if (hour >= 17 && hour <= 19) return 'medium';
    
    return 'low';
  }

  /**
   * Traite les événements pour créer le contexte calendrier
   */
  private processCalendarEvents(
    events: CalendarEvent[], 
    weekStart: Date
  ): CalendarContext {
    const daySchedules: DaySchedule[] = [];
    const specialOccasions: CalendarEvent[] = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(weekStart, i);
      const dayEvents = events.filter(e => 
        isSameDay(e.start, currentDay)
      );
      
      // Identifier les occasions spéciales
      dayEvents.forEach(event => {
        if (['birthday', 'dinner_event'].includes(event.type)) {
          specialOccasions.push(event);
        }
      });
      
      const busyScore = this.calculateBusyScore(dayEvents);
      const mealTimeAvailable = this.calculateMealTimeAvailable(dayEvents);
      const recommendations = this.generateScheduleRecommendations(
        dayEvents, 
        busyScore,
        i
      );
      
      daySchedules.push({
        date: currentDay,
        events: dayEvents,
        busyScore,
        mealTimeAvailable,
        recommendations,
        suggestedMealComplexity: this.determineMealComplexity(busyScore, mealTimeAvailable)
      });
    }
    
    return {
      weekSchedule: daySchedules,
      specialOccasions,
      overallBusyScore: this.calculateAverage(daySchedules.map(d => d.busyScore)),
      recommendations: this.consolidateRecommendations(daySchedules)
    };
  }

  /**
   * Traite les plannings famille
   */
  private processFamilySchedule(
    familyEvents: Map<string, CalendarEvent[]>,
    weekStart: Date
  ): FamilyScheduleContext {
    const memberSchedules = new Map<string, DaySchedule[]>();
    const conflicts: any[] = [];
    const commonAvailability: MealTimeSlots[] = [];
    
    // Traiter chaque membre
    familyEvents.forEach((events, memberId) => {
      const context = this.processCalendarEvents(events, weekStart);
      memberSchedules.set(memberId, context.weekSchedule);
    });
    
    // Identifier les conflits et disponibilités communes
    for (let day = 0; day < 7; day++) {
      const dayDate = addDays(weekStart, day);
      const memberAvailabilities: MealTimeSlots[] = [];
      
      memberSchedules.forEach((schedule, memberId) => {
        const daySchedule = schedule[day];
        memberAvailabilities.push(daySchedule.mealTimeAvailable);
        
        // Vérifier les conflits d'horaires repas
        if (!daySchedule.mealTimeAvailable.dinner.available) {
          conflicts.push({
            date: dayDate,
            type: 'meal_time' as const,
            affectedMembers: [memberId],
            resolution: 'Préparer à l\'avance ou commander'
          });
        }
      });
      
      // Calculer la disponibilité commune
      commonAvailability.push(this.mergeAvailabilities(memberAvailabilities));
    }
    
    return {
      memberSchedules,
      conflicts,
      commonAvailability
    };
  }

  /**
   * Calcule le score de charge pour une journée
   */
  private calculateBusyScore(events: CalendarEvent[]): number {
    let score = 0;
    
    // Score de base selon le nombre d'événements
    score += Math.min(events.length * 1.5, 6);
    
    // Ajustements selon les types et impacts
    events.forEach(event => {
      // Type d'événement
      switch (event.type) {
        case 'work_meeting':
          score += 0.5;
          break;
        case 'travel':
          score += 2;
          break;
        case 'sport':
          score += 0.5;
          break;
        case 'dinner_event':
          score += 1.5; // Impact sur la préparation du dîner
          break;
        case 'family_event':
          score += 1;
          break;
      }
      
      // Impact temporel
      switch (event.impact) {
        case 'high':
          score += 1.5;
          break;
        case 'medium':
          score += 0.5;
          break;
      }
      
      // Événements en soirée = plus d'impact
      const hour = event.start.getHours();
      if (hour >= 17 && hour <= 20) {
        score += 1;
      }
    });
    
    return Math.min(Math.round(score), 10);
  }

  /**
   * Calcule les créneaux disponibles pour les repas
   */
  private calculateMealTimeAvailable(events: CalendarEvent[]): MealTimeSlots {
    const lunchTime = { start: 12, end: 14 };
    const dinnerTime = { start: 19, end: 21 };
    
    // Vérifier les conflits pour le déjeuner
    const lunchConflicts = events.filter(e => {
      const hour = e.start.getHours();
      const endHour = e.end.getHours();
      return (hour <= lunchTime.end && endHour >= lunchTime.start) && 
             e.impact !== 'low';
    });
    
    // Vérifier les conflits pour le dîner
    const dinnerConflicts = events.filter(e => {
      const hour = e.start.getHours();
      const endHour = e.end.getHours();
      return (hour <= dinnerTime.end && endHour >= dinnerTime.start) ||
             (hour >= 17 && hour <= 19); // Préparation
    });
    
    // Événements toute la journée
    const allDayEvents = events.filter(e => e.allDay);
    
    return {
      lunch: {
        available: lunchConflicts.length === 0 && allDayEvents.length === 0,
        timeWindow: lunchConflicts.length > 0 ? 30 : 60,
        suggestion: lunchConflicts.length > 0 ? 'quick_lunch' : 
                   allDayEvents.length > 0 ? 'skip_lunch' : 'normal_lunch'
      },
      dinner: {
        available: dinnerConflicts.length === 0,
        timeWindow: dinnerConflicts.length > 0 ? 30 : 
                   events.some(e => e.start.getHours() >= 17 && e.start.getHours() <= 18) ? 45 : 90,
        suggestion: dinnerConflicts.length > 0 ? 'order_out' :
                   events.some(e => e.start.getHours() >= 17 && e.start.getHours() <= 18) ? 'prepare_ahead' : 
                   'normal_dinner'
      }
    };
  }

  /**
   * Génère des recommandations selon le planning
   */
  private generateScheduleRecommendations(
    events: CalendarEvent[],
    busyScore: number,
    dayIndex: number
  ): MealRecommendation[] {
    const recommendations: MealRecommendation[] = [];
    
    // Journée très chargée
    if (busyScore >= 8) {
      recommendations.push({
        day: dayIndex,
        type: 'schedule_busy',
        suggestion: 'meal_prep',
        reason: 'Journée très chargée - préparer à l\'avance',
        alternatives: ['leftovers', 'delivery', 'simple_meal'],
        priority: 'high'
      });
    }
    
    // Sport prévu = repas léger avant
    const sportEvent = events.find(e => e.type === 'sport');
    if (sportEvent && sportEvent.start.getHours() >= 18) {
      recommendations.push({
        day: dayIndex,
        type: 'schedule_sport',
        suggestion: 'light_dinner',
        reason: 'Activité sportive en soirée',
        alternatives: ['salad', 'soup', 'smoothie'],
        priority: 'medium'
      });
    }
    
    // Occasion spéciale
    const specialEvent = events.find(e => 
      ['birthday', 'dinner_event'].includes(e.type)
    );
    if (specialEvent) {
      recommendations.push({
        day: dayIndex,
        type: 'special_occasion',
        suggestion: 'special_meal',
        reason: `${specialEvent.title}`,
        alternatives: ['restaurant', 'catering', 'fancy_meal'],
        priority: 'high'
      });
    }
    
    // Absence au dîner
    const dinnerConflict = events.find(e => 
      e.start.getHours() <= 20 && e.end.getHours() >= 19 && e.impact === 'high'
    );
    if (dinnerConflict) {
      recommendations.push({
        day: dayIndex,
        type: 'schedule_absence',
        suggestion: 'skip_dinner',
        reason: `Absent: ${dinnerConflict.title}`,
        alternatives: ['late_dinner', 'snack', 'meal_box'],
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Détermine la complexité suggérée des repas
   */
  private determineMealComplexity(
    busyScore: number,
    mealTime: MealTimeSlots
  ): 'simple' | 'medium' | 'complex' {
    // Si pas de temps pour le dîner
    if (!mealTime.dinner.available || mealTime.dinner.timeWindow < 45) {
      return 'simple';
    }
    
    // Selon le score de charge
    if (busyScore >= 7) return 'simple';
    if (busyScore >= 4) return 'medium';
    
    return 'complex';
  }

  /**
   * Consolide les recommandations de la semaine
   */
  private consolidateRecommendations(daySchedules: DaySchedule[]): MealRecommendation[] {
    const allRecommendations = daySchedules.flatMap(d => d.recommendations);
    
    // Trier par priorité et limiter
    return allRecommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority || 'low'] - priorityOrder[a.priority || 'low']);
      })
      .slice(0, 10); // Maximum 10 recommandations
  }

  /**
   * Fusionne les disponibilités famille
   */
  private mergeAvailabilities(availabilities: MealTimeSlots[]): MealTimeSlots {
    // Tous doivent être disponibles pour que ce soit considéré disponible
    const allAvailableLunch = availabilities.every(a => a.lunch.available);
    const allAvailableDinner = availabilities.every(a => a.dinner.available);
    
    // Prendre le temps minimum disponible
    const minLunchTime = Math.min(...availabilities.map(a => a.lunch.timeWindow));
    const minDinnerTime = Math.min(...availabilities.map(a => a.dinner.timeWindow));
    
    return {
      lunch: {
        available: allAvailableLunch,
        timeWindow: minLunchTime,
        suggestion: !allAvailableLunch ? 'skip_lunch' : 
                   minLunchTime < 45 ? 'quick_lunch' : 'normal_lunch'
      },
      dinner: {
        available: allAvailableDinner,
        timeWindow: minDinnerTime,
        suggestion: !allAvailableDinner ? 'order_out' :
                   minDinnerTime < 60 ? 'prepare_ahead' : 'normal_dinner'
      }
    };
  }

  /**
   * Récupère les préférences calendrier de l'utilisateur
   */
  private async getUserCalendarPreferences(userId: string): Promise<any> {
    const { data } = await supabase
      .from('user_context_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return data;
  }

  /**
   * Marque un token pour renouvellement
   */
  private async markTokenForRenewal(token: string, provider: 'google' | 'outlook') {
    console.log(`Token needs renewal for ${provider}`);
    // TODO: Implémenter le renouvellement de token
  }

  /**
   * Retourne un contexte calendrier par défaut
   */
  private getDefaultCalendarContext(weekStart: Date): CalendarContext {
    const daySchedules: DaySchedule[] = [];
    
    for (let i = 0; i < 7; i++) {
      daySchedules.push({
        date: addDays(weekStart, i),
        events: [],
        busyScore: 3, // Score moyen par défaut
        mealTimeAvailable: {
          lunch: {
            available: true,
            timeWindow: 60,
            suggestion: 'normal_lunch'
          },
          dinner: {
            available: true,
            timeWindow: 90,
            suggestion: 'normal_dinner'
          }
        },
        recommendations: [],
        suggestedMealComplexity: 'medium'
      });
    }
    
    return {
      weekSchedule: daySchedules,
      specialOccasions: [],
      overallBusyScore: 3,
      recommendations: []
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
  }
}

// Export de l'instance
export const calendarContextService = new CalendarContextService();