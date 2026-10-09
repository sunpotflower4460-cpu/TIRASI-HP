# TIRASI-HP v2.1 追加設計監査・実装具体化メモ

監査日: 2026-10-09
監査対象: v2総合設計、長期自走手順、進捗、React/TypeScriptソース、CI。
設計確認の基準main: 37871bb8ad4868ac5b697c66567e252177260c6c（実装前に最新SHAを再取得）。
状態: 追加監査完了・設計上の決定。アプリ本体の改修・ブラウザ操作・実機印刷は未実施。

**重要:** 同時期に別の第2次監査が反映されたため、必須要件の正本は [V2_DESIGN_AUDIT_AND_CONTRACTS.md](./V2_DESIGN_AUDIT_AND_CONTRACTS.md) の DA-01〜DA-17 とする。本書はその下位の具体化メモ。仕様の優先順は、現行実装の観測事実 / DA-01〜DA-17の明示契約 → マスター設計 → 本書の追加実装案 → Playbookの手順例。本書が先行監査と矛盾すれば先行監査を優先し、進捗に記録する。

## 1. 今回の監査で明らかになった不足と処理

| ID | 重要度 | 不足/懸念 | 設計決定 |
| --- | --- | --- | --- |
| AUD-01 | P0 | EventDataでは汎用チラシが作りにくい | DA-01のevent-flyer/free-flyer/image-treatment判別共用体を実装時に具体化する |
| AUD-02 | P0 | 文字・画像・図形の任意配置が未定義 | ページとブロックのシーンモデルを定義し、デザインと保存を共通化 |
| AUD-03 | P0 | 「全4サイズ」「supportedSizes」「非対応表示」に不整合 | PR-B完了条件は20テンプレート×4サイズの80組。部分対応は未完成 |
| AUD-04 | P0 | 同一DOMがPNG/印刷で完全一致する前提が強すぎる | 同一sceneを元にレンダラー別検証。ピクセル完全一致を保証しない |
| AUD-05 | P0 | 保存移行時の原本保護と復元の原子性が弱い | バックアップ→全件検証→新規領域へ書込→検証→切替。旧データは保持 |
| AUD-06 | P1 | IndexedDBが「永久保存」であるように読める | ブラウザ保存は保証しない。ZIP完全バックアップと復元を必須化 |
| AUD-07 | P1 | 画素フィルターとAI再生成を混同しうる | 画像加工はローカル非破壊。内容を再生成するAI機能は別設計 |
| AUD-08 | P1 | テンプレート数だけで達成判定できてしまう | 多サイズ実測、文字欠け、デザイン相違、視覚比較と証跡を必須化 |
| AUD-09 | P1 | OGPのソース統一だけでは実際のSNS画像を保証できない | 静的生成物とラスタ形式の互換性を確認する |

### コード上で確認できる事実

- src/types/event.tsはタイトル・日時・会場・出演者などイベント専用の固定フィールドであり、任意の文字/図形ブロックや自由制作プロジェクト型はない。
- src/hooks/useEventData.tsはlocalStorageに直接書込み、読み込んだイベント一覧の不正項目をフィルターして残りを返す。無言の部分復元は元情報を見失うリスク。
- React.StrictModeはsrc/main.tsxで有効。保存初期化・アセット生成の副作用と二重実行について検証が必要。
- 現行CIはnpm installとbuild中心であり、PNG、印刷、画面差分の保証にはならない。
- index.html の og:image はSVGを参照する。SNSプラットフォームとの互換性は未実測。必ず一般的なラスタ画像版を検証する。

注: 上記は静的コードで確認できる事実と、そこから導いた設計上のリスク。新たな端末でクラッシュを再現したと主張するものではない。

## 2. 制作機能は3モードに分ける

