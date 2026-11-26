# IMPLEMENTATION PROGRESS — TIRASI-HP v2

更新: 2026-11-16。ユーザーの実装依頼と「旧版も選択可能にし、各デザインの品質を上げる」追加依頼を反映。

## 基準main SHA / 現在ブランチ / 現在コミット

- 基準main: `a270aee55b0fc27fe313ab113b25b55b8bc39803`。作業開始時のopen PR/変更なし。最終fetchでもmainは同じ。
- PR-A: `feature/tirasi-v2-reliability` / 最新レビュー修正 `889cbcfe125ede082590da08b01f8d087a8ff672`（初回 `11bbac4`）。
- PR-B: `feature/tirasi-v2-flyer-studio`。PR-Aを基点にstack。機能コミット `c559b48274aa96626ca11acd8e7848ae83506336`。最終HEADは検証記録の整理を含む。

## 現在工程

A0〜A6を実装しPR-Aを提出済み。B0〜B9を実装・ローカル検証し、PR-Bも提出済み。両PRはレビュー待ち。実装・実測範囲は受入台帳を参照。

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

- 単体44件: schema/migration/reducer/CAS/保存失敗/素材参照のatomic abort/構図と配色/バインディング/非破壊切替/件数上限と復元/OG日本語字形等。
- Chromium 159 / LinuxのE2E 20件: 公開/下書き、旧版選択、10回切替・Undo/Redo、画像位置と元コピー保持、リロード、完全バックアップの別コンテキスト復元、改ざん拒否、6加工の再現性、元画像不変、長文/出演者8名、390px操作、A4 PNG/PDF、件数上限での編集・保存・復元。
- 新20×4=80 PNG全件: PNGデコード、指定px、必須情報、安全域と文字衝突を検査。`docs/evidence/render-matrix.json` に80組の要約。全測定と必須文字はCI artifactの `test-results/render-matrix-full.json` に保存。
- 比較画像: `template-contact-sheet.png`, `legacy-selected.png`, `effect-contact-sheet.png`, `studio-mobile.png`, `treatment-restored.png`。旧/新の構図と主要文字・配色を目視確認。
- ローカル `npm run build`, `npm run test`, `npm run test:e2e`, `git diff --check`: pass。デザイン再制作後の再実行も44 unit / 20 E2Eでpass。旧版4配色の実PNGと、印刷用2480×3508 Canvasの画素が生成PNGと一致することも検証。最新CIは各PRのChecksを参照する。
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

1. 提出済みPR-A #36 / PR-B #37のレビューを確認する（自動マージ・デプロイなし）。
2. 最新のGitHub Actionsの結果は各PRのChecksを参照する。
3. レビュー時はA→Bの順で確認。実機共有・紙面は運用者が確認する。

`git status --short --branch`, `git log -3 --oneline`, `npm ci`, `npm run test`, `npm run build`, `npm run test:e2e`。

## PR URL / レビュー待ち

- PR-A: https://github.com/sunpotflower4460-cpu/TIRASI-HP/pull/36 （main向け、未マージ）
- PR-B: https://github.com/sunpotflower4460-cpu/TIRASI-HP/pull/37 （base: feature/tirasi-v2-reliability、未マージ）
- mainマージ / 本番デプロイ: 実施していない。

## 追加レビュー対応（2026-11-16）

- PR-A `4249a09db01a6bc255112eba89e83a3f27d553de`: 退避Workspaceのイベント復元と、URLで指定されたpreviewの配色を修正。unit23 / E2E7を確認。
- PR-B: 上記A修正をmergeし、サムネイルは共有する長辺256px、主プレビューは長辺1000pxへ縮小。原寸画像はPNG/印刷時にだけ展開し、完了後に解放する。
- 1600万画素の実PNGで、20サムネイルが1回の256px decodeを共有することをブラウザで確認。参照カウント・最後の解放・失敗後の再試行をunitで検査。
- snapshotの解決を共通関数に統一し、固定後にイベントを編集しても入力欄と紙面が一致することを確認。
- 旧版は自身のテーマを持ち、Nightの祖先CSSの影響を避ける。Nightイベントのまま旧版Springを選ぶ回帰を検査。
- 復元成功時に履歴・削除Undoを初期化し、同一IDの再追加も防止。削除→復元→再編集・保存の回帰を検査。
- 欠損画像と同じhashの原本を再アップロードした際にも、保存完了通知でプレビューを再取得。復元後の画像欠損→同じ原本の再選択をE2Eで確認。
- レビュー対応後の最終ローカル検証: unit35 / Chromium E2E17（新80 PNG、旧4配色、印刷PNG一致を含む）/ build / diff checkがpass。
- PR-Bの初回機能・検証記録コミットのCIはsuccess（run 43860859246 / 43861166039）。追加レビュー対応の最終CIは各PRのChecksを参照。

