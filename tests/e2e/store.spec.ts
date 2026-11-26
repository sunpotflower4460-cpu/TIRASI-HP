import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const port = Number(process.env.TIRASI_TEST_PORT ?? 5173) + 1;
test.use({ baseURL: `http://127.0.0.1:${port}`, viewport: { width: 390, height: 844 } });

const ID = 'jp.tirasi.livechirashi';

/** A stand-in for the App Store, accepted by the development build only. */
async function fakeStore(page: Page, owned: string[] = []) {
  await page.addInitScript(([initial, id]) => {
    const bought = [...(initial as string[])];
    (window as unknown as { __tirasiFakeStore: unknown }).__tirasiFakeStore = {
      products: async () => [
        { id: `${id}.standard`, title: '', price: '¥600' },
        { id: `${id}.full`, title: '', price: '¥1,200' },
        { id: `${id}.upgrade`, title: '', price: '¥600' },
      ],
      owned: async () => [...bought],
      purchase: async (product: string) => { bought.push(product); return 'purchased'; },
      restore: async () => undefined,
      onChange: () => () => undefined,
    };
  }, [owned, ID] as const);
}

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'はじめる' }).click();
}
const newLive = (page: Page) => page.getByRole('button', { name: 'ライブのチラシを作る', exact: true }).click();

test('the product shows no venue content and every starting point is free to save', async ({ page }) => {
  await fakeStore(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '3ステップで完成' })).toBeVisible();
  await page.getByRole('button', { name: 'はじめる' }).click();
  await expect(page).toHaveTitle('TIRASI ライブチラシ作成');
  await expect(page.getByRole('button', { name: 'プラン（無料）' })).toBeVisible();
  for (const name of ['公開HP', '公開A4チラシ', 'イベント編集']) await expect(page.getByRole('button', { name })).toHaveCount(0);
  // Every way of starting from the home screen gives something the free plan can save.
  const home = page.getByRole('button', { name: 'ホーム', exact: true });
  const starts = ['ライブのチラシを作る', /自由なチラシを作る/, /手持ちの画像を加工する/, '作品展・写真展', 'ワークショップ', 'お店・セール', 'カフェ・メニュー', '教室・講座', '地域の催し・交流会'];
  for (const name of starts) {
    await page.getByRole('button', { name, exact: typeof name === 'string' }).click();
    await expect(page.getByRole('button', { name: '編集', exact: true })).toBeVisible();
    await expect(page.locator('.lock-notice')).toHaveCount(0);
    await home.click();
  }
  await expect(page.locator('body')).not.toContainText(/生音|TATEBAYASHI|しののめ|館林|このブラウザ|公開HP/);
  // The guide is not shown again.
  await page.reload();
  await expect(page.getByRole('heading', { name: '3ステップで完成' })).toHaveCount(0);
});

test('the home screen starts from a chosen look and reopens earlier work; phones switch between editing and saving', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  await expect(page.getByRole('heading', { name: '続きから' })).toHaveCount(0);
  await page.getByRole('button', { name: 'このデザインで作る: アコースティック' }).click();
  const form = page.getByRole('tab', { name: /ライブ情報/ });
  const save = page.getByRole('button', { name: 'PNGを保存', exact: true });
  await expect(form).toBeVisible();
  await expect(save).toBeHidden();
  await page.getByRole('button', { name: '仕上がり・保存' }).click();
  await expect(save).toBeVisible();
  await expect(form).toBeHidden();
  await expect(page.locator('.preview-heading')).toContainText('アコースティック');
  await page.getByRole('button', { name: '編集', exact: true }).click();
  await expect(form).toBeVisible();
  // The menu holds the less frequent actions.
  await page.getByLabel('メニュー').click();
  await page.getByRole('button', { name: 'デザイン違いを作る' }).click();
  await expect(page.getByLabel('制作物を選ぶ').locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(page.getByRole('heading', { name: '続きから' })).toBeVisible();
  await page.getByRole('button', { name: /^開く: / }).first().click();
  await expect(form).toBeVisible();
});

