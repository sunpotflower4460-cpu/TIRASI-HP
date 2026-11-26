import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const port = Number(process.env.TIRASI_TEST_PORT ?? 5173) + 1;
test.use({ baseURL: `http://127.0.0.1:${port}`, viewport: { width: 375, height: 667 }, locale: 'en-US' });

const japanese = /[぀-ヿ一-鿿]/;
/** Shown in Japanese on purpose: the language switch and the operator's own name. */
const allowed = ['言語 / Language', '日本語', '植木嘉朗'];

/** Every visible line, option and spoken label must be English. */
async function expectEnglish(page: Page, screen: string) {
  const found = await page.evaluate(() => {
    const scope = document.querySelector('[role="dialog"]') ?? document.body;
    const lines = (scope as HTMLElement).innerText.split('\n');
    for (const element of scope.querySelectorAll('[aria-label], [placeholder], [title], option')) {
      for (const name of ['aria-label', 'placeholder', 'title']) lines.push(element.getAttribute(name) ?? '');
      if (element.tagName === 'OPTION') lines.push(element.textContent ?? '');
    }
    return lines;
  });
  const left = found.filter((line) => japanese.test(allowed.reduce((text, word) => text.replaceAll(word, ''), line)));
  expect(left, screen).toEqual([]);
}

async function flyerText(page: Page) {
  const canvas = page.getByTestId('document-canvas');
  await expect(canvas).toHaveAttribute('data-errors', '0', { timeout: 30_000 });
  return (JSON.parse((await canvas.getAttribute('data-measurements')) ?? '[]') as { text: string }[]).map((m) => m.text).join('\n');
}

test('an English device gets the whole app and its flyers in English', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Done in 3 steps' })).toBeVisible();
  await expectEnglish(page, 'guide');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectEnglish(page, 'home');
  await page.getByRole('button', { name: 'Plan (Free)' }).click();
  await expectEnglish(page, 'plans');
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Make a gig flyer', exact: true }).click();
  await expectEnglish(page, 'show info');
  for (const tab of ['Design', 'Image', 'Text']) {
    await page.getByRole('tab', { name: tab }).click();
    await expectEnglish(page, tab);
  }
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const text = await flyerText(page);
  expect(text).toContain('Lineup & set times');
  expect(text).toContain('Start 18:30');
  expect(text).not.toMatch(japanese);
  await expectEnglish(page, 'preview');
});

test('the language can be chosen in the settings and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expectEnglish(page, 'settings');
  await page.getByRole('button', { name: /Privacy Policy/ }).click();
  await expectEnglish(page, 'privacy');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByLabel('言語 / Language').selectOption('ja');
  await expect(page.getByRole('button', { name: 'ライブのチラシを作る', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});
