import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';

// Types pour l'analytics du panic mode
interface PanicEvent {
  id?: string;
  userId: string;
  triggerType: 'manual' | 'automatic' | 'time_based' | 'context_based' | 'shake' | 'gesture';
  triggerTime: Date;
  solutionSelected?: string;
  timeToResolution?: number;
  userStressLevel: 1 | 2 | 3 | 4 | 5;
  success: boolean;
  feedback?: string;
  contextData?: Record<string, any>;
  solutionsOffered?: Array<{id: string; type: string; confidence: number}>;
  generationTimeMs?: number;
  userInteractionTimeMs?: number;
  familyMembersPresent?: number;
  dietaryConstraintsActive?: string[];
}

interface QuickActionUsage {
  id?: string;
  userId: string;
  actionType: string;
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
  resultData?: any;
  userSatisfaction?: number;
  triggerMethod: 'button' | 'shortcut' | 'gesture' | 'voice' | 'auto';
  familySize?: number;
}

interface PanicInsights {
  panicFrequency: number; // Par jour
  peakPanicHour: number;
  preferredSolution: string;
  avgResolutionTime: number;
  stressPattern: {
    averageLevel: number;
    peakHours: number[];
    commonTriggers: string[];
  };
  successRate: number;
  recommendations: string[];
  weeklyTrend: number[];
  seasonalPatterns: Record<string, number>;
}

interface QuickActionInsights {
  totalUsage: number;
  mostUsedAction: string;
  averageExecutionTime: number;
  successRate: number;
  preferredTriggerMethod: string;
  usagePatterns: {
    hourlyDistribution: number[];
    weeklyDistribution: number[];
    monthlyTrend: number[];
  };
  actionEfficiency: Record<string, {
    avgTime: number;
    successRate: number;
    userSatisfaction: number;
  }>;
}

interface SystemPerformanceMetrics {
  panicResolutionTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  quickActionExecutionTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRates: {
    panicMode: number;
    quickActions: number;
  };
  userSatisfaction: {
    panicMode: number;
    quickActions: number;
  };
  systemLoad: {
    concurrent_panics: number;
    cache_hit_rate: number;
    db_response_time: number;
  };
}

export class PanicAnalyticsService {
  constructor(
    private supabase: SupabaseClient<Database> = supabase
  ) {}

  /**
   * Enregistre un événement de panique
   */
  async trackPanicEvent(event: PanicEvent): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('panic_events')
        .insert({
          user_id: event.userId,
          trigger_type: event.triggerType,
          trigger_time: event.triggerTime.toISOString(),
          solution_selected: event.solutionSelected,
          time_to_resolution: event.timeToResolution,
          user_stress_level: event.userStressLevel,
          success: event.success,
          feedback: event.feedback,
          context_data: event.contextData || {},
          solutions_offered: event.solutionsOffered || [],
          generation_time_ms: event.generationTimeMs,
          user_interaction_time_ms: event.userInteractionTimeMs,
          family_members_present: event.familyMembersPresent || 1,
          dietary_constraints_active: event.dietaryConstraintsActive || []
        })
        .select('id')
        .single();

      if (error) throw error;

      // Analytics temps réel
      this.sendRealtimeAnalytics('panic_event', {
        trigger_type: event.triggerType,
        success: event.success,
        stress_level: event.userStressLevel,
        resolution_time: event.timeToResolution
      });

