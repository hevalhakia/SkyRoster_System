/**
 * Frontend Jest Configuration (React)
 * 
 * Configuration Details:
 * - Test Environment: jsdom (browser simulation)
 * - Coverage Threshold: 70%
 * - React Testing Library support
 * - CSS Modules support
 */

module.exports = {
  // Test ortamı: jsdom (browser ortamı simülasyonu)
  testEnvironment: 'jsdom',

  // Test dosyalarını bul
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],

  // Coverage raporunu oluştur
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'public/**/*.js',
    '!src/**/*.config.js',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!public/main.js',
    '!**/node_modules/**'
  ],

  // Coverage eşiği (hedef: ≥70%)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Coverage raporunu nereye yazacak
  coverageDirectory: '<rootDir>/coverage',

  // Coverage raporunun formatları
  coverageReporters: [
    'text', // Terminal çıktısı
    'text-summary', // Özet
    'html', // HTML report
    'lcov', // CI/CD uyumlu
    'json', // JSON format
  ],

  // Setup dosyaları
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
  ],

  // Module yollarını mapla
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    // CSS Modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Resimler
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Transform dosyaları (Babel ile transpile)
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Reporter seçenekleri
  reporters: [
    'default', // Varsayılan reporter
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        suiteName: 'SkyRoster Frontend Tests',
      },
    ],
  ],

  // Parallel çalıştırma
  maxWorkers: 4,

  // Globals
  globals: {
    __TEST__: true,
    __DEV__: false,
  },

  // Dış kütüphaneleri hariç tut
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
  ],

  // Watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-results/',
  ],
};