1. event-flyer: 従来のEventContentを出典にしたイベント告知。DA-02に従いEventのIDを参照し、linked/snapshotを区別する。デザイン変更でイベント本文は変えない。
2. free-flyer: イベント以外のチラシやポスターを簡単に自由制作する。空ページまたは既定レイアウトから作り、テキスト・画像・図形を配置する。
3. image-treatment: 持ち込んだ既存ポスター/写真を非破壊で加工。元画像バイナリと加工recipeを保存する。画素の内容を意味的に描き直すAI生成機能ではない。

**free-flyerの追加具体化案:** 文字・画像・図形の追加、文字修正、移動、拡大縮小、前後関係、表示/ロック、複製、削除、現在セッション内のUndo/Redo、保存、PNG書出し。動画、共同編集、AIによる再描画、Figma相当の高度なベクター作図などは対象外とする。

これにより20テンプレートを「色替えだけ」ではない個別のレイアウトとして提供しつつ、簡単な操作で自分のチラシへ発展させられる。

## 3. データモデルの決定

文書のschemaVersionはCreativeDocument、イベント一覧、完全バックアップmanifestなどの**対象ごとに定義する**（DA-04）。初期移行の目標形式はv2とするが、単一versionをすべてのファイルの共通形式と誤認しない。概念モデル：

- CreativeDocument = EventFlyerDocument | FreeFlyerDocument | ImageTreatmentDocument。kind = event-flyer / free-flyer / image-treatment。DA-01の命名・型を正本とする。
- 共通: id, name, kind, schemaVersion, content, design, assetRefs, updatedAt（DA-01）。projectId等の別名を独立形式として実装しない。
- event-flyer: eventId + contentBinding(linked/snapshot) + pages[] + design。公開用Eventと編集下書きは別の状態。
- free-flyer: pages[]、design。イベント固有の必須項目を押し付けない。
- image-treatment: sourceAssetId、editRecipe、outputSettings。原本画像を上書きしない。DA-11のエフェクト順序に従う。
- Page: pageId、sizeId、background、safeArea、scene[]。
- SceneBlock: id、kind（text/image/shape/event-section/decoration）、bounds、rotation、zIndex、visible、locked、style、contentまたはassetRef、任意のsourceBinding。
- Design: templateId、paletteId、fontSetId、decorations、sizeVariants、overlayOverrides。イベント本文は含めない。

**設計契約:** Pageの座標は一貫した単位系または基準キャンバスに対する正規化値とする。SNS正方形/Storyでは、単なる全体scaleではなく各サイズのレイアウトvariantを使う。デザイン再選択時はユーザーが変更したブロックを保持するかリセットするか確認し、イベント情報・アップロード画像は勝手に破棄しない。

**内容バインド:** タイトルなどをキャンバス側で変えたら「イベント情報を変更」か「このデザインだけ上書き」を区別。どちらが表示されるか可視化し、イベントHPとチラシの不一致を隠さない。

**旧データ移行（DA-04を補足）:** 旧EventData/一覧JSONからeventプロジェクトにlossless migration。元のthemeId、日付の文字表現、出演者、Open Mic、flyerOptions、SNS、未知の拡張情報を可能な限り保持。自動認識できない日付は原文を保持し、修正案を表示。複製時のIDは重複しない新規ID、画像は参照整合性を保つ。

## 4. 書き出しエンジンの決定

**同じDOM = 完全に同じ画像、とは言えない。** html2canvasは実際のスクリーンショットではなく、DOM/CSS情報から再描画するため、CSS/外部画像の対応範囲に制限がある（公式: https://html2canvas.github.io/html2canvas/documentation/ ）。