## 件数上限・日本語OGの最終レビュー対応（2026-11-16）

- PR-A `889cbcfe125ede082590da08b01f8d087a8ff672`を取り込み。A単独のunit28件 / E2E8件 / build / audit0、GitHub Actions run43866305602がsuccess。
- 入力・保存・復元で同じ件数上限を共有。イベント100 / schedule100 / プロフィール50 / SNS30で追加ボタンとpure reducerの両方が上限超過を防ぎ、理由を表示。一覧追加の上限エラーも候補を残して案内する。
- 上限満杯のブラウザfixtureで、その後の編集→IDB保存→reload→一覧JSON復元が成功することを確認。大量入力が保存不能のWorkspaceを作らない。
- 日本語OGの同梱フォント描画をPR-Aへ移し、両PRに別々の漢字の字形を比較する回帰試験を追加。1200×630 PNGの日本語を目視確認。
- 統合後の最終ローカル検証はunit40件 / Chromium E2E18件 / build / diff checkがpass。新80 PNG・旧4配色・画素一致・原画像と完全バックアップの検証を含む。
- branchは`feature/tirasi-v2-flyer-studio`、直前HEADは`bce96566ba1b72abc80de6feec4e20a5c38888da`。この統合をPR-B #37へ反映し、最新CIとレビューの対応済み状態を確認する。main / 本番は変更しない。


## デザイン品質の再制作（2026-11-16、ユーザーの追加依頼）

- 基準main `a270aee55b0fc27fe313ab113b25b55b8bc39803`、PR-Bの直前HEAD `b8d1a11a3fe41d4864beafc15f50d04e016a17d4`。開始時にremote/PR #37を再照会し、未マージ・差分なしを確認。現在の作業枝は`feature/tirasi-v2-flyer-studio`。
- B4/B5/B8/B9を再実施。前版の「小さな装飾と似た二段組」を批評し、DESIGN_POLISH_BRIEF.mdを先に記録。公開OSSのfrontend-designスキルを読んで、主役・題材・文字の階層・実画像の批評手順を適用。
- `layouts.ts`に20構図とサイズ別reflow、`artwork.ts`にオリジナルの夕景・ギター・マイク・植物・版画・円相等を実装。主役の絵には固有縦横比を与え、正方形でも楽器や植物をつぶさない。アップロード写真は文字から独立した領域へ置き、手動移動での交差も出力前に検出する。
- `scene.ts` / `render.ts`に階層付きflow組版。会場名・住所・主催・注意書き・Open Micを役割別の大きさと間隔で配置し、実際に計測した行長から全体を再配置。最小文字サイズ以下への縮小や全文の切捨てはしない。
- Google BudouX v0.10.4のpure parserと日本語モデルを、著作権表示・Apache-2.0・出典付きで同梱。見出しを文節単位で均衡させ、明示改行を尊重。npm入口を実測した際は他言語/DOM処理も入り719.64kBになったため、必要部分だけの同梱へ変更。最終の初期JSは367.67kB / gzip122.78kB（以前336.75kB / gzip107.57kB）。
- Barlow Condensed / Cormorant GaramondのOFLフォントを追加。全5書体を自己配信。ギャラリーは320px Canvas、共有する画像Bitmapは従来通り256px。おすすめ配色の同時適用はチェックで解除でき、Undoで元に戻る。
- 単体44件 / Chromium E2E20件 / buildがpass。通常80 PNG、画像入りイベント・自由制作160 PNG、旧4配色、画像共有decode、原画像/完全バックアップ、印刷PNG一致、390px操作を検査。和文改行4件と配色の選択・Undo、160出力の画像と文字の非交差を追加。
- 画像証跡は`docs/evidence/`に再生成。前版は`designs-before-polish.png`として保持。A4/正方形/Storyと自由制作を別のproof scriptでも描画し、一覧と代表原寸で批評する。scriptのPNGは診断エラーがあっても保存し、成功扱いにせず終了コード1を返す。
- 実iPhone/SafariのOS共有、物理印刷、全実機のメモリ上限は引き続き未検証。美的な最終判断と機械的な合否は区別する。自動マージ・本番デプロイは行わない。
- 原寸批評の追補: 幅の細い見出しは文節が収まるまで文字サイズも再探索。実フォントで「週末の、 / よりみち。」の2行を検証。アールデコの下端装飾は安全領域の外へ下げ、出演者名を横切らせない。
- 仕上げ後の重点再実行はE2E5件（通常80 PNGと画像入り160 PNG、6加工、長文、配色Undo、文節改行）、さらに通常マトリクス1件がpass。全体E2E20件も前段の再制作確認でpass。最終headの全体CIはPRのChecksで確認する。
- 比較のため直前HEADの隔離checkoutも同じ1000px幅・同じ本文で20枚再描画。`assemble-design-evidence.mjs`で未検証/失敗レコードを拒否して比較と数値を作成。`design-polish-summary.json`に通常80 / 画像入り80+80 / 写真と文字の交差0 / 和文2行を記録。
- 次の3手: 同じPR-B #37へcommit/push → 最新CIを確認 → URLと未検証範囲を報告。PRを追加しない。

