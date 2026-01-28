/**
 * Playwright Configuration
 * 
 * E2E Testing for SkyRoster Frontend
 * - Runs in headless mode (CI-friendly)
 * - Uses chromium browser
 * - Configured for localhost:5501 frontend server
 * - Includes screenshot/video on failure
 */

module.exports = {
  testDir: 'frontend/tests/e2e',
  testMatch: '**/*.spec.js',
  
  // Use chromium for CI/CD (fast, reliable)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Timeout configuration
  timeout: 30 * 1000, // 30 seconds per test
  
  // Browser and context configuration
  use: {
    baseURL: 'http://localhost:5501',
    trace: 'on-first-retry', // Trace on retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Web Server (optional - auto-start if using)
  webServer: {
    command: 'npx http-server frontend/public -p 5501 -c-1',
    port: 5501,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Report configuration
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Projects configuration
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        headless: true,
      },
    },

    {
      name: 'firefox',
      use: { 
        ...require('@playwright/test').devices['Desktop Firefox'],
        headless: true,
      },
    },

    {
      name: 'webkit',
      use: { 
        ...require('@playwright/test').devices['Desktop Safari'],
        headless: true,
      },
    },

    // CI-only: headless mobile testing
    ...(process.env.CI ? [
      {
        name: 'Mobile Chrome',
        use: { 
          ...require('@playwright/test').devices['Pixel 5'],
        },
      },
    ] : []),
  ],
};
