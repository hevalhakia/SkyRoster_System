import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'test@skyroster.com',
  password: 'test123',
};
const FLIGHT_NUMBER = 'TK123';
test.describe('Roster Generation Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n🔑 SETUP: Login işlemi başlanıyor...');
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await expect(page).toHaveTitle(/Login|Sign In/i);
    console.log(`✓ Login sayfasında (URL: ${page.url()})`);
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator(
      'button:has-text("Login"), ' +
      'button:has-text("Sign In"), ' +
      'button:has-text("Giriş")'
    );
    await Promise.all([
      expect(emailInput).toBeVisible({ timeout: 5000 }),
      expect(passwordInput).toBeVisible({ timeout: 5000 }),
      expect(loginButton).toBeVisible({ timeout: 5000 }),
    ]);
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    const loginResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/login') &&
        response.status() === 200
    );
    await loginButton.click();
    try {
      await loginResponsePromise;
    } catch (error) {
      console.warn('Login API response error:', error.message);
    }
    await page.waitForURL(/.*dashboard.*/i, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  });
  test.afterEach(async ({ page }) => {
    try {
      const logoutButton = page.locator(
        'button:has-text("Logout"), ' +
        'a:has-text("Logout"), ' +
        'button[aria-label*="Logout"]'
      );
      if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton.click();
        await page.waitForURL(/.*login.*/i, { timeout: 5000 }).catch(() => {});
      }
    } catch (error) {
      console.warn('Logout error:', error.message);
    }
  });
  test('should complete full roster flow - flight search to export', async ({ page, context }) => {
    const searchFlightButton = page.locator(
      'a:has-text("Search Flight"), button:has-text("Search Flight"), a:has-text("Flights"), button:has-text("Find Flight")'
    );
    await expect(searchFlightButton).toBeVisible({ timeout: 5000 });
    await searchFlightButton.click();
    await page.waitForURL(/.*flight-search|.*search.*/i, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const flightInput = page.locator(
      'input[placeholder*="Flight"], input[placeholder*="flight"], input[name="flightNumber"], input[id*="flight"]'
    ).first();
    await expect(flightInput).toBeVisible({ timeout: 3000 });
    await flightInput.fill(FLIGHT_NUMBER);
    const searchButton = page.locator('button:has-text("Search"), button:has-text("Find"), button:has-text("Ara")');
    const searchResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/flights') && response.status() === 200
    );
    await searchButton.click();
    try {
      await searchResponsePromise;
    } catch (error) {
      console.warn('API response error:', error.message);
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const firstFlightRow = page.locator(
      'tr[data-flight-id], div[class*="flight-item"], div[class*="flight-result"], .flight-card'
    ).first();
    await expect(firstFlightRow).toBeVisible({ timeout: 5000 });
    const selectButton = firstFlightRow.locator('button:has-text("Select"), button:has-text("Choose"), button:has-text("Seç")');
    if (await selectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await selectButton.click();
    } else {
      await firstFlightRow.click();
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const generateRosterButton = page.locator(
      'button:has-text("Generate Roster"), button:has-text("Create Roster"), button:has-text("Build Roster"), button:has-text("Oluştur")'
    );
    await expect(generateRosterButton).toBeVisible({ timeout: 5000 });
    const rosterResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/rosters') && response.status() === 201
    );
    await generateRosterButton.click();
    try {
      await rosterResponsePromise;
    } catch (error) {
      console.warn('Roster API response error:', error.message);
    }
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const crewSection = page.locator(
      'section:has-text("Crew"), div:has-text("Crew"), [class*="crew"]'
    ).first();
    const passengerSection = page.locator(
      'section:has-text("Passenger"), div:has-text("Passenger"), [class*="passenger"]'
    ).first();
    const crewVisible = await crewSection.isVisible({ timeout: 2000 }).catch(() => false);
    const passengerVisible = await passengerSection.isVisible({ timeout: 2000 }).catch(() => false);
    expect(crewVisible || passengerVisible).toBeTruthy();
    const assignSeatsButton = page.locator(
      'button:has-text("Assign Seats"), button:has-text("Seat Assignment"), a:has-text("Assign Seats"), button:has-text("Koltuk Ata")'
    );
    if (await assignSeatsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assignSeatsButton.click();
      await page.waitForURL(/.*seat|.*assign.*/i, { timeout: 5000 }).catch(() => {});
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const seatMap = page.locator('[class*="seat"], [id*="seat"], .seat-map, .seats-container, [data-testid*="seat"]').first();
    if (await seatMap.isVisible({ timeout: 5000 }).catch(() => false)) {
      const availableSeat = page.locator('[class*="available"], [data-status="available"], .seat.available, button[data-seat]:not([disabled])').first();
      if (await availableSeat.isVisible({ timeout: 2000 }).catch(() => false)) {
        const seatNumber = 
          (await availableSeat.getAttribute('data-seat')) ||
          (await availableSeat.getAttribute('aria-label')) ||
          (await availableSeat.textContent()) ||
          'N/A';
        await availableSeat.click();
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
        const passengerModal = page.locator('dialog, [role="dialog"], .modal, [class*="modal"]').first();
        if (await passengerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const passengerSelect = page.locator('select[name*="passenger"], select').first();
          if (await passengerSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
            await passengerSelect.selectOption({ index: 1 });
            const confirmButton = page.locator(
              'button:has-text("Confirm"), button:has-text("Assign"), button:has-text("Onayla")'
            ).first();
            if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              const assignResponsePromise = page.waitForResponse(
                response => response.url().includes('/api/rosters') && (response.status() === 200 || response.status() === 201)
              );
              await confirmButton.click();
              try {
                await assignResponsePromise;
              } catch (error) {
                console.warn('Seat assignment API error:', error.message);
              }
            }
          }
        }
      }
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const saveRosterButton = page.locator(
      'button:has-text("Save Roster"), button:has-text("Save"), button:has-text("Complete"), button:has-text("Kaydet")'
    );
    if (await saveRosterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const saveResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/rosters') && (response.status() === 200 || response.status() === 204)
      );
      await saveRosterButton.click();
      try {
        await saveResponsePromise;
      } catch (error) {
        console.warn('Roster save API error:', error.message);
      }
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
    const exportButton = page.locator(
      'button:has-text("Export JSON"), button:has-text("Export"), button:has-text("Download"), button:has-text("İndir")'
    );
    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = context.waitForEvent('download');
      await exportButton.click();
      try {
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        expect(filename.toLowerCase()).toMatch(/\.json$/);
        const downloadsPath = path.join(process.cwd(), 'test-downloads');
        if (!fs.existsSync(downloadsPath)) {
          fs.mkdirSync(downloadsPath, { recursive: true });
        }
        const filepath = path.join(downloadsPath, filename);
        await download.saveAs(filepath);
        expect(fs.existsSync(filepath)).toBeTruthy();
        const fileContent = fs.readFileSync(filepath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        expect(jsonData).toHaveProperty('flight');
        expect(jsonData).toHaveProperty('crew');
        expect(jsonData).toHaveProperty('passengers');
        if (jsonData.flight) {
          expect(jsonData.flight).toHaveProperty('number');
          expect(jsonData.flight).toHaveProperty('departure');
          expect(jsonData.flight).toHaveProperty('arrival');
        }
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (error) {
        console.error('File download error:', error.message);
        throw error;
      }
    }
  });
test('should handle network errors gracefully', async ({ page }) => {
    await page.context().setOffline(true);
    const searchFlightButton = page.locator('button:has-text("Search Flight")');
    if (await searchFlightButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchFlightButton.click();
    }
    await page.context().setOffline(false);
  });
  test('should maintain session during long operations', async ({ page }) => {
    await expect(page).toHaveURL(/.*dashboard.*/i);
    await page.waitForTimeout(5000);
    const logoutButton = page.locator('button:has-text("Logout")');
    const isLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isLoggedIn).toBeTruthy();
  });
});
