import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock IndexedDB
const mockIDBRequest = {
  result: undefined,
  error: null,
  onblocked: null,
  onupgradeneeded: null,
  onerror: null,
  onsuccess: null,
  readyState: 'done',
  source: null,
  transaction: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

global.indexedDB = {
  open: jest.fn(() => mockIDBRequest as any),
  deleteDatabase: jest.fn(() => mockIDBRequest as any),
  databases: jest.fn(() => Promise.resolve([])),
  cmp: jest.fn(),
} as any;

global.IDBKeyRange = {
  bound: jest.fn(),
  only: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  prototype: {} as any,
} as any;

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({})),
    ready: Promise.resolve({}),
    addEventListener: jest.fn(),
  },
});

// Mock connection
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  },
  writable: true,
});

// Mock getBattery
Object.defineProperty(navigator, 'getBattery', {
  value: jest.fn(() => Promise.resolve({
    level: 0.8,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 3600,
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};