- 唯一の真の入力は Page + SceneBlock + Design。preview/PNG/printの3経路は同じ場面モデルを使う。
- 画面とPNGは、可能な限り同じ部品と描画ロジックを使う。非対応CSSを使う場合は互換描画/無効化/警告を選び、黙って消さない。
- 日付スタンプ、印刷粒子、傷、版ズレはエフェクト順序とseedを保存。同じ入力なら同じ出力になるようにする。
- 端末のCanvas最大辺・最大面積・空きメモリには上限がある（MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas ）。出力開始前に必要ピクセル数と概算メモリを算定。
- A4は210×297mmの印刷とPNG書出し。PNG高解像度の目標は約2480×3508px（300dpi相当のピクセル数）。画像のDPIメタデータや印刷実寸まで自動保証するものではない。
- SNS縦1080×1350px、正方形1080×1080px、Story1080×1920pxはPNG出力。SNS各サイズのPDF対応は必須にしない。
- **20テンプレート×4サイズの計80出力組を完成目標**とする。supportedSizesは実装中の状態確認や将来追加サイズ用。1サイズだけ出せるテンプレートを「完成済みの20種類」に算入しない。
- 溢れ・フォント欠落・画像未読込は出力前に検出し、修正か明示的な複数ページ選択に誘導。黙って切り捨てたり不可読なサイズに縮めたりしない。
- PNG生成のtimeoutだけでは裏側の処理が停止しない可能性がある。generationIdで古い結果を破棄し、クローンDOM/Blob URLを安全に開放。連打・ページ離脱・古いPromise解決をテスト。
- Web Shareはユーザー操作が必要（MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API ）。「PNG生成」と「共有する」の操作を分け、共有のキャンセルは通常エラー扱いしない。
- 既存画像の加工は元画像を改変せずrecipeを保持。強い加工で元画像中の文字が読みにくくなった場合は比較/注意を表示。意味的な画像修正やAI再描画を実装済みとは表示しない。

## 5. 保存/復元/公開

- 旧localStorageキーは旧データ移行処理から読み取り、移行開始時点で消さない。新schema領域へ全件移行し、検証成功後に切替。失敗時は旧データと未コミット編集を保護。
- 「一部不正なイベントを無言で除外して残りを復元」は禁止。全件検証→差分プレビュー→確認→atomic commit。部分復旧は別操作で明示。
- 同じブラウザの複数タブからの同時編集は世代番号・更新時刻で競合検出。後勝ちで自動上書きしない。
- JSONバックアップと**画像を含む完全バックアップ**を明確に区別。完全パッケージ（例: ZIP）はmanifest version、project情報、scene、recipes、asset binary、各assetのサイズ/mime/sha256/参照情報を含む。
- リストアも一度stagingに読込み、すべての参照とファイルを検査してから切替。容量不足などで中途半端に上書きしない。
- IndexedDBもブラウザの管理方針により削除されうる。navigator.storage.persist()は補助的な永続化要求であり、常に承認されるわけではない（MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria ）。「ブラウザ内保存だから安心」と表示せず、定期的なバックアップを案内。
- public "/" と通常の "/flyer" は公開イベントソースのみを使用。draftプレビューは編集画面から明示的に開く状態/routeに分ける。未公開状態を公開URLとして配布したように表示しない。
- build時のHTML meta/JSON-LD/OGPは公開イベントから決定的に生成。既存SVGのog:imageについてSNS互換性を確認し、1200×630のPNG/JPEG版を生成/配信する。og:image:type/width/height/altを検証（仕様: https://ogp.me/ ）。公開先で実際に到達できるURLでテスト。SNSキャッシュ更新の即時反映まで保証しない。

## 6. 品質評価とテストマトリクス

