/**
 * Jest Configuration for Backend
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.config.js',
    '!src/index.js', // Server başlangıç dosyası
    '!src/**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text', // Terminal çıktısı
    'text-summary', // Özet
    'html', // HTML report
    'lcov', // CI/CD uyumlu
    'json', // JSON format
  ],
  testTimeout: 10000, // 10 saniye
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js', // Test ortamını hazırla
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
  },
  verbose: true,
  randomize: false,
  maxWorkers: 4, // Parallel test çalıştırma (4 worker)
  globals: {
    __TEST__: true,
    __DEV__: false,
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
  ],
  snapshotSerializers: [],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-results/',
  ],
};
