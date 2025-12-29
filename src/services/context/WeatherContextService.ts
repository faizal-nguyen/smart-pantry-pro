import { supabase } from '@/integrations/supabase/client';
import { contextualPerformanceOptimizer } from './PerformanceOptimizer';
import { 
  Coordinates, 
  WeatherData, 
  WeatherContext, 
  WeeklyWeatherAnalysis,
  MealRecommendation,
  WeatherImpact,
  WeatherAPIResponse
} from './types';

interface WeatherProvider {
  name: 'OpenWeatherMap' | 'WeatherAPI' | 'MeteoFrance';
  apiKey: string;
  baseUrl: string;
}

/**
 * Service de contexte météo pour adapter les suggestions de repas
 * Intègre plusieurs providers avec fallback automatique
 */
export class WeatherContextService {
  private providers: Map<string, WeatherProvider>;

  constructor() {
    this.providers = new Map([
      ['primary', {
        name: 'OpenWeatherMap',
        apiKey: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '',
        baseUrl: 'https://api.openweathermap.org/data/2.5'
      }],
      ['fallback', {
        name: 'WeatherAPI',
        apiKey: process.env.NEXT_PUBLIC_WEATHERAPI_KEY || '',
        baseUrl: 'https://api.weatherapi.com/v1'
      }]
    ]);
  }

  /**
   * Obtient le contexte météo complet pour une localisation
   */
  async getWeatherContext(location: Coordinates): Promise<WeatherContext> {
    const cacheKey = `weather:${location.lat.toFixed(2)}:${location.lng.toFixed(2)}`;
    
    // Utiliser le cache optimisé avec gestion intelligente
    return contextualPerformanceOptimizer.getCached(
      cacheKey,
      async () => {
        try {
          // Essayer le provider principal
          const weather = await this.fetchWeatherData('primary', location);
          const context = this.processWeatherData(weather);
          
          // Enregistrer dans la base pour analytics
          await this.logWeatherContext(context, location);
          
          return context;
        } catch (error) {
          console.error('Primary weather provider failed:', error);
          
          // Fallback au provider secondaire
          try {
            const weather = await this.fetchWeatherData('fallback', location);
            const context = this.processWeatherData(weather);
            
            return context;
          } catch (fallbackError) {
            console.error('Fallback weather provider also failed:', fallbackError);
            
            // Retourner des données par défaut
            return this.getDefaultWeatherContext();
          }
        }
      },
      3600000, // 1 heure TTL
      'high' // Priorité élevée pour les données météo
    );
  }

  /**
   * Récupère les données météo d'un provider spécifique
   */
  private async fetchWeatherData(
    providerKey: string, 
    location: Coordinates
  ): Promise<WeatherAPIResponse> {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new Error(`Provider ${providerKey} not found`);
    }

    if (!provider.apiKey) {
      throw new Error(`API key missing for ${provider.name}`);
    }
    
