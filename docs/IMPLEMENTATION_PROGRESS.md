# IMPLEMENTATION PROGRESS — TIRASI-HP v2

更新: 2026-11-16。ユーザーの実装依頼と「旧版も選択可能にし、各デザインの品質を上げる」追加依頼を反映。

## 基準main SHA / 現在ブランチ / 現在コミット

- 基準main: `a270aee55b0fc27fe313ab113b25b55b8bc39803`。作業開始時のopen PR/変更なし。最終fetchでもmainは同じ。
- PR-A: `feature/tirasi-v2-reliability` / `11bbac43916f859c58fe11ba4d8062ed5e99456f`。
- PR-B: `feature/tirasi-v2-flyer-studio`。PR-Aを基点にstack。最終HEADはこの文書を含むコミット参照。

## 現在工程

A0〜A6を実装しPR-Aを提出済み。B0〜B9を実装・ローカル検証し、PR-Bを提出する最終チェックポイント。実装・実測範囲は受入台帳を参照。

## 今回確定した事実 / 完成した実装

### PR-A

- 公開 `/`, `/flyer` は選択済みのvol.6のみ。過去の日付を勝手に変更しない。下書きは専用経路。
- strict nested schema、v1/v2 JSON、原JSON保持、全件確認・追加/置換、pure state transition。
- IDBへのtransactional migration、readonly v1キー、4段階中断・同時初期化、CAS競合・保存失敗UI、直近recovery。
- 出演者紹介toggle、URL制限とfallback、曜日算出と時刻診断、A4 overflow block。
- PNG生成/保存/共有を分離、固定px、timeout/toBlob失敗と世代保護。
- 公開メタをビルド生成、lockfile/CI、Vite high脆弱性の解消、日本語フォントのローカル配信。

### PR-B

- Eventと独立したCreativeDocument 3種。linked/snapshot・上書き・visibility・サイズ別配置・Undo/Redo・削除の取り消し。
- `/studio` と `/preview/document/:id`、イベントプレビュー `/preview/event/:id`。旧preview経路も互換読込。
- 新20構図・12配色・4サイズ、自由制作6用途、実描画ギャラリーとフィルター。
- 旧版「生音 A4」を同じギャラリーから選択。4配色・丸ゴシック・カード構成を保持。新20構図へは数えない。
- Canvas Sceneに共通の文字計測・禁則の簡易処理・最小文字サイズ・重なり/安全域/必須項目/画像欠損診断。
- 時刻と出演名を独立した表にし、縦見出し・版ずれ・夕景・大きな日付・写真枠・手描き枠など各構図を個別調整。詳細はDESIGN_QUALITY_REVIEW.md。
- PNG/JPEG/WebPのmagic bytes・実デコード・8MB/16MP/8192px制限、原本のIDB保存。Blob URL/Bitmapの後始末。
- 原画像を保持した6加工、強度と各種質感、Before/After、任意の演出日付。生成AIなし。
- 原画像とrecipe/hashを含む完全バックアップ64MB、JSONのみ4MB、制作物ごとの完全バックアップ。内容プレビュー後のtransactional restore。別ブラウザコンテキストで復元成功、原本のSHA一致。
- 不正な既存v2領域は勝手に初期化せず、原本を退避して自動上書きを止める。明示的な有効バックアップ復元は可能。
- 元画像欠損のcommitはabortし、本文も新素材も部分保存しない。
- CanvasのA4印刷時は高解像度描画を準備。PNGと同一の紙面仕様。PNGの初期読込負荷を減らすため旧版用html2canvasを遅延読み込み。
- 旧版サムネイルと本紙が同居しても、PNGは対象本紙のcloneを正しく使用。旧4配色のPNGを保存・デコードして比較。夜テーマでも編集フォームは可読な配色を保持。
- UIをContent/Design/Image/Backup/Previewへ分割。unused型・引数を検査するTypeScript設定。Noto Sans / Noto Serif / Zen Maruの自己配信とOFLライセンス。
- OGの日本語を同梱フォントでビルドし、ビルド環境のシステムフォント依存を除去。旧SVG URLも公開元から生成。