test('what the plan includes comes first, with paid choices grouped below', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  const names = (selector: string) => page.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
  await expect(page.getByRole('heading', { name: /無料で使えるデザイン\s*5/ })).toBeVisible();
  expect(await names('section[aria-labelledby="looks-title"] .store-look strong')).toEqual(['1985 ライブハウス', 'アコースティック', 'スイスグリッド', 'ボタニカル', 'インフォメーション']);
  await expect(page.locator('section[aria-labelledby="looks-title"] .lock-badge')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="paid-title"] .store-look .lock-badge')).toHaveCount(6);
  await page.getByRole('button', { name: 'ほかのデザイン 15種を見る' }).click();
  await expect(page.getByRole('dialog', { name: 'プラン' })).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();

  await newLive(page);
  await page.getByRole('tab', { name: /デザイン/ }).click();
  const galleries = page.locator('.design-pick .template-gallery');
  await expect(galleries).toHaveCount(2);
  await expect(galleries.nth(0).locator('.template-card')).toHaveCount(5);
  await expect(galleries.nth(0).locator('.lock-badge')).toHaveCount(0);
  await expect(galleries.nth(1).locator('.template-card')).toHaveCount(15);
  await expect(galleries.nth(1).locator('.lock-badge')).toHaveCount(15);
  // Colours and sizes follow the same order: usable ones first.
  const labels = await page.getByLabel('配色（構図と独立して変更）').locator('option').allTextContents();
  const firstLocked = labels.findIndex((label) => label.includes('🔒'));
  expect(labels.slice(firstLocked).every((label) => label.includes('🔒'))).toBe(true);
  const sizes = await page.getByLabel('出力サイズ').locator('option').allTextContents();
  expect(sizes.map((label) => label.includes('🔒'))).toEqual([false, false, true, true]);
});

test('a second live flyer is separate by default, and the setting changes that', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  const home = page.getByRole('button', { name: 'ホーム', exact: true });
  const title = page.getByLabel('ライブタイトル', { exact: true });
  const picker = page.getByLabel('制作物を選ぶ');
  const choice = page.getByRole('dialog', { name: '内容はどうしますか？' });
  const settings = page.getByRole('dialog', { name: '設定' });
  const saved = page.locator('.store-saved[title="この端末に保存済み"]');
  const open = async (index: number) => {
    const value = await picker.locator('option').nth(index).getAttribute('value');
    await picker.selectOption(value!);
  };
  const setMode = async (name: RegExp) => {
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await settings.getByRole('radio', { name }).check();
    await settings.getByRole('button', { name: '閉じる' }).click();
  };
  await newLive(page);
  await title.fill('春のライブ');

  // Default: separate, without any question; starts from the latest entries.
  await home.click();
  await newLive(page);
  await expect(choice).toHaveCount(0);
  await expect(title).toHaveValue('春のライブ');
  await expect(page.locator('.shared-notice')).toHaveCount(0);
  await title.fill('夏のライブ');
  await open(0);
  await expect(title).toHaveValue('春のライブ');

  // "Share": another design of the most recently edited live (summer).
  await setMode(/直前のライブと共有する/);
  await home.click();
  await page.getByRole('button', { name: 'このデザインで作る: アコースティック' }).click();
  await expect(title).toHaveValue('夏のライブ');
  await expect(page.locator('.shared-notice')).toContainText('ほかの1枚と共有中');
  await title.fill('夏の音楽会');
  await open(1);
  await expect(title).toHaveValue('夏の音楽会');
  await open(0);
  await expect(title).toHaveValue('春のライブ');

  // A shared flyer can be separated later.
  await open(2);
  await page.getByRole('button', { name: 'このチラシだけ別にする' }).click();
  await expect(page.locator('.shared-notice')).toHaveCount(0);
  await title.fill('秋のライブ');
  await open(1);
  await expect(title).toHaveValue('夏の音楽会');

  // "Ask": cancelling creates nothing; a listed live can be chosen to share.
  await setMode(/毎回えらぶ/);
  await home.click();
  await newLive(page);
  await choice.getByRole('button', { name: 'やめる' }).click();
  await expect(page.getByRole('button', { name: /^開く: / })).toHaveCount(3);
  await newLive(page);
  await choice.getByRole('button', { name: /春のライブ/ }).click();
  await expect(title).toHaveValue('春のライブ');
  await expect(page.locator('.shared-notice')).toBeVisible();
  await home.click();
  await newLive(page);
  await choice.getByRole('button', { name: /別のライブとして作る/ }).click();
  await expect(page.locator('.shared-notice')).toHaveCount(0);

  // Both the setting and the flyers survive a restart.
  await expect(saved).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^開く: / })).toHaveCount(5);
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await expect(settings.getByRole('radio', { name: /毎回えらぶ/ })).toBeChecked();
  await settings.getByRole('button', { name: '使い方を見る' }).click();
  await expect(page.getByRole('heading', { name: '3ステップで完成' })).toBeVisible();
});

test('a paid design can be tried but not saved until it is bought', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  await newLive(page);
  await page.getByRole('tab', { name: /デザイン/ }).click();
  await page.getByRole('button', { name: 'デザイン: シティポップ' }).click();
  await page.getByRole('button', { name: '仕上がり・保存' }).click();
  await expect(page.locator('.lock-notice')).toContainText('スタンダードプラン');
  await expect(page.locator('.trial-mark').first()).toBeAttached();

  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  const save = page.getByRole('button', { name: 'PNGを保存', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  const dialog = page.getByRole('dialog', { name: 'プラン' });
  await expect(dialog).toContainText('デザイン「シティポップ」');
  await expect(dialog.getByRole('button', { name: /購入する\s*¥600/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /購入する\s*¥1,200/ })).toBeVisible();
  expect(downloads).toBe(0);

  await dialog.getByRole('button', { name: /購入する\s*¥600/ }).click();
  await expect(dialog).toContainText('機能を解放しました');
  // A standard owner is offered the difference, not the full price again.
  await expect(dialog.getByRole('button', { name: /アップグレード\s*¥600/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /購入する/ })).toHaveCount(0);
  await dialog.getByRole('button', { name: '閉じる' }).click();
  await expect(page.locator('.lock-notice')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'プラン（スタンダード）' })).toBeVisible();
  const download = page.waitForEvent('download');
  await save.click();
  await download;
});

