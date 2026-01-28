const { test, expect } = require('@playwright/test');
test.describe('Seat Assignment E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html');
  });
  test('should auto-assign seats and apply special requirements', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    const wheelchairPassenger = page.locator('[data-passenger="4"]'); // ID 4 = wheelchair
    const assignedSeat = await wheelchairPassenger.getAttribute('data-seat');
    expect(assignedSeat).toMatch(/^[A-C]-0[1-5]/);
    const infantPassenger = page.locator('[data-passenger="3"]'); // ID 3 = infant
    const infantSeat = await infantPassenger.getAttribute('data-seat');
    expect(infantSeat).toMatch(/^[A-C]-1[0-2]/);
  });
  test('should handle manual seat reassignment', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    await page.click('button:has-text("Manual Edit")');
    const passenger1 = page.locator('[data-passenger="1"]');
    const seatA5 = page.locator('[data-seat="A-5"]');
    await passenger1.dragTo(seatA5);
    const newSeat = await passenger1.getAttribute('data-seat');
    expect(newSeat).toBe('A-5');
  });
  test('should validate seating rules', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    await page.click('button:has-text("Validate Assignment")');
    const validationResult = page.locator('[data-test="validation-result"]');
    await expect(validationResult).toContainText('All rules satisfied');
  });
  test('should group family members nearby', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    const johnSeat = await page.locator('[data-passenger="1"]').getAttribute('data-seat');
    const janeSeat = await page.locator('[data-passenger="2"]').getAttribute('data-seat');
    const johnRow = johnSeat.split('-')[1];
    const janeRow = janeSeat.split('-')[1];
    const rowDiff = Math.abs(parseInt(johnRow) - parseInt(janeRow));
    expect(rowDiff).toBeLessThanOrEqual(1); // Max 1 row fark
  });
  test('should prevent invalid window seat assignment for exit row', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Manual Edit")');
    const wheelchairPassenger = page.locator('[data-passenger="4"]');
    const exitRowWindow = page.locator('[data-seat="A-25"]'); // Exit row window
    await wheelchairPassenger.dragTo(exitRowWindow);
    const errorMsg = page.locator('[role="alert"]');
    await expect(errorMsg).toContainText('Cannot assign disabled passenger');
  });
  test('should show empty seat visualization', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    const seatGrid = page.locator('[data-test="seat-grid"]');
    await expect(seatGrid).toBeVisible();
    const emptySeats = page.locator('[data-seat-status="empty"]');
    const emptyCount = await emptySeats.count();
    expect(emptyCount).toBeGreaterThan(0);
    const filledSeats = page.locator('[data-seat-status="occupied"]');
    const filledCount = await filledSeats.count();
    expect(filledCount).toBeGreaterThan(0);
  });
  test('should export seating chart as PDF', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    await page.click('button:has-text("Export PDF")');
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('seating-chart');
  });
  test('should handle oversold flight', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=99');
    await page.click('button:has-text("Auto-Assign Seats")');
    const warning = page.locator('[role="alert"]');
    await expect(warning).toContainText('More passengers than seats');
    const standbyList = page.locator('[data-test="standby-passengers"]');
    await expect(standbyList).toBeVisible();
  });
  test('should allow undo and redo', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Manual Edit")');
    const passenger = page.locator('[data-passenger="1"]');
    const newSeat = page.locator('[data-seat="A-10"]');
    await passenger.dragTo(newSeat);
    const seatAfterMove = await passenger.getAttribute('data-seat');
    expect(seatAfterMove).toBe('A-10');
    await page.click('button:has-text("Undo")');
    const seatAfterUndo = await passenger.getAttribute('data-seat');
    expect(seatAfterUndo).not.toBe('A-10');
    await page.click('button:has-text("Redo")');
    const seatAfterRedo = await passenger.getAttribute('data-seat');
    expect(seatAfterRedo).toBe('A-10');
  });
  test('should show seat statistics', async ({ page }) => {
    await page.goto('http://localhost:8000/seat-assignment.html?roster=1');
    await page.click('button:has-text("Auto-Assign Seats")');
    await page.waitForSelector('[data-test="seat-assignment-complete"]');
    const stats = page.locator('[data-test="assignment-stats"]');
    const assignedCount = stats.locator('text=Assigned:');
    const emptyCount = stats.locator('text=Empty:');
    const occupancyRate = stats.locator('text=Occupancy:');
    await expect(assignedCount).toBeVisible();
    await expect(emptyCount).toBeVisible();
    await expect(occupancyRate).toBeVisible();
  });
});
