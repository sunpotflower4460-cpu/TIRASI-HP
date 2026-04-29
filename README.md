# TIRASI-HP

生音 Acoustic Live vol.5 のチラシをベースにした、編集可能なイベントHP / A4チラシ作成アプリです。

## できること

- イベント情報をWebページとして表示
- ブラウザ上でチラシ内容を編集
- 編集内容をlocalStorageに保存
- A4プレビューを表示
- ブラウザの印刷機能からPDF保存

## 画面

- `/`：イベントHP表示
- `/editor`：編集画面
- `/flyer`：A4チラシプレビュー

## 開発

```bash
npm install
npm run dev
npm run build
```

## 今回の方針

この初期版では、外部API・認証・DB・課金・AI接続は使いません。  
編集内容はユーザーのブラウザ内にだけ保存されます。

## Vercel

Vercelでは以下の設定で動きます。

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
