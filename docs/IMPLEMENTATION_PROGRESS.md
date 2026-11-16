# IMPLEMENTATION PROGRESS — TIRASI-HP v2

更新: 2026-11-16。ユーザーの実装依頼に基づき着手。規範は DA-01〜DA-23。

## 基準main SHA / 現在ブランチ / 現在コミット

- 基準main: `a270aee55b0fc27fe313ab113b25b55b8bc39803`。既存open PRなし、作業前の変更なし。
- PR-Aブランチ: `feature/tirasi-v2-reliability`。実装コミットはこの文書を含むコミット参照。
- PR-B: Aを基点にstackして続行する。

## 現在工程

A0〜A6: 安定化を実装し、ローカル検証。次はB0〜B9。

## 今回確定した事実 / 完成した実装

- 公開 `/`, `/flyer` はリポジトリの選択済みvol.6のみを表示。過去の日付を勝手に変更しない。
- `/editor` は端末内下書き。`/preview/event-:id` は明示的な下書きプレビュー。戻る/リロード/不明IDを検証。
- unknownから入れ子まで検証。v1単体・一覧およびversion付きv2 JSONに対応。不正レコードの無言除外なし。未知フィールドと旧JSON原本を保持。
- v1の3キーは読み取り専用。新IndexedDBにtransactionで初期化。StrictMode/同時初期化と4段階の中断試験を実装。
- 保存完了後のみ保存済み表示。CAS世代競合を検出、別タブの上書きを停止。直近保存をrecoveryとして保持。未保存データはメモリに保持しJSON退避できる。
- pure state transitionで削除/選択/複製を統合。初期値に戻す操作は現在のイベントのみが対象。
- ホームの時刻・季節の固定案内を排除。HTTP(S)リンク限定、画像エラー時fallback。
- 日付の旧表記を保持し、曜日を算出。特殊表示は明示。時刻重複・逆転・解析不能の警告。
- A4の出演者紹介トグルを接続し、4名での無言切り捨てを廃止。出力専用の位置補正CSSを削除、実測overflowでPNG/印刷を停止。
- PNG生成→保存/共有を分離。二重実行/離脱後の古い結果/toBlob失敗/timeoutに対応。A4は2480×3508px、軽量版1240×1754px。
- ビルド時に公開元からtitle/OGP/JSON-LDと1200×630 PNGを生成。既存の古いpublic/og-image.svgは配信メタから参照しない。
- Viteを7.3.8へ更新（監査されたhigh脆弱性を解消）。lockfileとCIのunit/build/browser検証を追加。
- 日本語フォントをFontsourceからローカル配信。Google Fontsへの必須通信を廃止。

## テスト結果 / 目視確認

- baseline `npm install`, `npm run build`: pass。
- `npm run test`: 22 tests pass（v1互換、破損入力、純粋state、4段階中断、同時初期化、競合、メタ/日付）。
- `npm run test:e2e`: 公開/下書き分離、A4 PNG寸法、390px編集、紹介5名とoverflow、2タブ競合を検証。最終件数はPR本文/CI参照。
- Chromium 159 / Linux。A4 PNGを実際に保存・デコード。ブラウザPDFはpdfinfoでA4・1ページを確認。
- `docs/evidence/baseline-a4.png`, `baseline-home.png`, `reliability-a4.png`。画面と保存PNGの主要文字・位置を目視確認。
- `npm audit --audit-level=high`: 0 vulnerabilities（更新後）。

## 既知の不具合・未検証事項 / ブロッカー

- 実iPhone/Safari/Web ShareのOS共有UI、物理印刷は未検証。Chromiumのモバイル相当画面は検証済み。ブラウザPDFと物理印刷は区別する。
- IndexedDBもユーザー削除・容量制限の影響を受ける。バックアップの端末への保存完了までは保証しない。
- PR-Bの3モード、20構図、12配色、4サイズ、6加工、原画像を含む完全バックアップは次工程。PR-A時点で完成扱いにしない。
- 外部認証/有料API/クラウド同期/デプロイは追加しない。開発のブロッカーなし。

## 次の着手点 / 再開コマンド

1. PR-Aをmain向けに提出（マージしない）。
2. A上に `feature/tirasi-v2-flyer-studio` を作り、CreativeDocument・Scene・Canvas描画を実装。
3. 20×4 PNG/保存復元/境界fixtureを検証し、PR-BをA向けに提出。

`git status --short --branch`, `git log -3 --oneline`, `npm ci`, `npm run test`, `npm run build`, `npm run test:e2e`。

## 仕様変更の決定ログ

- PR-Aでは既存A4のDOM表示を維持し、不要なexport専用補正を除去。新スタジオはCanvas共通シーンを使う方針。
- 偽の管理者認証を廃止し、ローカル編集を直接開く。公開データ変更権限は持たない。
- undo/redoおよび完全バックアップUIはPR-Bで実装。PR-Aにはtransaction/recoveryの基盤を提供。

## PR URL / レビュー待ち状況

PR-A: 提出準備。PR-B: 未提出。mainマージ/本番デプロイは実施していない。
