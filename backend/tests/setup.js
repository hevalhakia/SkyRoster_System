/**
 * Backend Test Setup
 * 
 * Bu dosya tüm backend testlerinden önce çalıştırılır.
 * 
 * İçer:
 * - Environment variables yükleme (.env.test)
 * - Global mock'lar
 * - Test veritabanı bağlantısı
 * - Afterall temizliği
 * - Custom jest matchers (opsiyonel)
 */

// Environment variables yükle
require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Globally ayarla
global.__TEST__ = true;
global.__DEV__ = false;

/**
 * Global Test Utilities
 */
global.testUtils = {
  /**
   * Async fonksiyonun hatasız çalışmasını kontrol et
   */
  expectToResolve: async (promise) => {
    try {
      await promise;
      return true;
    } catch (error) {
      throw new Error(`Expected promise to resolve but got error: ${error.message}`);
    }
  },

  /**
   * Async fonksiyonun hata fırlatmasını kontrol et
   */
  expectToReject: async (promise, expectedMessage) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to include "${expectedMessage}" but got "${error.message}"`
        );
      }
      return error;
    }
  },

  /**
   * Belirli süre sleep
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Random delay (test race conditions için)
   */
  randomDelay: (min = 10, max = 100) => {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },
};

/**
 * Custom Jest Matchers (opsiyonel)
 */
expect.extend({
  /**
   * Nested property kontrolü
   */
  toHaveProperty(received, path) {
    const keys = path.split('.');
    let current = received;
    
    for (const key of keys) {
      if (current == null || !(key in Object(current))) {
        return {
          pass: false,
          message: () => `Expected object to have property path "${path}"`,
        };
      }
      current = current[key];
    }
    
    return {
      pass: true,
      message: () => `Expected object not to have property path "${path}"`,
    };
  },

  /**
   * Array uzunluğu kontrolü
   */
  toHaveLength(received, expected) {
    const pass = Array.isArray(received) && received.length === expected;
    return {
      pass,
      message: () =>
        `Expected array to have length ${expected} but has ${received?.length || 'unknown'}`,
    };
  },

  /**
   * Status code kontrolü
   */
  toHaveStatusCode(received, expected) {
    const pass = received?.status === expected;
    return {
      pass,
      message: () =>
        `Expected response to have status ${expected} but has ${received?.status || 'unknown'}`,
    };
  },
});

/**
 * Beforeall/Afterall hooks (opsiyonel)
 * Database connection setupi vs.
 */
beforeAll(() => {
  // Test veritabanı setup (opsiyonel)
  // Örneğin: test DB connection kurulması
});

afterAll(async () => {
  // Test temizliği
  // Örneğin: test DB connection kapatılması
});

/**
 * BeforeEach/AfterEach hooks
 */
beforeEach(() => {
  // Her testten önce cleanup
  // Clear mocks, reset state, etc.
});

afterEach(() => {
  // Her testten sonra cleanup
  // Close connections, clear timeouts, etc.
  jest.clearAllMocks();
});

// Uyarıları suppress et (opsiyonel)
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Gereksiz uyarıları gizle
  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Deprecation') || 
       args[0].includes('No tests found'))
    ) {
      return; // Gizle
    }
    originalWarn.call(console, ...args);
  });

  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented') ||
       args[0].includes('ECONNREFUSED'))
    ) {
      return; // Gizle
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