## ライブの継続制作を優先した仕上げ（2026-11-16）

- ユーザーが主用途を「毎回の手間を省くライブチラシ、旧版同様のタイトル・出演者の自動配置」と明確化。`LIVE_WORKFLOW_BRIEF.md`へ記録し、同じPR-B #37で継続。基準HEADは`50422528e0bea7e47a879d8b33457a49fc42ba5a`。remoteを再照会し、main `a270aee55b0fc27fe313ab113b25b55b8bc39803`、base PR-A `889cbcfe125ede082590da08b01f8d087a8ff672`、既存レビュー4スレッドの解決を確認した。
- 新しいイベント制作だけを旧版A4・ライブ情報タブ・ライブ向け8候補へ。自由制作・画像加工・全20構図・12配色・4サイズ・既存の制作物と原画像は保持。会場等は折りたたみ、出演者と日付を直接編集する。
- `live.ts`に次回の回数候補・日付表記維持・新イベントと新チラシの同時複製を追加。日付はユーザー入力。前回のEvent/Documentを変えず、本文・固定情報・全配置・原画像参照・未知項目を維持。通常のコピーは「デザイン違いを作る」と明示して区別する。
- 過去の出演者候補・複数行追加・上下移動・演奏と転換からの時刻一括設定・時刻を隠す名前だけ表示を追加。時刻非表示では紙面の休憩/終了も隠すが、原文と時刻は保持。古いJSONで`visibility.times`がなくても従来通り表示し、保存検証で不正な真偽値を拒否。
- `history.ts`でライブ本文と制作物を一緒にUndo/Redo。共有イベントが他のデザインで変更された場合、古いUndoが最新本文を上書きしない。snapshotでは固定コピーだけを編集する。
- `liveRecipe`でイベント用20構図の上部を抑え、出演者と案内を広げた。名前の設計上限を36〜44へ。マガジンは全幅の出演欄へ。自由制作は従来構図を維持。Studio専用のモバイルナビを一列・非固定にして入力欄の被覆を解消。
- ローカル`npm run test:all`が単体56件 / Chromium E2E24件 / buildで成功。通常80・名前だけ80・画像入りイベントと自由制作160、計320 PNGの寸法・全文・実測安全域・非交差を確認。旧4配色、原画像/完全バックアップ、共有/固定コピー、印刷PNG一致、A4 PDF1ページの回帰も成功。新規の次回作成→元は不変→別の出演者へ変更→IDB保存→再読込→2480×3508PNGを操作で検証。
- unit fixtureの初期データにtimezone正規化が欠けた比較と、公開H1の副題を含まない期待値を修正。製品の公開データは変更していない。日付helperは正規化した年月日から出力し、旧日付形式でもNaNにならないことを検査。
- `render-live-proof.mjs`で旧版を含む8構図×2表示の実PNGを追加生成。`docs/evidence/live-designs.png` / `live-names-only.png`とPC・390px・次回ダイアログを目視確認。既存の初回再制作比較は基準5042252の歴史記録と明記し、最新の全20構図一覧は更新する。
- 最終目視で、制作物を開いた後のモバイル見出し・保存表示・選択欄を圧縮し、タイトル入力までのスクロールを短縮。次回ダイアログも画面中央へ調整。ライブ＋StudioのE2E11件を再実行して成功。日付helperの正規化後も単体56件・buildが成功し、npm auditは脆弱性0。
- ライブ優先の実装は`bcc41c163aa0eaa29fc7c3b21c171f39c7a684cc`でPR-Bへpush済み。追加確認で、500文字の管理名から通常コピー/構図コピーを作ると接尾辞で保存上限を超える既存経路を発見。コピーだけの管理名を接尾辞付き500文字以内にし、元の管理名とライブ本文を保持した。500文字の原本→コピー→本文編集→保存→再読込のE2Eを既存テストへ追加し、成功。単体56件とbuildも再実行して成功。
- 実iPhone/SafariのOS共有、物理印刷、端末ごとのメモリ上限は未検証。次はこの変更を既存PR-Bへcommit/pushし、最新HEADのCI成功を確認。mainマージ・本番デプロイは行わない。