test('a block of the flyer can be nudged and put back', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  await newLive(page);
  await page.getByRole('button', { name: '仕上がり・保存' }).click();
  const canvas = page.getByTestId('document-canvas');
  // Read both attributes in one step: a redraw can start between two reads. NaN means "not drawn yet".
  const dateTop = () => canvas.evaluate((node) => {
    if (node.getAttribute('data-errors') !== '0') return Number.NaN;
    const measured = JSON.parse(node.getAttribute('data-measurements') ?? '[]') as { id: string; usedBounds: { y: number } }[];
    return measured.find((m) => m.id === 'facts-date')?.usedBounds.y ?? Number.NaN;
  });
  let original = Number.NaN;
  // The first drawing on a slow machine can take longer than the default wait.
  const slow = { timeout: 30_000 };
  await expect.poll(async () => (original = await dateTop()), slow).not.toBeNaN();
  await page.getByText('位置を微調整').click();
  const up = page.getByRole('button', { name: '日付・料金を上へ' });
  await up.click();
  await up.click();
  await expect(page.locator('.nudge-note')).toHaveText('日付・料金：上へ2。');
  await expect.poll(dateTop, slow).toBeCloseTo(original - 8, 0);
  await page.getByRole('button', { name: '元の位置' }).click();
  await expect.poll(dateTop, slow).toBeCloseTo(original, 0);
});

test('the flyer stays in sight while colours and sizes are adjusted', async ({ page }) => {
  await fakeStore(page);
  await start(page);
  await newLive(page);
  const peek = page.getByTestId('peek-canvas');
  // The main form keeps its room; the design tab shows the flyer.
  await expect(peek).toHaveCount(0);
  await page.getByRole('tab', { name: /デザイン/ }).click();
  await expect(peek).toBeVisible();
  const slow = { timeout: 30_000 };
  const picture = () => peek.evaluate((node: HTMLCanvasElement) => node.getAttribute('data-errors') === '0' ? node.toDataURL() : '');
  let before = '';
  await expect.poll(async () => (before = await picture()), slow).not.toBe('');
  await page.getByLabel('出力サイズ', { exact: false }).selectOption('square');
  await expect.poll(async () => { const now = await picture(); return now !== '' && now !== before; }, slow).toBe(true);
  // It is still on screen after scrolling to the controls further down.
  await page.getByText('書体・装飾の調整').scrollIntoViewIfNeeded();
  await expect(peek).toBeInViewport();
  await page.getByRole('button', { name: '仕上がりを開く' }).click();
  await expect(page.getByTestId('document-canvas')).toBeVisible();
  await expect(peek).toHaveCount(0);
});

test('the privacy policy and licence notices can be read inside the app', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'プライバシーポリシー' }).click();
  const policy = page.getByRole('dialog', { name: 'プライバシーポリシー' });
  await expect(policy).toContainText('個人情報を収集しません');
  await expect(policy).toContainText('Apple（App Store）');
  await policy.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('button', { name: 'ライセンス表記' }).click();
  const notices = page.getByRole('dialog', { name: 'ライセンス表記' });
  await notices.getByText('SDWebImage').click();
  await expect(notices.locator('details[open] pre')).toContainText('Permission is hereby granted');
  for (const name of ['react', 'html2canvas', 'NotoSansJP', 'BudouX']) await expect(notices.locator('summary', { hasText: name }).first()).toBeAttached();
  await notices.getByRole('button', { name: '戻る' }).click();
  await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
});

test('without a store nothing can be bought and the plan screen says so', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'プラン（無料）' }).click();
  const dialog = page.getByRole('dialog', { name: 'プラン' });
  const buttons = dialog.getByRole('button', { name: /価格を取得できません/ });
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('an owner of the full plan sees no locks', async ({ page }) => {
  await fakeStore(page, [`${ID}.full`]);
  await start(page);
  await expect(page.getByRole('button', { name: 'プラン（フル）' })).toBeVisible();
  await expect(page.locator('.lock-badge')).toHaveCount(0);
  await newLive(page);
  await page.getByRole('tab', { name: /デザイン/ }).click();
  await expect(page.locator('.lock-badge')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'デザイン: 旧版 A4' })).toHaveCount(0);
});
