// Test setup file
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY = 'test-weather-key';
process.env.NEXT_PUBLIC_WEATHERAPI_KEY = 'test-weatherapi-key';
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-google-client';
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-openai-key';

// Mock window.fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});