      return data.id;
    } catch (error) {
      console.error('Failed to track panic event:', error);
      throw error;
    }
  }

  /**
   * Enregistre l'utilisation d'une quick action
   */
  async trackQuickActionUsage(usage: QuickActionUsage): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('quick_actions_usage')
        .insert({
          user_id: usage.userId,
          action_type: usage.actionType,
          execution_time_ms: usage.executionTimeMs,
          success: usage.success,
          error_message: usage.errorMessage,
          result_data: usage.resultData,
          user_satisfaction: usage.userSatisfaction,
          trigger_method: usage.triggerMethod,
          family_size: usage.familySize || 1
        })
        .select('id')
        .single();

      if (error) throw error;

      // Analytics temps réel
      this.sendRealtimeAnalytics('quick_action', {
        action_type: usage.actionType,
        success: usage.success,
        execution_time: usage.executionTimeMs,
        trigger_method: usage.triggerMethod
      });

      return data.id;
    } catch (error) {
      console.error('Failed to track quick action usage:', error);
      throw error;
    }
  }

  /**
   * Génère des insights détaillés sur le panic mode pour un utilisateur
   */
  async generatePanicInsights(userId: string, days: number = 30): Promise<PanicInsights> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: events, error } = await this.supabase
        .from('panic_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!events || events.length === 0) {
        return this.getDefaultPanicInsights();
      }

      // Calculs des insights
      const panicFrequency = events.length / days;
      const peakPanicHour = this.findPeakHour(events);
      const preferredSolution = this.findPreferredSolution(events);
      const avgResolutionTime = this.calculateAvgResolutionTime(events);
      const stressPattern = this.analyzeStressPattern(events);
      const successRate = events.filter(e => e.success).length / events.length;
      const recommendations = this.generateRecommendations(events);
      const weeklyTrend = this.calculateWeeklyTrend(events, days);
      const seasonalPatterns = this.analyzeSeasonalPatterns(events);

      return {
        panicFrequency,
        peakPanicHour,
        preferredSolution,
        avgResolutionTime,
        stressPattern,
        successRate,
        recommendations,
        weeklyTrend,
        seasonalPatterns
      };
    } catch (error) {
      console.error('Failed to generate panic insights:', error);
      return this.getDefaultPanicInsights();
    }
  }

  /**
   * Génère des insights sur l'utilisation des quick actions
   */
  async generateQuickActionInsights(userId: string, days: number = 30): Promise<QuickActionInsights> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: usage, error } = await this.supabase
        .from('quick_actions_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!usage || usage.length === 0) {
        return this.getDefaultQuickActionInsights();
      }

      const totalUsage = usage.length;
      const mostUsedAction = this.findMostUsedAction(usage);
      const averageExecutionTime = usage.reduce((sum, u) => sum + u.execution_time_ms, 0) / usage.length;
      const successRate = usage.filter(u => u.success).length / usage.length;
      const preferredTriggerMethod = this.findPreferredTriggerMethod(usage);
      const usagePatterns = this.analyzeUsagePatterns(usage);
      const actionEfficiency = this.calculateActionEfficiency(usage);

      return {
        totalUsage,
        mostUsedAction,
        averageExecutionTime,
        successRate,
        preferredTriggerMethod,
        usagePatterns,
        actionEfficiency
      };
    } catch (error) {
      console.error('Failed to generate quick action insights:', error);
      return this.getDefaultQuickActionInsights();
    }
  }

  /**
   * Obtient les métriques de performance système
   */
  async getSystemPerformanceMetrics(hours: number = 24): Promise<SystemPerformanceMetrics> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [panicEvents, quickActions] = await Promise.all([
        this.supabase
          .from('panic_events')
          .select('time_to_resolution, success, user_stress_level, generation_time_ms')
          .gte('created_at', since.toISOString()),
        this.supabase
          .from('quick_actions_usage')
          .select('execution_time_ms, success, user_satisfaction')
          .gte('created_at', since.toISOString())
      ]);

      const panicData = panicEvents.data || [];
      const actionData = quickActions.data || [];

      return {
        panicResolutionTime: this.calculatePercentiles(
          panicData.map(p => p.time_to_resolution).filter(Boolean)
        ),
        quickActionExecutionTime: this.calculatePercentiles(
          actionData.map(a => a.execution_time_ms)
        ),
        errorRates: {
          panicMode: panicData.length > 0 
            ? (panicData.filter(p => !p.success).length / panicData.length) 
            : 0,
          quickActions: actionData.length > 0
            ? (actionData.filter(a => !a.success).length / actionData.length)
            : 0
        },
        userSatisfaction: {
          panicMode: panicData.length > 0
            ? (panicData.reduce((sum, p) => sum + (p.user_stress_level ? 6 - p.user_stress_level : 3), 0) / panicData.length)
            : 3,
          quickActions: actionData.length > 0
            ? (actionData.reduce((sum, a) => sum + (a.user_satisfaction || 3), 0) / actionData.length)
            : 3
        },
        systemLoad: await this.getSystemLoadMetrics()
      };
    } catch (error) {
      console.error('Failed to get system performance metrics:', error);
      return this.getDefaultPerformanceMetrics();
    }
  }

  /**
   * Génère un rapport d'utilisation quotidien
   */
  async generateDailyReport(date: Date = new Date()): Promise<{
    date: string;
    totalPanics: number;
    successfulPanics: number;
    avgResolutionTime: number;
    avgStressLevel: number;
    quickActionsUsed: number;
    topActions: Array<{action: string; count: number}>;
    userEngagement: number;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [panicEvents, quickActions] = await Promise.all([
        this.supabase
          .from('panic_events')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        this.supabase
          .from('quick_actions_usage')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
      ]);

      const panics = panicEvents.data || [];
      const actions = quickActions.data || [];

      const totalPanics = panics.length;
      const successfulPanics = panics.filter(p => p.success).length;
      const avgResolutionTime = panics.length > 0
        ? panics.reduce((sum, p) => sum + (p.time_to_resolution || 0), 0) / panics.length
        : 0;
      const avgStressLevel = panics.length > 0
        ? panics.reduce((sum, p) => sum + (p.user_stress_level || 0), 0) / panics.length
        : 0;
      const quickActionsUsed = actions.length;

      const actionCounts: Record<string, number> = {};
      actions.forEach(action => {
        actionCounts[action.action_type] = (actionCounts[action.action_type] || 0) + 1;
      });
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const userEngagement = (totalPanics + quickActionsUsed) / Math.max(1, totalPanics + quickActionsUsed);
      
      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      const successRate = totalPanics > 0 ? successfulPanics / totalPanics : 1;
      if (successRate < 0.7 || avgResolutionTime > 45) systemHealth = 'poor';
      else if (successRate < 0.85 || avgResolutionTime > 30) systemHealth = 'fair';
      else if (successRate < 0.95 || avgResolutionTime > 20) systemHealth = 'good';

      return {
        date: date.toISOString().split('T')[0],
        totalPanics,
        successfulPanics,
        avgResolutionTime,
        avgStressLevel,
        quickActionsUsed,
        topActions,
        userEngagement,
        systemHealth
      };
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      return {
        date: date.toISOString().split('T')[0],
        totalPanics: 0,
        successfulPanics: 0,
        avgResolutionTime: 0,
        avgStressLevel: 0,
        quickActionsUsed: 0,
        topActions: [],
        userEngagement: 0,
        systemHealth: 'poor'
      };
    }
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  private findPeakHour(events: any[]): number {
    const hourCounts: Record<number, number> = {};
    
    events.forEach(event => {
      const hour = new Date(event.trigger_time || event.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour = 18; // Défaut 18h
    let maxCount = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hour);
      }
    });

    return peakHour;
  }

  private findPreferredSolution(events: any[]): string {
    const solutionCounts: Record<string, number> = {};
    
    events.forEach(event => {
      if (event.solution_selected) {
        solutionCounts[event.solution_selected] = (solutionCounts[event.solution_selected] || 0) + 1;
      }
    });

    let preferredSolution = 'instant';
    let maxCount = 0;
    
    Object.entries(solutionCounts).forEach(([solution, count]) => {
      if (count > maxCount) {
        maxCount = count;
        preferredSolution = solution;
      }
    });

    return preferredSolution;
  }

  private calculateAvgResolutionTime(events: any[]): number {
    const times = events
      .map(e => e.time_to_resolution)
      .filter(t => t !== null && t !== undefined);
    
    return times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0;
  }

  private analyzeStressPattern(events: any[]): {
    averageLevel: number;
    peakHours: number[];
    commonTriggers: string[];
  } {
    const stressLevels = events.map(e => e.user_stress_level).filter(Boolean);
    const averageLevel = stressLevels.length > 0
      ? stressLevels.reduce((sum, level) => sum + level, 0) / stressLevels.length
      : 3;

    // Heures de pic de stress
    const stressHours: Record<number, number[]> = {};
    events.forEach(event => {
      const hour = new Date(event.trigger_time || event.created_at).getHours();
      if (!stressHours[hour]) stressHours[hour] = [];
      stressHours[hour].push(event.user_stress_level || 3);
    });

    const peakHours = Object.entries(stressHours)
      .map(([hour, levels]) => ({
        hour: parseInt(hour),
        avgStress: levels.reduce((sum, level) => sum + level, 0) / levels.length
      }))
      .filter(h => h.avgStress >= 4)
      .map(h => h.hour);

    // Triggers communs
    const triggerCounts: Record<string, number> = {};
    events.forEach(event => {
      const trigger = event.trigger_type;
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    });

    const commonTriggers = Object.entries(triggerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger);

    return {
      averageLevel,
      peakHours,
      commonTriggers
    };
  }

  private generateRecommendations(events: any[]): string[] {
    const recommendations: string[] = [];

    // Analyse des patterns
    const dayPattern = this.findDayPattern(events);
    const timePattern = this.findTimePattern(events);
    const stressAnalysis = this.analyzeStressPattern(events);

    if (dayPattern.criticalDay) {
      recommendations.push(
        `Préparez spécialement le ${dayPattern.criticalDay} - c'est votre jour le plus critique`
      );
    }

    if (timePattern.criticalHour !== null && timePattern.criticalHour >= 17 && timePattern.criticalHour <= 19) {
      recommendations.push(
        `Activez les rappels à ${timePattern.criticalHour - 1}h30 pour éviter le stress de dernière minute`
      );
    }

    if (stressAnalysis.averageLevel >= 4) {
      recommendations.push(
        'Votre niveau de stress est élevé. Considérez planifier vos repas plus à l\'avance'
      );
    }

    const preferredSolution = this.findPreferredSolution(events);
    if (preferredSolution === 'delivery') {
      recommendations.push(
        'Planifiez 1-2 restaurants par semaine pour réduire la pression'
      );
    } else if (preferredSolution === 'instant') {
      recommendations.push(
        'Constituez un stock d\'ingrédients de base pour les recettes express'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Continuez à utiliser le système - vous vous débrouillez bien!');
    }

    return recommendations;
  }

  private findDayPattern(events: any[]): { criticalDay: string | null; pattern: Record<string, number> } {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayCounts: Record<string, number> = {};

    events.forEach(event => {
      const day = new Date(event.trigger_time || event.created_at).getDay();
      const dayName = dayNames[day];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });

    let criticalDay: string | null = null;
    let maxCount = 0;

    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > maxCount && count >= 3) { // Au moins 3 panics
        maxCount = count;
        criticalDay = day;
      }
    });

    return { criticalDay, pattern: dayCounts };
  }

  private findTimePattern(events: any[]): { criticalHour: number | null; pattern: Record<number, number> } {
    const hourCounts: Record<number, number> = {};

    events.forEach(event => {
      const hour = new Date(event.trigger_time || event.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let criticalHour: number | null = null;
    let maxCount = 0;

    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount && count >= 3) {
        maxCount = count;
        criticalHour = parseInt(hour);
      }
    });

    return { criticalHour, pattern: hourCounts };
  }

  private calculateWeeklyTrend(events: any[], days: number): number[] {
    const weeksCount = Math.ceil(days / 7);
    const weeklyData = new Array(weeksCount).fill(0);

    events.forEach(event => {
      const eventDate = new Date(event.created_at);
      const daysDiff = Math.floor((new Date().getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);
      
      if (weekIndex < weeksCount) {
        weeklyData[weeksCount - 1 - weekIndex]++;
      }
    });

    return weeklyData;
  }

  private analyzeSeasonalPatterns(events: any[]): Record<string, number> {
    const seasons: Record<string, number> = {
      'Printemps': 0,
      'Été': 0,
      'Automne': 0,
      'Hiver': 0
    };

    events.forEach(event => {
      const month = new Date(event.created_at).getMonth();
      let season: string;
      
      if (month >= 2 && month <= 4) season = 'Printemps';
      else if (month >= 5 && month <= 7) season = 'Été';
      else if (month >= 8 && month <= 10) season = 'Automne';
      else season = 'Hiver';

      seasons[season]++;
    });

    return seasons;
  }

  private findMostUsedAction(usage: any[]): string {
    const actionCounts: Record<string, number> = {};
    
    usage.forEach(u => {
      actionCounts[u.action_type] = (actionCounts[u.action_type] || 0) + 1;
    });

    let mostUsed = 'repeat_week';
    let maxCount = 0;

    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = action;
      }
    });

    return mostUsed;
  }

  private findPreferredTriggerMethod(usage: any[]): string {
    const triggerCounts: Record<string, number> = {};
    
    usage.forEach(u => {
      triggerCounts[u.trigger_method] = (triggerCounts[u.trigger_method] || 0) + 1;
    });

    let preferred = 'button';
    let maxCount = 0;

    Object.entries(triggerCounts).forEach(([method, count]) => {
      if (count > maxCount) {
        maxCount = count;
        preferred = method;
      }
    });

    return preferred;
  }

  private analyzeUsagePatterns(usage: any[]): {
    hourlyDistribution: number[];
    weeklyDistribution: number[];
    monthlyTrend: number[];
  } {
    const hourlyDistribution = new Array(24).fill(0);
    const weeklyDistribution = new Array(7).fill(0);
    const monthlyTrend = new Array(12).fill(0);

    usage.forEach(u => {
      const date = new Date(u.created_at);
      hourlyDistribution[date.getHours()]++;
      weeklyDistribution[date.getDay()]++;
      monthlyTrend[date.getMonth()]++;
    });

    return {
      hourlyDistribution,
      weeklyDistribution,
      monthlyTrend
    };
  }

  private calculateActionEfficiency(usage: any[]): Record<string, {
    avgTime: number;
    successRate: number;
    userSatisfaction: number;
  }> {
    const actionStats: Record<string, {
      times: number[];
      successes: number;
      total: number;
      satisfactions: number[];
    }> = {};

    usage.forEach(u => {
      if (!actionStats[u.action_type]) {
        actionStats[u.action_type] = {
          times: [],
          successes: 0,
          total: 0,
          satisfactions: []
        };
      }

      const stats = actionStats[u.action_type];
      stats.times.push(u.execution_time_ms);
      if (u.success) stats.successes++;
      stats.total++;
      if (u.user_satisfaction) stats.satisfactions.push(u.user_satisfaction);
    });

    const efficiency: Record<string, any> = {};

    Object.entries(actionStats).forEach(([action, stats]) => {
      efficiency[action] = {
        avgTime: stats.times.reduce((sum, time) => sum + time, 0) / stats.times.length,
        successRate: stats.successes / stats.total,
        userSatisfaction: stats.satisfactions.length > 0
          ? stats.satisfactions.reduce((sum, sat) => sum + sat, 0) / stats.satisfactions.length
          : 3
      };
    });

    return efficiency;
  }

  private calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = values.sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil(sorted.length * p / 100) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  private async getSystemLoadMetrics(): Promise<{
    concurrent_panics: number;
    cache_hit_rate: number;
    db_response_time: number;
  }> {
    try {
      // Simulé pour le moment - à implémenter avec vraies métriques
      return {
        concurrent_panics: 0,
        cache_hit_rate: 0.85,
        db_response_time: 150
      };
    } catch (error) {
      return {
        concurrent_panics: 0,
        cache_hit_rate: 0,
        db_response_time: 1000
      };
    }
  }

  private sendRealtimeAnalytics(eventType: string, data: any): void {
    // Intégration avec services analytics externes (Mixpanel, Amplitude, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventType, data);
    }
  }

  private getDefaultPanicInsights(): PanicInsights {
    return {
      panicFrequency: 0,
      peakPanicHour: 18,
      preferredSolution: 'instant',
      avgResolutionTime: 0,
      stressPattern: {
        averageLevel: 3,
        peakHours: [],
        commonTriggers: []
      },
      successRate: 0,
      recommendations: ['Commencez à utiliser le système pour obtenir des insights personnalisés'],
      weeklyTrend: [],
      seasonalPatterns: {}
    };
  }

  private getDefaultQuickActionInsights(): QuickActionInsights {
    return {
      totalUsage: 0,
      mostUsedAction: 'repeat_week',
      averageExecutionTime: 0,
      successRate: 0,
      preferredTriggerMethod: 'button',
      usagePatterns: {
        hourlyDistribution: new Array(24).fill(0),
        weeklyDistribution: new Array(7).fill(0),
        monthlyTrend: new Array(12).fill(0)
      },
      actionEfficiency: {}
    };
  }

  private getDefaultPerformanceMetrics(): SystemPerformanceMetrics {
    return {
      panicResolutionTime: { p50: 0, p95: 0, p99: 0 },
      quickActionExecutionTime: { p50: 0, p95: 0, p99: 0 },
      errorRates: { panicMode: 0, quickActions: 0 },
      userSatisfaction: { panicMode: 0, quickActions: 0 },
      systemLoad: { concurrent_panics: 0, cache_hit_rate: 0, db_response_time: 0 }
    };
  }
}

// Export de l'instance par défaut
export const panicAnalytics = new PanicAnalyticsService();