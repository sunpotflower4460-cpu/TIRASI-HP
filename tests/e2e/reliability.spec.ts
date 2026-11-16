import { test, expect } from '@playwright/test';
import { defaultEvent } from '../../src/data/defaultEvent';
import { EVENT_LIMITS, MAX_EVENTS } from '../../src/domain/limits';
test('collection caps block additions and oversized library merges while edits still save and restore', async ({ page }) => {
  const event = {
    ...defaultEvent,
    schedule: Array.from({ length: EVENT_LIMITS.schedule }, () => ({ type: 'act', time: '14:00', name: 'Act' })),
    performers: Array.from({ length: EVENT_LIMITS.performers }, (_, index) => ({ id: `p-${index}`, name: 'Profile', catchcopy: '', bio: '', imageUrl: '', linkUrl: '' })),
    socials: Array.from({ length: EVENT_LIMITS.socials }, () => ({ label: 'Site', url: 'https://example.com' })),
  };
  const records = Array.from({ length: MAX_EVENTS }, (_, index) => ({ id: `event-${index}`, name: `Event ${index}`, eventData: index === 0 ? event : defaultEvent }));
  await page.addInitScript(data => {
    if (localStorage.getItem('limit-fixture')) return;
    localStorage.setItem('tirasi-hp:event-library:v1', JSON.stringify(data));
    localStorage.setItem('limit-fixture', 'yes');
  }, records);
  await page.goto('/editor');
  await expect(page.getByRole('button', { name: '新規', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '複製', exact: true })).toBeDisabled();
  for (const button of await page.getByRole('button', { name: '出演者を追加', exact: true }).all()) await expect(button).toBeDisabled();
  await expect(page.getByRole('button', { name: 'SNSを追加', exact: true })).toBeDisabled();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'one.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([records[1]])) });
  await page.getByRole('button', { name: '一覧に追加', exact: true }).click();
  await expect(page.getByText('イベントは100件までです。追加するには不要なイベントを削除するか、一覧を置き換えてください。', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await page.getByLabel('イベント名', { exact: true }).fill('SAVED AT CAPACITY');
  await expect.poll(() => page.evaluate(async () => {
    const path = '/src/storage/database.ts';
    const { readWorkspace } = await import(path);
    return (await readWorkspace()).events[0].eventData.title;
  })).toBe('SAVED AT CAPACITY');
  await page.reload();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('SAVED AT CAPACITY');
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: '一覧保存', exact: true }).click();
  const file = await exported;
  const { readFile } = await import('node:fs/promises');
  const { parseLibrary } = await import('../../src/domain/workspace');
  const restored = parseLibrary(await readFile((await file.path())!, 'utf8'));
  expect(restored).toHaveLength(MAX_EVENTS);
  expect(restored[0].eventData.title).toBe('SAVED AT CAPACITY');
  expect(restored[0].eventData.performers).toHaveLength(EVENT_LIMITS.performers);
});
test('public source stays separate from migrated draft across navigation and reload', async ({ page }) => {
  await page.addInitScript(event => { if (!localStorage.getItem('seeded')) { localStorage.setItem('tirasi-hp:event-data:v1', JSON.stringify({ ...event, title: 'LOCAL DRAFT' })); localStorage.setItem('seeded', 'yes'); } }, defaultEvent);
  await page.goto('/'); await expect(page.locator('h1')).toContainText('生音');
  await page.goto('/editor'); await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('LOCAL DRAFT');
  await page.getByLabel('イベント名', { exact: true }).fill('MY DRAFT');
  await expect(page.getByText('このブラウザに保存済み', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: '下書きA4を見る', exact: true }).click();
  await expect(page.locator('.one-page-title-row h1')).toHaveText('MY DRAFT');
  await page.reload(); await expect(page.locator('.one-page-title-row h1')).toHaveText('MY DRAFT');
  await page.getByRole('button', { name: '公開A4チラシ', exact: true }).click(); await expect(page.locator('.one-page-title-row h1')).toHaveText('生音');
  await page.goBack(); await expect(page.locator('.one-page-title-row h1')).toHaveText('MY DRAFT');
  await page.goto('/preview/missing'); await expect(page.getByRole('heading', { name: '下書きが見つかりません' })).toBeVisible();
});
test('A4 PNG export is staged, exact size, print remains one A4 page', async ({ page }) => {
  await page.goto('/flyer'); await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('button', { name: 'PNGを生成', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'PNGを生成', exact: true }).click();
  await expect(page.getByRole('button', { name: 'PNGを保存', exact: true })).toBeEnabled({ timeout: 30000 });
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'PNGを保存', exact: true }).click();
  const file = await download; await file.saveAs('test-results/legacy-a4.png');
  const sharp = (await import('sharp')).default;
  expect(await sharp('test-results/legacy-a4.png').metadata()).toMatchObject({ width: 2480, height: 3508, format: 'png' });
  await page.screenshot({ path: 'docs/evidence/reliability-a4.png', fullPage: true });
  await page.pdf({ path: 'test-results/legacy-a4.pdf', preferCSSPageSize: true, printBackground: true });
});
test('mobile editor does not overflow and malformed imports leave existing content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/editor');
  await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  await page.locator('input[type=file]').last().setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...defaultEvent, venue: true })) });
  await expect(page.getByText('venue: オブジェクトが必要です。')).toBeVisible();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('生音');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test('performer visibility is connected and overflow blocks export without clipping', async ({ page }) => {
  const performers = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `出演者 ${i}`, catchcopy: '紹介文', bio: '', imageUrl: '', linkUrl: '' }));
  await page.addInitScript(event => localStorage.setItem('tirasi-hp:event-data:v1', JSON.stringify(event)), { ...defaultEvent, performers, flyerOptions: { showPerformerProfiles: true } });
  await page.goto('/editor'); await page.getByRole('button', { name: '下書きA4を見る', exact: true }).click();
  await expect(page.locator('.flyer-performer-item')).toHaveCount(5);
  await page.getByRole('button', { name: '編集に戻る', exact: true }).click();
  await page.getByLabel('短い出演者紹介をA4チラシにも載せる').uncheck();
  await page.getByLabel('注意書き', { exact: true }).first().fill('長い案内文を確認します。'.repeat(500));
  await page.getByRole('button', { name: '下書きA4を見る', exact: true }).click();
  await expect(page.locator('.flyer-performer-item')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'PNGを生成', exact: true })).toBeDisabled();
  await expect(page.getByText('内容がA4の紙面からはみ出しています。', { exact: false })).toBeVisible();
});
test('a second tab cannot silently overwrite a newer workspace', async ({ page, context }) => {
  await page.goto('/editor'); await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('生音');
  const other = await context.newPage(); await other.goto('/editor'); await expect(other.getByLabel('イベント名', { exact: true })).toHaveValue('生音');
  await page.getByLabel('イベント名', { exact: true }).fill('TAB ONE');
  await expect(page.getByText('このブラウザに保存済み', { exact: false }).first()).toBeVisible();
  await expect(other.getByText('別のタブで更新されました。', { exact: false })).toBeVisible();
  await other.getByLabel('イベント名', { exact: true }).fill('TAB TWO');
  await expect(other.getByRole('button', { name: '保存を再試行' })).toBeDisabled();
  await page.reload(); await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('TAB ONE');
});
test('storage write failure preserves edits and offers a recoverable backup', async ({ page }) => {
  await page.goto('/editor'); await expect(page.getByLabel('イベント名', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof transaction>) { if (args[1] === 'readwrite') throw new DOMException('容量不足（テスト）', 'QuotaExceededError'); return transaction.apply(this, args); };
  });
  await page.getByLabel('イベント名', { exact: true }).fill('KEEP UNSAVED');
  await expect(page.getByText('未保存: 容量不足', { exact: false })).toBeVisible();
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('KEEP UNSAVED');
  await expect(page.getByRole('button', { name: '未保存の内容をJSON保存' })).toBeVisible();
});
test('a bookmarked event preview uses its own palette after another event is selected', async ({ page }) => {
  await page.addInitScript(event => {
    if (!localStorage.getItem('palette-fixture')) {
      localStorage.setItem('tirasi-hp:event-library:v1', JSON.stringify([{ id: 'summer-event', name: 'summer', eventData: { ...event, themeId: 'summer', title: 'SUMMER DRAFT' } }, { id: 'night-event', name: 'night', eventData: { ...event, themeId: 'night', title: 'NIGHT DRAFT' } }]));
      localStorage.setItem('tirasi-hp:active-event-id:v1', 'summer-event'); localStorage.setItem('palette-fixture', 'yes');
    }
  }, defaultEvent);
  await page.goto('/editor'); await page.getByRole('button', { name: '下書きA4を見る', exact: true }).click();
  const summerPreview = page.url();
  await page.getByRole('button', { name: '編集に戻る', exact: true }).click();
  await page.getByRole('combobox', { name: '編集中のイベント', exact: true }).selectOption('night-event');
  await expect(page.getByLabel('イベント名', { exact: true })).toHaveValue('NIGHT DRAFT');
  await expect.poll(async () => page.evaluate(async () => { const modulePath='/src/storage/database.ts'; const { readWorkspace } = await import(modulePath); return (await readWorkspace()).activeEventId; })).toBe('night-event');
  await page.goto(summerPreview);
  await expect(page.locator('.one-page-title-row h1')).toHaveText('SUMMER DRAFT');
  expect(await page.locator('.one-page-sheet').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(245, 252, 255)');
});
