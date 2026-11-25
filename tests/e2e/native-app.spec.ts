import { test, expect } from '@playwright/test';

// The iOS app is a Capacitor wrapper: it sets window.Capacitor before the page
// loads. These tests only check what the page does with that signal; the
// plugins themselves are covered by the unit tests and by the simulator.
test.describe('inside the iOS app', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { Capacitor: unknown }).Capacitor = { isNativePlatform: () => true };
    });
  });

  test('export buttons name where the file goes and the page uses app-only styling', async ({ page }) => {
    await page.goto('/flyer');
    await expect(page.locator('html')).toHaveClass(/native-app/);
    await expect(page.getByRole('button', { name: '写真に保存', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ファイルに保存 / 共有', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '印刷 / PDFとして保存', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNGを保存', exact: true })).toHaveCount(0);
  });
});

test('the browser keeps its own wording and is not styled as the app', async ({ page }) => {
  await page.goto('/flyer');
  await expect(page.locator('html')).not.toHaveClass(/native-app/);
  await expect(page.getByRole('button', { name: 'PNGを保存', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '共有', exact: true })).toBeVisible();
});