## 見た目と使いやすさの仕上げ（2026-11-17、ユーザーの追加依頼「最大限美しく、毎回簡単に」）

- 基準: PR-B `feature/tirasi-v2-flyer-studio` HEAD `520cbaf`（main `a270aee`は不変、PR #36/#37は未マージ）。作業branchは `claude/nifty-mendel-h33xy3`（PR-Bの上に積み重ね）。新たな小PRは作らず、PR-Bへ取り込む前提。
- 実画面（1280px / 390px）を撮影して批評し、以下を実装した。
  - **紙面の日付**: 新20構図のイベント用で、解析できる日付を大きな数字（例「5/9」）＋年・曜日（SAT (土)）＋開始・料金に組版。帯/罫線/チケット/細枠ごとに横一列・2段・縦積みを自動選択し、収まらなければ数字から縮小。区切り記号は入力どおり（5/9, 12.24）。自由記述の日付（「5月上旬」等）は従来の1行表示に戻す。旧版A4・Swiss/Informationの日付記念碑は変更なし。
  - **休憩行**: 全幅の塗り帯から、細罫に挟まれた中央の小さなピルへ。出演者名と競合しない。
  - **PNG保存を1クリック**: 「生成→保存」の2段階を廃止し「PNGを保存」で作成とダウンロードを行う。共有は必要時に作成し、OSが操作の有効期限で拒否した場合だけ再押下を案内。軽量版・サイズ説明・メモリ目安は「出力サイズと印刷のこつ」に格納。
  - **プレビューを常に見える位置に**: PCではA4全体が画面内に収まる大きさで入力欄の横に固定（「大きく表示」で切替）。スマホは下部に「入力する / 仕上がりを見る」切替バー。
  - **デザインタブの順序**: 1.デザインを選ぶ（絞り込み＋ギャラリー）→ 2.色 → 3.出力サイズ → 書体・装飾（折りたたみ）。
  - **主ボタンの不具合修正**: Studio共通ボタンCSSの詳細度が高すぎ、`.primary`（次回分を作る等）の強調色が全て無効になっていた。`:where()`で基底スタイルの詳細度を下げて修正。編集中は「＋新規作成」系を控えめにし、「次回分を作る」を唯一の強い行動にした。上部の見出しも圧縮。
  - Playwright/証跡scriptに任意の `CHROMIUM_PATH` を追加（同梱ブラウザ版とpackage版が異なる環境向け。未設定時の挙動は従来通り）。
- テスト（ローカル、Chromium 1243系 / Linux）:
  - `npm run test`: 単体58件 pass（日付組版と自由記述日付へのfallbackの2件を追加）。
  - `npm run build`: pass。
  - `npx playwright test`: E2E 24件 pass（80 PNGマトリクス、旧版4配色、印刷PNG一致、A4 PDF 1ページ、次回作成→保存→再読込→PNG等）。PNG操作は1クリック方式に合わせて更新。マトリクスの必須文字は日付を「2026」「5/9」「(土)」の要素で確認するよう変更。
  - 証跡script: イベント用80枚・自由制作80枚（A4/正方形/Story/縦長）で描画診断エラー0。
- 旧版A4の紙面デザインは「従来のまま選べる」契約のため変更していない。
- 未検証: 実iPhone/SafariでのOS共有・ダウンロード挙動（1クリック保存は非同期生成後にダウンロードを開始する）、物理印刷。
- 次の手: このbranchをPR-B（#37）へ取り込むかをユーザーに確認。main / 本番は変更しない。