毎コミット: buildと変更した部分のunit test。
各内部フェーズ: 旧イベント保存/復元、公開/下書き、主要なPNG/A4、モバイル画面。
PR-A提出前: legacy移行、異常JSON、複数タブ、公開コンテンツ/OGP整合、PNG/印刷、旧4配色、iPhone相当での操作。
PR-B提出前:
1. 20テンプレート×4サイズ=80組の正規fixtureを全件レンダリングし、サイズ/保存ファイル/溢れ診断を確認。
2. 最小/標準/長文/出演者多数/画像なし/画像ありのfixtureで境界条件を追加検証。フル直積はコストに応じてCIの定期実行または手元で確認。
3. 20テンプレートの比較ギャラリーを作り、色違いしかないデザインは未完成扱いにする。
4. free: 文字/画像/図形、レイヤー、Undo/Redo、再起動、画像参照と完全バックアップ復元のテスト。
5. image-treatment: 6種の効果、Before/After、seed固定の再現、巨大画像/壊れた画像、元画像保護をテスト。
6. 画面プレビューとPNG/印刷で主要情報が欠落しないことを視覚検証。未実施はPASSにしない。

**品質の重要指標:** 日時・場所など必須の情報が欠けていない、紙面内に文字が収まる、読めるサイズである、PNGの縦横が正しい、保存済み表示が実際のストレージ成功と一致、失敗後の再試行で元データが残る。

## 7. 原則2本のPRは維持

PR-A（安定化）: 旧データ移行、安全な保存、公開/下書き分離、固定イベント情報、OGP、URL処理、旧A4・PNG・PDF改善、テストとCIを統合する。
PR-B（拡張）: Project/Sceneモデル、20テンプレート×4サイズ、12以上の配色、最低限のfree-flyer編集、既存画像のレトロ加工6種、画像アセット、完全バックアップ、UIと包括テストをまとめる。

内部フェーズは細かいコミットと進捗記録で管理し、別PRを量産しない。PR-A未マージ時はPR-Aを親としたstacked branchでPR-Bの作業を継続可能。各工程で実装数・テスト済み数・未実装数を分けて記録。自動マージ、本番デプロイ、課金/外部AIは明示承認なしに行わない。

## 8. Haiku 5.5への設計決定メモ

- D01: kindの正本はevent-flyer/free-flyer/image-treatment（DA-01）。前2種は共通Scene、画像加工はsourceAsset+recipe。
- D02: v1移行は全件検証と可逆バックアップ。無言の削除・一部復元・初期化禁止。
- D03: 20種×4サイズが完了条件。未対応組合せは未完成として表示。
- D04: sceneを共通ソースにして3経路で描画差分を検証。pixel-perfectを無根拠に約束しない。
- D05: 旧HPのイベント情報は公開データから表示。下書きは外部公開されたように見せない。
- D06: 本体のfree編集は簡易block editor。汎用デザインツール全機能への拡大禁止。
- D07: 画像加工は非破壊・ローカルのみ。AIによる再描画は別案件。
- D08: 画像バイナリとレシピを含む完全バックアップを必須。
- D09: 設計文書の存在は実装開始許可ではない。実装開始後もmainへの自動マージ/公開は禁止。

設計中の推奨値や実装技術は変更できるが、変更理由・根拠・受入基準への影響をdocs/IMPLEMENTATION_PROGRESS.mdへ記録する。単に開発を楽にするために本書の達成条件を静かに緩めない。

## 9. 第2次監査との役割分担

本書はDA-01〜DA-17を置き換える文書ではない。独自の追加価値は、(1) Page/SceneBlockの概念フィールドをまとめたこと、(2) 全件移行時のバックアップ/参照整合性を作業順序へ落としたこと、(3) HTML/PNG/printの生成ID・seed・Blob解放等の具体的実装候補、(4) 80組の回帰テストと自由制作操作の証跡を示した点。より厳しい情報保護・ZIPインポート防御・オフライン境界・印刷色・WCAG等は先行するDA-01〜DA-17を参照する。

「自由配置」の具体的な操作範囲は、DA-01/DA-13の最小ブロック編集を優先する。完全なDTPツールへの拡大は行わない。TIRASI-HPが本当に使いやすいチラシスタジオになるための設計提案として本書を扱い、実装が困難なら進捗へ根拠を書き、無断の機能削除ではなく段階的な代替を提示する。