## テスト結果 / 目視確認

- 単体32件: schema/migration/reducer/CAS/保存失敗/素材参照のatomic abort/構図と配色/バインディング/非破壊切替等。
- Chromium 159 / LinuxのE2E 14件: 公開/下書き、旧版選択、10回切替・Undo/Redo、画像位置と元コピー保持、リロード、完全バックアップの別コンテキスト復元、改ざん拒否、6加工の再現性、元画像不変、長文/出演者8名、390px操作、A4 PNG/PDF。
- 新20×4=80 PNG全件: PNGデコード、指定px、必須情報、安全域と文字衝突を検査。`docs/evidence/render-matrix.json`。
- 比較画像: `template-contact-sheet.png`, `legacy-selected.png`, `effect-contact-sheet.png`, `studio-mobile.png`, `treatment-restored.png`。旧/新の構図と主要文字・配色を目視確認。
- ローカル `npm run build`, `npm run test`, `npm run test:e2e`, `git diff --check`: pass。最終再実行も32 unit / 14 E2Eでpass。旧版4配色の実PNGと、印刷用2480×3508 Canvasの画素が生成PNGと一致することも検証。CI結果は提出後に追記する。
- `npm audit --audit-level=high`: 0 vulnerabilities。
- A4のブラウザPDFはpdfinfoでA4・1ページ。実際の印刷とは区別する。
- PR-A GitHub Actions: success、run `43850253039`。

## 既知の限界 / 未検証 / ブロッカー

- 実iPhone/SafariのOS共有UI、物理印刷、全端末のメモリ制約は未検証。Chromiumのモバイル相当・PDFは検証済み。
- 旧版はイベントA4・従来4配色。画像枠は新20構図または画像加工で利用する。SNSはPNG専用。塗り足し・確定PDF独自生成は含まない。
- ローカル保存は削除/容量制限の影響を受ける。バックアップの端末側保存完了までは保証しない。
- 外部認証・クラウド同期・生成AI・有料API・自動公開は追加していない。完全オフライン保証なし。開発ブロッカーなし。

## 仕様変更の決定ログ

- 出力共通仕様は新StudioのCanvas Sceneへ実装し、旧版はDOM/A4互換rendererとして分離。20レイアウトと旧版1つを区別する。
- 完全バックアップはZIPではなく、versioned JSON manifest + base64原画像 + SHA-256の単一パッケージ。ZIPの任意パス展開や圧縮爆弾を処理しない。全体64MB、単一制作物の別書き出しも提供。
- 80s画像加工は非生成のローカルフィルター。原画像を改変しない。
- 配置調整があるテンプレート切替は、配色のみ/新しいコピーの2択を明示し元を残す。
- 見出し書体にAutoを加え、手動書体選択は確実に適用。旧版は従来の丸ゴシック。
- この依頼中の追加素材は自作の幾何学とテストfixtureのみ。ユーザーの会話画像や第三者素材を転載していない。

## 次の着手点 / 再開コマンド

1. 最終検証結果と比較画像を確認し、PR-BをA向けに提出（自動マージ・デプロイなし）。
2. GitHub Actionsの完了を確認して結果を追記する。
3. レビュー時はA→Bの順で確認。実機共有・紙面は運用者が確認する。

`git status --short --branch`, `git log -3 --oneline`, `npm ci`, `npm run test`, `npm run build`, `npm run test:e2e`。

## PR URL / レビュー待ち

- PR-A: https://github.com/sunpotflower4460-cpu/TIRASI-HP/pull/36 （main向け、未マージ）
- PR-B: 提出準備中（base: feature/tirasi-v2-reliability）
- mainマージ / 本番デプロイ: 実施していない。
