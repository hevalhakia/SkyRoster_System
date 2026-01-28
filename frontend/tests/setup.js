/**
 * Frontend Test Setup (React)
 * 
 * Bu dosya tüm frontend testlerinden önce çalıştırılır.
 * 
 * İçer:
 * - React Testing Library setup
 * - Custom matchers
 * - Global mocks
 * - Window/DOM mocks
 */

import '@testing-library/jest-dom';
import 'dotenv/config';

// Environment variables yükle
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Global flags
global.__TEST__ = true;
global.__DEV__ = false;

/**
 * Window/DOM Mocks
 */

// Mock window.matchMedia (responsive design testleri için)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

/**
 * Global Test Utilities
 */
global.testUtils = {
  /**
   * User interaction delay
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Wait for async operations
   */
  waitFor: (callback, options = {}) => {
    const timeout = options.timeout || 1000;
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          const result = callback();
          resolve(result);
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, 50);
          }
        }
      };
      check();
    });
  },

  /**
   * Create mock user
   */
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides,
  }),

  /**
   * Create mock flight
   */
  createMockFlight: (overrides = {}) => ({
    id: 1,
    flightNumber: 'SK123',
    departureTime: '2025-12-25T10:00:00Z',
    arrivalTime: '2025-12-25T14:30:00Z',
    origin: 'IST',
    destination: 'JFK',
    aircraft: 'B777',
    passengerCapacity: 350,
    ...overrides,
  }),

  /**
   * Create mock roster
   */
  createMockRoster: (overrides = {}) => ({
    id: 1,
    flightNumber: 'SK123',
    pilots: [1, 2, 3],
    cabinCrew: [4, 5, 6],
    passengers: [],
    status: 'draft',
    validationStatus: 'pending',
    ...overrides,
  }),
};

/**
 * Custom Jest Matchers
 */
expect.extend({
  /**
   * Check if element is visible in DOM
   */
  toBeInTheDocument(received) {
    const pass = received !== null && document.body.contains(received);
    return {
      pass,
      message: () => `Expected element to be in the document`,
    };
  },

  /**
   * Check if element has class
   */
  toHaveClass(received, className) {
    const pass = received?.classList?.contains(className);
    return {
      pass,
      message: () => `Expected element to have class "${className}"`,
    };
  },

  /**
   * Check if element is disabled
   */
  toBeDisabled(received) {
    const pass = received?.disabled === true;
    return {
      pass,
      message: () => `Expected element to be disabled`,
    };
  },
});

/**
 * Before/After Hooks
 */

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorage.clear();
  
  // Reset sessionStorage
  sessionStorage.clear();
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers();
  jest.clearAllMocks();
});

/**
 * Suppress unnecessary warnings
 */
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

global.console = {
  ...console,
  warn: jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: useLayoutEffect') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return; // Suppress
    }
    originalConsoleWarn(...args);
  }),
  error: jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented') ||
       args[0].includes('SecurityError'))
    ) {
      return; // Suppress
    }
    originalConsoleError(...args);
  }),
};

/**
 * Mock API responses for testing
 */
global.mockFetch = (responseData, options = {}) => {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(responseData),
    text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(responseData)])),
    ...options,
  });
};

// Set fetch mock
global.fetch = jest.fn();