## イラスト・書体・組版の品質向上（2026-11-17、追加依頼「SVG系デザインをフォント・レイアウト含めて」）

- 基準: 本branch `claude/nifty-mendel-h33xy3` の前回HEAD `cf320af`。
- **イラストの描き直し**（`src/studio/artworkRefined.ts`、全てオリジナルの幾何学・第三者素材なし）。縦横比を歪めない専用座標系で描くため、円や楽器がどのサイズでもつぶれない。
  - アコースティック: 左右対称のボディ、木目、バインディング、ロゼッタ、ブリッジとピン、フレット・ポジションマーク、ヘッドとペグ、6弦。
  - ネオン: 光の筒（多重ストロークで拡大縮小に強い発光）で描いたマイク・グリル・スタンド、スポットライトと床の反射。
  - 和紙: 毛先ごとにかすれる一筆の円相と、文字に依存しない幾何学の落款。
  - ライブハウス: 再生済み/未再生を分けた波形、再生位置、正方形枠ではフィルム穴。
  - シティポップ: 縞の夕日、窓の灯る街並み、海面の反射、ヤシのシルエット。
  - ボタニカル: S字の茎・側枝・陰影付きの葉・実。セリフ: 葉脈付き花弁と雄しべのアネモネ。
  - 他の構図（リソグラフ・森・昭和など）は従来の描画を継続。
- **書体**: 構図ごとに見出し書体を割り当て（Dela Gothic One / しっぽり明朝 B1 / Zen角ゴシック New / ロックンロール / 解星デコール / Zen丸ゴシック）。実在する太さのみ指定し、偽ボールドを避ける。出演者名も見出しの系統に合わせた読みやすい書体へ。「見出しの書体」の手動選択は従来通り優先。
  - 見出し書体のCSSは約110kB/書体あるため、Canvas描画時に遅延読込。初期CSSは517kB（追加前514kB）を維持。本番ビルドの`vite preview`で各書体の読込と描画を確認。ライセンスは`public/licenses/`に追加。
- **組版**: 日付帯の詳細欄が必要幅に満たない場合は2段組みに切り替え、「開始 / 14:30」のような不自然な改行を防止。
- テスト: 単体58件 / E2E 24件（80 PNGマトリクス含む）/ build がpass。証跡script: イベント用・自由制作用各80枚（4サイズ）で描画診断エラー0。
- 未検証: 実iPhone/Safariでの遅延書体読込と保存、物理印刷。

## 最終ブラッシュアップ（2026-11-17、追加依頼「もう一度だけさらに」）

- 基準: 本branchの前回HEAD `41f2066`。
- **イラスト追加の描き直し**（`artworkRefined.ts`）: 水彩（透明な重ね塗り・にじみの縁・飛沫のコスモス）、パーティー（ガーランド・艶のある風船・カールしたリボン・紙吹雪）、インディーギグ（破いた紙・網点のサンバースト・レコード・マスキングテープのコラージュ）、フェス（背景幕と屋根のある野外ステージ・光の筋・観客・ガーランド）。これで20構図中11構図が新しい描画、3構図（Swiss / Information / Art Deco）は文字主体。
- **欧文見出しの統一**: 「Open Mic」見出しを構図の書体系統に合わせた（明朝系は欧文セリフ、ゴシック系は細身のグロテスク、丸ゴ/ポップ系はその書体）。手動で明朝を選んだ場合は従来通り。
- **出演者名**: Dela/Zen角ゴの構図では仮名がまばらに見えたため、出演者名はNoto Sans JPに戻した。明朝・丸ゴ・ポップ系は見出しに合わせた書体を継続。
- **案内欄の余白**: 会場・Open Mic等の欄に余裕があれば最大4px大きく組み、下の空白を減らす。拡大によって1〜2文字だけの行ができる場合は拡大しない。
- 目視レビュー用に `scripts/render-artwork-sheet.mjs`（イラスト一覧）を追加。
- テスト: 単体58件 / E2E 24件 / build がpass。証跡script: イベント用・自由制作用 各80枚で描画診断エラー0。初期CSSは517kBのまま。
- 未検証: 実iPhone/Safari、物理印刷。main / 本番は変更なし。PR-B #37への取り込みはユーザー判断待ち。

## マージ後のバグ検証と品質改善（2026-11-17）

