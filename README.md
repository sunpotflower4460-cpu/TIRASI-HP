# TIRASI-HP

イベントHPと、ブラウザ内で編集するA4チラシ作成アプリ（React / TypeScript / Vite）。

- `/` と `/flyer` は `src/data/defaultEvent.ts` の公開済み情報を表示します。
- `/editor` は**このブラウザだけ**の下書きです。保存しても公開HPは変わりません。
- 編集画面の「下書きA4を見る」から、未公開チラシを確認・PNG保存できます。下書きURLは同じブラウザでのみ有効です。
- 既存の4色テーマ・イベント複製・スケジュール・出演者紹介・JSON保存/復元を保持しています。
- PNGは「生成」後に「保存」または「共有」を選びます。A4は2480×3508px、軽量版は1240×1754px。
- 印刷/PDFはブラウザの機能です。A4・倍率100%・余白なし・背景の印刷を設定してください。塗り足し付きの印刷所入稿データではありません。

## 保存と復元

v1のlocalStorageは削除せず、新しいIndexedDBへ移行します。旧単体JSON/一覧JSON、version付きv2 JSONを読み込めます。内容確認後に確定し、不正なレコードを勝手に除外しません。保存失敗と別タブとの競合は画面で通知します。

ブラウザのデータは削除や容量制限の影響を受けます。定期的にJSONでバックアップしてください。画像を含む制作物スタジオと完全バックアップはPR-Bで追加します。

公開する場合は、公開用データを書き出し、`src/data/defaultEvent.ts` を更新し、レビュー・ビルド・公開作業を行ってください。自動公開機能、ログイン認証、クラウド同期、外部生成AIはありません。公開イベントは選択済みのvol.6（2026-05-09）を保持しています。

## 開発と検証

```sh
npm ci
npm run dev
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vercel: Vite / Build `npm run build` / Output `dist`。既存のrewriteで直接URLに対応します。

公開元からHTMLメタ情報・JSON-LD・1200×630のOG PNGをビルド時生成します。日本語フォントはFontsource（Noto Sans JP, OFL-1.1）をローカル配信。追加の開発依存はVitest（MIT）、Playwright（Apache-2.0）、fake-indexeddb（Apache-2.0）、sharp（Apache-2.0）です。sharpはOG画像生成専用でブラウザへは配布しません。

設計の正本: [DA-01〜DA-23](docs/V2_DESIGN_AUDIT_AND_CONTRACTS.md)。[受入台帳](docs/ACCEPTANCE_LEDGER.md) / [進捗](docs/IMPLEMENTATION_PROGRESS.md)。PRは安定化Aとスタジオ拡張Bの2本にまとめます。