    if (provider.name === 'OpenWeatherMap') {
      const url = `${provider.baseUrl}/forecast?lat=${location.lat}&lon=${location.lng}&appid=${provider.apiKey}&units=metric&lang=fr`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`OpenWeatherMap API error: ${response.status}`);
      }
      
      return response.json();
    }
    
    if (provider.name === 'WeatherAPI') {
      const url = `${provider.baseUrl}/forecast.json?key=${provider.apiKey}&q=${location.lat},${location.lng}&days=7&lang=fr`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`WeatherAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convertir au format OpenWeatherMap pour uniformité
      return this.convertWeatherAPIResponse(data);
    }
    
    throw new Error(`Provider ${provider.name} not implemented`);
  }

  /**
   * Convertit la réponse WeatherAPI au format OpenWeatherMap
   */
  private convertWeatherAPIResponse(data: any): WeatherAPIResponse {
    const list: any[] = [];
    
    data.forecast.forecastday.forEach((day: any) => {
      day.hour.forEach((hour: any, index: number) => {
        if (index % 3 === 0) { // Prendre toutes les 3 heures
          list.push({
            dt: new Date(hour.time).getTime() / 1000,
            main: {
              temp: hour.temp_c,
              feels_like: hour.feelslike_c,
              humidity: hour.humidity
            },
            weather: [{
              main: this.mapWeatherCondition(hour.condition.code),
              description: hour.condition.text
            }],
            rain: hour.precip_mm > 0 ? { '3h': hour.precip_mm } : undefined,
            wind: {
              speed: hour.wind_kph / 3.6 // Convertir en m/s
            }
          });
        }
      });
    });
    
    return { list };
  }

  /**
   * Traite les données météo brutes pour créer le contexte
   */
  private processWeatherData(raw: WeatherAPIResponse): WeatherContext {
    const forecast = raw.list.slice(0, 56).map(item => ({ // 7 jours * 8 intervalles
      date: new Date(item.dt * 1000),
      temp: Math.round(item.main.temp),
      feels_like: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      weather: item.weather[0].main,
      description: item.weather[0].description,
      rain: item.rain?.['3h'] || 0,
      wind: Math.round(item.wind.speed * 3.6) // Convertir en km/h
    }));

    const weeklyAnalysis = this.analyzeWeeklyWeather(forecast);
    const impact = this.calculateWeatherImpact(weeklyAnalysis);

    return {
      current: forecast[0],
      forecast,
      analysis: weeklyAnalysis,
      impact
    };
  }

  /**
   * Analyse les tendances météo de la semaine
   */
  private analyzeWeeklyWeather(forecast: WeatherData[]): WeeklyWeatherAnalysis {
    const temperatures = forecast.map(f => f.temp);
    const avgTemp = this.calculateAverage(temperatures);
    
    // Détecter la tendance de température
    const firstDayAvg = this.calculateAverage(temperatures.slice(0, 8));
    const lastDayAvg = this.calculateAverage(temperatures.slice(-8));
    const tempTrend = lastDayAvg > firstDayAvg + 2 ? 'rising' : 
                      lastDayAvg < firstDayAvg - 2 ? 'falling' : 'stable';
    
    // Compter les jours de pluie
    const rainyDays = new Set(
      forecast
        .filter(f => f.rain > 0)
        .map(f => f.date.getDate())
    ).size;
    
    // Détecter les conditions extrêmes
    const extremeWeather = this.detectExtremeWeather(forecast);
    
    // Générer des recommandations
    const recommendations = this.generateWeatherRecommendations(forecast);

    return {
      avgTemp: Math.round(avgTemp),
      tempTrend,
      rainyDays,
      extremeWeather,
      recommendations
    };
  }

  /**
   * Détecte les conditions météo extrêmes
   */
  private detectExtremeWeather(forecast: WeatherData[]) {
    const extremes: any[] = [];
    
    forecast.forEach((weather, index) => {
      const day = Math.floor(index / 8);
      
      // Canicule
      if (weather.temp > 35) {
        extremes.push({
          date: weather.date,
          type: 'heat',
          severity: weather.temp > 40 ? 'severe' : 'moderate'
        });
      }
      
      // Grand froid
      if (weather.temp < 0) {
        extremes.push({
          date: weather.date,
          type: 'cold',
          severity: weather.temp < -5 ? 'severe' : 'moderate'
        });
      }
      
      // Fortes pluies
      if (weather.rain > 10) {
        extremes.push({
          date: weather.date,
          type: 'heavy_rain',
          severity: weather.rain > 20 ? 'severe' : 'moderate'
        });
      }
      
      // Tempête (vent fort + pluie)
      if (weather.wind > 50 && weather.rain > 5) {
        extremes.push({
          date: weather.date,
          type: 'storm',
          severity: weather.wind > 70 ? 'severe' : 'moderate'
        });
      }
    });
    
    // Dédupliquer par jour et type
    return this.deduplicateExtremes(extremes);
  }

  /**
   * Génère des recommandations basées sur la météo
   */
  private generateWeatherRecommendations(forecast: WeatherData[]): MealRecommendation[] {
    const recommendations: MealRecommendation[] = [];
    const processedDays = new Set<number>();
    
    forecast.forEach((weather, index) => {
      const day = Math.floor(index / 8);
      
      // Une recommandation par jour maximum
      if (processedDays.has(day)) return;
      
      // Très chaud (>30°C)
      if (weather.temp > 30) {
        processedDays.add(day);
        recommendations.push({
          day,
          type: 'weather_hot',
          suggestion: 'salad',
          reason: `Température élevée prévue (${weather.temp}°C)`,
          alternatives: ['gazpacho', 'salade_composée', 'poke_bowl', 'carpaccio'],
          priority: weather.temp > 35 ? 'high' : 'medium'
        });
      }
      
      // Très froid (<5°C)
      else if (weather.temp < 5) {
        processedDays.add(day);
        recommendations.push({
          day,
          type: 'weather_cold',
          suggestion: 'soup',
          reason: `Température basse prévue (${weather.temp}°C)`,
          alternatives: ['pot_au_feu', 'gratin', 'raclette', 'blanquette'],
          priority: weather.temp < 0 ? 'high' : 'medium'
        });
      }
      
      // Pluvieux
      else if (weather.rain > 5) {
        processedDays.add(day);
        recommendations.push({
          day,
          type: 'weather_rain',
          suggestion: 'comfort_food',
          reason: `Jour de pluie prévu (${Math.round(weather.rain)}mm)`,
          alternatives: ['pasta', 'risotto', 'curry', 'couscous'],
          priority: 'low'
        });
      }
      
      // Parfait pour BBQ
      else if (weather.temp >= 20 && weather.temp <= 28 && weather.rain === 0 && weather.wind < 20) {
        processedDays.add(day);
        recommendations.push({
          day,
          type: 'weather_bbq',
          suggestion: 'bbq',
          reason: 'Conditions idéales pour un barbecue',
          alternatives: ['grillades', 'plancha', 'salade_repas'],
          priority: 'medium'
        });
      }
    });
    
    return recommendations.slice(0, 7); // Max 7 recommandations
  }

  /**
   * Calcule l'impact de la météo sur les choix de repas
   */
  private calculateWeatherImpact(analysis: WeeklyWeatherAnalysis): WeatherImpact {
    const { avgTemp, rainyDays, extremeWeather } = analysis;
    
    // Calculer les modificateurs selon la température moyenne
    const hotMealModifier = avgTemp < 15 ? 1.5 : avgTemp < 20 ? 1.2 : avgTemp < 25 ? 1.0 : 0.8;
    const coldMealModifier = avgTemp > 25 ? 1.5 : avgTemp > 20 ? 1.2 : avgTemp > 15 ? 1.0 : 0.7;
    
    // Impact des jours de pluie sur le comfort food
    const comfortFoodModifier = 1.0 + (rainyDays * 0.1);
    
    // Impact sur les méthodes de cuisson
    const ovenModifier = avgTemp > 28 ? 0.7 : 1.0; // Éviter le four si très chaud
    const noCookModifier = avgTemp > 30 ? 1.5 : avgTemp > 25 ? 1.2 : 0.9;
    const slowCookerModifier = avgTemp < 10 ? 1.3 : rainyDays > 3 ? 1.2 : 1.0;
    
    // BBQ seulement si conditions favorables
    const bbqModifier = avgTemp > 20 && avgTemp < 30 && rainyDays < 2 ? 1.4 : 0.6;

    return {
      mealTypeImpact: {
        hot_meals: Math.round(hotMealModifier * 100) / 100,
        cold_meals: Math.round(coldMealModifier * 100) / 100,
        comfort_food: Math.round(comfortFoodModifier * 100) / 100,
        bbq: Math.round(bbqModifier * 100) / 100
      },
      cookingMethodImpact: {
        oven: Math.round(ovenModifier * 100) / 100,
        stovetop: 1.0,
        no_cook: Math.round(noCookModifier * 100) / 100,
        slow_cooker: Math.round(slowCookerModifier * 100) / 100
      }
    };
  }

  /**
   * Retourne un contexte météo par défaut en cas d'échec
   */
  private getDefaultWeatherContext(): WeatherContext {
    const defaultWeather: WeatherData = {
      date: new Date(),
      temp: 20,
      feels_like: 20,
      humidity: 60,
      weather: 'Clear',
      description: 'Ciel dégagé',
      rain: 0,
      wind: 10
    };

    return {
      current: defaultWeather,
      forecast: Array(56).fill(defaultWeather),
      analysis: {
        avgTemp: 20,
        tempTrend: 'stable',
        rainyDays: 0,
        extremeWeather: [],
        recommendations: []
      },
      impact: {
        mealTypeImpact: {
          hot_meals: 1.0,
          cold_meals: 1.0,
          comfort_food: 1.0,
          bbq: 1.0
        },
        cookingMethodImpact: {
          oven: 1.0,
          stovetop: 1.0,
          no_cook: 1.0,
          slow_cooker: 1.0
        }
      }
    };
  }

  /**
   * Enregistre le contexte météo dans la base pour analytics
   */
  private async logWeatherContext(context: WeatherContext, location: Coordinates) {
    try {
      await supabase.from('context_cache').insert({
        cache_key: `weather_log:${location.lat}:${location.lng}:${Date.now()}`,
        cache_type: 'weather',
        data: {
          location,
          summary: {
            avgTemp: context.analysis.avgTemp,
            tempTrend: context.analysis.tempTrend,
            rainyDays: context.analysis.rainyDays,
            extremeCount: context.analysis.extremeWeather.length
          },
          recommendations: context.analysis.recommendations.length,
          impact: context.impact
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      });
    } catch (error) {
      console.error('Failed to log weather context:', error);
    }
  }

  // Méthodes utilitaires

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private detectTrend(values: number[]): 'rising' | 'falling' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    if (secondAvg > firstAvg + 2) return 'rising';
    if (secondAvg < firstAvg - 2) return 'falling';
    return 'stable';
  }

  private mapWeatherCondition(code: number): string {
    // Mapping des codes WeatherAPI vers les conditions principales
    if (code === 1000) return 'Clear';
    if (code >= 1003 && code <= 1009) return 'Clouds';
    if (code >= 1063 && code <= 1282) return 'Rain';
    if (code >= 1114 && code <= 1225) return 'Snow';
    if (code >= 1273 && code <= 1282) return 'Thunderstorm';
    return 'Clouds';
  }

  private deduplicateExtremes(extremes: any[]): any[] {
    const unique = new Map();
    
    extremes.forEach(extreme => {
      const key = `${extreme.date.getDate()}-${extreme.type}`;
      if (!unique.has(key) || extreme.severity === 'severe') {
        unique.set(key, extreme);
      }
    });
    
    return Array.from(unique.values());
  }
}


// Export de l'instance
export const weatherContextService = new WeatherContextService();