- 基準: main `e6bf4c1`（PR-A #36 / PR-B #37 マージ済み）。作業ブランチ `claude/nifty-mendel-h33xy3` をmainから作り直し。
- **検証方法**: 境界データの総当たり（`scripts/stress-fixtures.mjs`: イベント用16種×20構図×4サイズ=1,280描画、自由制作の別fixture 6種×80=480描画）、全ルート×5画面幅の横はみ出し/コンソールエラー/失敗リクエスト（`scripts/route-sweep.mjs`）、主要操作の通し（`scripts/ui-smoke.mjs`）。
- **見つけて直した不具合**
  - ウォッシ: 縦書きにできない長さのタイトルが全サイズで描画失敗 → 広い見出し枠＋小さな円相に切替。
  - 長い料金（例「前売 2,500円 / 当日 3,000円（1ドリンク別）」）が正方形の7構図で収まらない → 日付帯ではなく会場欄先頭の「料金」へ移動（約11文字相当を超える場合）。
  - 出演者12組が正方形4構図で時刻が収まらない → 行が低いときは行内余白を縮小。
  - 会場・注意書きが長い場合、案内欄を全幅に切替（会場名の長い12件が解消）。収まらない場合の案内文を「本文タブ → 載せる情報」の具体的な対処へ変更。
  - 自由制作: 3行の日時が横長帯で1行に連結され21件失敗 → 1行で読めないときは複数行のまま組み、帯の高さを必要分に拡大（縦長サイズは大きめ）。フォレストの長いタイトル、ギャラリーの本文/詳細の配分も改善。
  - `index.html` にファビコン指定がなく `/favicon.ico` が404 → インラインSVGを追加。
  - 見出し書体の読み込み失敗（オフライン等）で紙面描画全体が失敗する弱点 → フォールバック書体で描画を継続。
  - 「印刷」処理中も主ボタンが「作成中…」と表示される → PNG作成中のみ表示。
- **残る限界（診断で案内する）**: 注意書き3行＋主催者が長い組み合わせの正方形（14/80構図）、500文字級の本文の正方形/縦長、ギャラリー×正方形×250文字＋詳細、マガジン正方形×長い料金。
- **未解決/未確認**: 日本語ファイル名のダウンロードが、この環境のヘッドレスChromium（Playwright）では `download` と報告される。素のページでも再現するため環境の挙動の可能性が高いが、実ブラウザでは未確認。実iPhone/Safari、物理印刷も未確認。
- テスト: 単体60件、Chromium E2E 26件（境界fixtureの新規2件を含む）、build、`npm audit` 脆弱性0がpass。

## 2026-11-19　全構図の紙面改訂

- 基準はmain `7afc86d`。作業ブランチは `design/concert-poster-series`。20構図・12配色と旧版A4・4配色を対象に、`src/studio` のレイアウト・組版・図版・画像加工と旧版の印刷用スタイルを変更した。保存スキーマ、公開イベントの内容、画像参照、書体・表示・配置設定は継続して使える。
- 16点の専用WebPは計約2.4 MB。必要な図版を端末で読み込み、推奨色以外では用紙とインクに合わせて着色する。ユーザー写真への差し替えと装飾オフでは組み込み図版の読み込みを省く。失敗後の再読み込み、別配色、写真優先をブラウザで確認した。
- イベントは出演者と日時、自由制作は文章・作品に合わせて構成する。本文ブロックの見出しに独立した書体・サイズを割り当て、長い案内は必要に応じて広い列に移す。正方形のマガジンで長い料金、ギャラリーで本文250字＋詳細80字が収まることを回帰テストに含めた。
- 1組・12組・長い出演者名・日付自由入力・長い料金や注意書きなど、16種類のイベント原稿×20構図×4サイズを描画し、1,280通りで診断エラー0件を確認。
- 出力検証はイベントと自由制作の20構図×4サイズ、写真入り・出演時刻なし、全構図×12配色のA4プレビュー、旧版A4、6加工。ビルド済みアプリを390px幅でも操作し、シティポップのA4 PNG、配色を変えたStory PNG、A4 1ページのブラウザPDFを確認した。[実際のPNG](evidence/template-contact-sheet.png)・[自由制作](evidence/designs-free.png)・[変更前後](evidence/poster-comparison.webp)
- 単体61件・Chromium E2E 27件、TypeScriptとViteのビルド。`npm audit --audit-level=high` の検出は0件。実機Safariと用紙への出力は未検証。公開はレビュー後のマージ判断を待つ。

