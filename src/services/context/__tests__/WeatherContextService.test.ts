import { weatherContextService } from '../WeatherContextService';
import { Coordinates } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('WeatherContextService', () => {
  const mockLocation: Coordinates = { lat: 48.8566, lng: 2.3522 };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache
    (weatherContextService as any).weatherCache.clear();
  });

  describe('getWeatherContext', () => {
    it('should fetch weather data from primary provider', async () => {
      const mockWeatherData = {
        list: [
          {
            dt: 1234567890,
            main: { temp: 20, feels_like: 18, humidity: 60 },
            weather: [{ main: 'Clear', description: 'clear sky' }],
            wind: { speed: 5 }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.current.temp).toBe(20);
      expect(result.forecast).toHaveLength(1);
      expect(result.analysis).toBeDefined();
    });

    it('should fallback to secondary provider on primary failure', async () => {
      // Primary fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Secondary succeeds
      const mockSecondaryData = {
        current: {
          temp_c: 15,
          feelslike_c: 13,
          humidity: 70,
          condition: { text: 'Partly cloudy' },
          wind_kph: 10
        },
        forecast: {
          forecastday: []
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSecondaryData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result).toBeDefined();
      expect(result.current.temp).toBe(15);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return cached data if available', async () => {
      const mockWeatherData = {
        list: [{
          dt: 1234567890,
          main: { temp: 20, feels_like: 18, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
          wind: { speed: 5 }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData
      });

      // First call
      await weatherContextService.getWeatherContext(mockLocation);

      // Second call should use cache
      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should generate appropriate recommendations for hot weather', async () => {
      const mockHotWeatherData = {
        list: Array(8).fill({
          dt: 1234567890,
          main: { temp: 35, feels_like: 38, humidity: 80 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
          wind: { speed: 2 }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHotWeatherData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result.analysis.recommendations).toContainEqual(
        expect.objectContaining({
          reason: expect.stringContaining('Très chaud'),
          suggestion: expect.stringContaining('frais')
        })
      );
    });

    it('should handle rainy weather appropriately', async () => {
      const mockRainyData = {
        list: Array(8).fill({
          dt: 1234567890,
          main: { temp: 15, feels_like: 13, humidity: 90 },
          weather: [{ main: 'Rain', description: 'heavy rain' }],
          rain: { '3h': 10 },
          wind: { speed: 15 }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRainyData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result.analysis.rainyDays).toBeGreaterThan(0);
      expect(result.analysis.recommendations).toContainEqual(
        expect.objectContaining({
          reason: expect.stringContaining('pluie'),
          suggestion: expect.stringContaining('réconfortant')
        })
      );
    });

    it('should return default context on complete failure', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockRejectedValueOnce(new Error('Secondary failed'));

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result).toBeDefined();
      expect(result.current.weather).toBe('Unknown');
      expect(result.impact.needsAdaptation).toBe(false);
    });
  });

  describe('Weather Analysis', () => {
    it('should calculate correct average temperature', async () => {
      const mockData = {
        list: [
          { dt: 1, main: { temp: 10 }, weather: [{ main: 'Clear' }], wind: { speed: 5 } },
          { dt: 2, main: { temp: 20 }, weather: [{ main: 'Clear' }], wind: { speed: 5 } },
          { dt: 3, main: { temp: 30 }, weather: [{ main: 'Clear' }], wind: { speed: 5 } }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result.analysis.avgTemp).toBe(20);
    });

    it('should identify extreme weather events', async () => {
      const mockExtremeData = {
        list: [
          { dt: 1, main: { temp: 40 }, weather: [{ main: 'Clear' }], wind: { speed: 5 } },
          { dt: 2, main: { temp: -5 }, weather: [{ main: 'Snow' }], wind: { speed: 30 } }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExtremeData
      });

      const result = await weatherContextService.getWeatherContext(mockLocation);

      expect(result.analysis.extremeWeather).toHaveLength(2);
      expect(result.analysis.extremeWeather).toContainEqual(
        expect.objectContaining({ type: 'extreme_heat' })
      );
      expect(result.analysis.extremeWeather).toContainEqual(
        expect.objectContaining({ type: 'extreme_cold' })
      );
    });
  });
});