## 2026-11-25 iOS native app (branch `feature/ios-native-app`, stacked on `feature/pwa-ios-install`, uncommitted)

- `ios-app/`: Capacitor wrapper bundling `dist` into an offline iOS app (`jp.tirasi.hp`, display name 生音). No Vercel/network at run time. See `ios-app/README.md`.
- Cause of "PNG保存" and "印刷 / PDF" doing nothing inside the app: WKWebView ignores `<a download>` on blobs and `window.print()`.
- Fix: `src/export/native.ts` (cache file + iOS share sheet via `@capacitor/filesystem` + `@capacitor/share`, lazy-imported), `src/export/pdf.ts` (one-page A4 PDF from the rendered PNG, shared via the sheet so "Print"/"Save to Files" work). `downloadBlob` and JSON exports use the same path. Browser behaviour is unchanged.
- Native layout: `html.native-app` class (safe-area padding, frosted status-bar strip), no service worker in the app, editing nav scrolls sideways on phones.
- Verified: unit 68 passed, build OK, Playwright e2e 27 passed, iPhone 17 simulator (PNG share sheet, PDF share sheet with Print / Save to Files, Studio navigation). Not yet verified on the physical iPhone SE by the user; airplane-mode behaviour not measured.
- Known: wording still says "このブラウザ" in places; development signing lasts about a year (profile to 2027-08-26, certificate to 2027-01-08); an earlier note here saying 7 days was wrong.

### 2026-11-25 (later) iOS app hardening
- "PNGを保存" in the app now saves to Photos (`@capacitor-community/media`); "ファイルに保存 / 共有" opens the share sheet; labels name the destination. Saving shows progress, a green "✓ ... N枚目" confirmation, the button becomes "✓ 保存済み", and a second save of the same design asks first. Browser labels are unchanged.
- Touch-device hover left the primary export button dark-on-dark: hover styles are now limited to `@media (hover: hover)`.
- JSON exports (`downloadJson`) return `shared | downloaded | cancelled | failed`; notices no longer claim success after a cancelled or failed save.
- App-only: light interface style, iPhone portrait lock, branded launch image, inputs >= 16px (no focus zoom), safe-area strip under the status bar, share/save actions locked against double taps.
- Tests: unit 73 (adds native bridge with faked plugins, PDF structure), e2e 29 incl. `native-app.spec.ts`. PDF rendered independently with macOS `sips` (A4, 1 page, full bleed).
- Final check (branch `feature/ios-native-app`, base `f08fb69`, changes after it are uncommitted): touch-only hover for all buttons, export cache cleaned by age instead of wiping the folder, no automatic share sheet after a Photos timeout, JSON-only save under the busy lock. Next action: review/commit, then open the PR stacked on PR #40 (not merged, not deployed).

## 2026-11-25 Store edition "TIRASI ライブチラシ作成" (branch `feature/ios-store-edition`, base `22fdb57`, uncommitted)
- Build mode `store` (own App, sample event, no `public/`), `ios-store/` iOS project (`jp.tirasi.livechirashi`).
- Plans: free / 600 / 1,200 JPY non-consumables with an upgrade product; StoreKit 2 plugin; plan screen with restore.
- Store-only UI: start screen with rendered design samples and recent work, compact editor toolbar,
  edit / finished-and-save switch on phones, plan comparison, three-step guide, night-blue theme.
- Personal edition unchanged in behaviour (its 29 e2e tests still pass).
- Tests: unit 78, Playwright 34 (5 store), StoreKitTest 6 (iOS 26.2 simulator). Layout checked at 320/375/390 px
  and on the iPhone 17 Pro simulator; installed on the device. Purchases not yet tried on a device.
- Remaining before submission: see `ios-store/README.md`. Next action: user review, then commit.
- Follow-up: what the current plan includes is listed first (start screen, design picker, colours, sizes,
  effects) with paid choices grouped smaller below; layout fixes (nested gallery scroll, badge and name
  wrapping, menu icon, remaining shared greens, dead "イベント自体を編集" button hidden in the store app).
  Unit 78, Playwright 35.
- Store app: a new live flyer now gets its own event by default (starting from the latest entries). A settings
  sheet chooses separate / share with the latest live / ask every time; shared flyers say so and can be
  separated (`src/studio/liveCreate.ts`, `src/store/SettingsSheet.tsx`). Drafts are also saved the moment the
  app is hidden (both editions). Unit 85, Playwright 36.

## 2026-11-25 App Store preparation (branch `feature/appstore-submission` from `main` e69ad09)
- Added the missing camera usage text (both apps; choosing "take photo" would have crashed) and Japanese
  localization; store build requires arm64.
- In-app privacy policy and licence notices; release script (licences, pages, limits, `store:check`);
  listing texts and purchases (`docs/appstore/metadata.json`); screenshot script and images.
- Tests: unit 89, Playwright 37 (one personal test failed once in a full run, then passed 6/6 alone and in a
  full rerun: treated as flaky). Release archive succeeds. Nothing uploaded or published.
- Next: items in `docs/appstore/README.md` that wait for the owner.
- Operator name and contact filled in; privacy and support pages published on GitHub Pages (`gh-pages`
  branch); artwork generators recorded (Claude and Codex) with the OpenAI terms checked. `store:check` passes.

## 2026-11-25 Final layout pass before submission (branch `fix/store-layout-final` from `main` 4dba13d)
- First upload of build 1.0 (1) failed: Xcode found no account with App Store Connect access for team
  7Z6LC3DH22 ("Failed to Use Accounts"). Nothing was uploaded; the owner is signing in. That archive predates
  this pass and must be rebuilt.
- `scripts/layout-audit.mjs` renders every design x size with typical and edge-case content and reports glyph
  collisions, rules through type, low contrast, stranded characters and blocking diagnostics. Before: 232
  findings in 2,160 renders; after, on the final code: 0 in Chromium and 0 in WebKit.
- Fixed: date numeral and year/weekday misaligned (centred text is now placed by glyph bounds); floating start
  time in the Swiss / Information date panels; unreadable date on a Forest free flyer; names, titles, prices and
  addresses broken mid-phrase; tiny body text on Swiss / Information free flyers; weak vertical title on Washi;
  narrow photo sliver on Swiss / Information; profiles overflowing wide lineups.
- Added: per-size fine adjustment of title, date, lineup and venue blocks under the preview (`NudgePanel`;
  optional offsets in `Placement`, older backups unchanged). Moves stay inside the printable area.
- Screens at 320 / 375 / 440 px: truncated design names, wrapped "保存済み" and narrow export buttons fixed. The
  store app hides the profile switch unless restored data has profiles (it has no profile editor).
- A diff review then found that a title ending in 開始 / 開演 / 当日 could not wrap; fixed, with a test. The
  Chromium sweep was rerun (0 findings); the WebKit sweep predates this one-line rule.
- Tests on the final code: unit 94, Playwright 38, both builds. Screenshots in `docs/appstore/screenshots`
  retaken (replace the ones already given to App Store Connect). Not checked on a physical device.
- Next action: merge the PR, rebuild the release archive from `main`, then upload.

## 2026-11-26 Build 1.0 (1) uploaded
- PR #43 merged into `main` (3c27330); `main` CI passed. The release archive's web files matched a build of
  that commit. After the owner signed in to Xcode, `xcodebuild -exportArchive` reported "Upload succeeded".
- Apple was still processing the package; the processed result has not been checked. Warning received: from
  April 2027, uploads need the iOS 27 SDK (Xcode 27); this build used the iOS 26.2 SDK.
- Next (owner): wait for processing, select the build, attach the three purchases, replace the screenshots
  already registered (01, 03-06), test purchases with TestFlight, then submit for review.

## 2026-11-26 Owner feedback from the iPhone (branch `docs/record-upload`, PR #44)
- Both apps built from `main` (3c27330) and installed on the owner's iPhone SE; both launched.
- Added a live preview pinned under the header on the design, layout and text tabs of the store app
  (`src/store/LivePeek.tsx`), so colour and size changes are visible while adjusting.
- Fixed a slowdown from the layout pass: phrase tidying now runs only when a size fits. In WebKit the sampled
  render times are back to the earlier level or better.
- The nudge e2e test failed once in CI by reading during a redraw; it now reads both attributes at once and
  waits longer.
- Checked the uploaded 1.0 (1) archive: no venue names or personal bundle id in its text files.
- Prices shown in USD and the Apple Account prompt appear in the development install (no sandbox account
  signed in); not verified with TestFlight.
- Uploaded build 1.0 (1) does not contain the preview or speed fix; a new build number is needed to ship them.

