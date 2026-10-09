# IMPLEMENTATION PROGRESS — TIRASI-HP v2

最終更新: 2026-10-09  
区分: **第2次設計監査と契約補強を反映済み** / 実装は未着手  
設計: docs/TIRASI_V2_ARCHITECTURE_AND_FLYER_STUDIO.md  
実装手順: docs/HAIKU55_EXECUTION_PLAYBOOK.md  
第2次監査: docs/V2_DESIGN_AUDIT_AND_CONTRACTS.md  
Claude Code入口: CLAUDE.md

## 基準main SHA / 現在ブランチ / 現在コミット

- 調査対象のmain: aa95ef74df2d709d2de6555d7aad715ae9a41457
- 設計書の書込先: main（ドキュメントのみ）
- 設計コミット: 7966f162584f71b4ba796291edf94609271d00c1（総合設計）、fcdeaf884e38c66968c62c005427b8faee577c2a（長期実行手順）、71451dbc8ce42f0486dd4ffe8c9454b16ed78d86（進捗初期化）、c76f95804a18ee9b3769ba9dea68dc27fd4bdda2（READMEリンク）、a4aa6db9cf416aad55412c83b5eb6ef4ebc58ff2（CLAUDE.md入口）
- 実装ブランチ: 未作成
- PR-A/PR-B: 未作成

※このファイル自身とREADMEのコミットを含めた最新main SHAは実装開始時に必ず再取得する。ここに古いSHAが書かれていてもそれを強制的にresetしない。

## 現在工程

PREP-DONE + AUDIT-2: GitHubコード・データ・スタイル・PR履歴・CIを調査して設計化、外部仕様を照合してDA-01〜DA-17の監査補足を導入。  
NEXT（明示的な実装依頼後）: 第2次監査DA-01〜DA-17を受入条件へ取り込み、A0（ベースラインのローカル実測と回帰テストの準備）→ A1から実装。  
PR-A: 未着手。PR-B: 未着手。

## 今回確定した事実

- React 19 / TypeScript / Vite / html2canvas。
- 公開初期イベントはvol.6・2026-05-09・14:30。
- HomePage/VisitorInfo/index.html/og-image.svgにvol.5以前または開始時刻/季節の固定情報が残る。
- showPerformerProfilesトグルはOnePageFlyerの現行表示に接続されていない。
- localStorage下書きが公開経路でも同じコンポーネントへ渡される。
- URL入力、JSON読込、localStorage失敗、PNG shareには検証/回復余地がある。
- 旧PR #21（未マージ）は安全なURL処理と公開導線整理の参照素材になる。
- 最新mainのCI build成功はGitHub Actionsで確認。これは画面/PNG/印刷の動作成功証明ではない。
- 現在open PR/open Issueは見つからない（本調査時点）。

## 完成した実装

- なし。既存アプリコード、CI、公開データは変更していない。
- 総合設計・第2次監査契約・長期自走手順・進捗管理の4文書と、READMEリンク、Claude Code向けルート `CLAUDE.md` を追加・相互連携した。

## テスト結果

- GitHub Actions直近mainビルド: success（過去CIの確認であり、今回新規に走らせたテストではない）。
- ローカルnpm ci/npm run build: 未実施。
- 単体テスト/E2E: 未実施（現状scriptなし）。
- iPhone/Safari/Chrome/印刷/PNG実機: 未実施。
- 上記未実施をpassと記載しない。

## 目視確認

- 旧コードとCSSの静的レビュー済み。
- 画面の実機操作/ブラウザスクリーンショット: 未実施。
- 今後、PR-AにレガシーA4のbefore/after、PR-Bに20テンプレートのギャラリー比較を添付する。

## 既知の不具合・未検証事項

- R01〜R12: 詳細は総合設計書参照。特に公開/下書き分離、無効JSON、A4出演者トグル、古い公開情報を優先。
- モバイル共有API、印刷オーバーフロー、実表示のズレは再現確認待ち。
- Node/依存パッケージの脆弱性監査は未実施。
- 本番配信先（VercelかCloudflare等）の正式判断は未確認。自動デプロイ禁止。

## 次の着手点（優先順）

1. 最新main/PR状態を取得、git status確認。設計文書の追加のみで機能差分がないことを確認。DA-01〜DA-17を受入表へ移す。
2. 実装用長期ブランチ feature/tirasi-v2-reliability を作成。
3. npm install/npm run build、ブラウザで/, /editor, /flyer、PNG、printの現状ベースラインを採取する。
4. schema v2, migrationと不正JSONテストを先行追加。
5. publishedEvent vs draft workspaceを分離し、表示差異をテストで固定。
6. 細分化PRは作らず、同じPR-Aブランチ内でR01〜R12の安定化を続ける。
7. PR-Aが未マージでも、自動マージ待ちで停滞させず、PR-Aを基点にしたstacked branchで20種拡張PR-Bを進めてよい。PR-BのbaseをPR-Aへ設定し、Aのマージ後にmainへ差分を付け替えて整合性を確認する。

## 作業再開の最初のコマンド

- git status --short --branch
- git fetch --prune
- git log -5 --oneline
- npm install
- npm run build

新規作業ブランチは最新mainから作成すること。既存の未コミット変更を消さないこと。

## ブロッカー

- ドキュメント設計時点では実装ブロッカーなし。
- 本番公開・外部クラウド画像ストレージ・真の管理者認証などは別途ユーザー承認が必要。
- 実機/ブラウザテスト環境が用意できない場合は検証未完として明記。

## 仕様変更の決定ログ

2026-10-09:
- ユーザーの希望で細かなPR連発を避ける。
- 先に設計をリポジトリmainへ直接追加し、ユーザーから実装開始の依頼を受けた時点で実装する。設計文書の追加自体は実装開始の許可ではない。
- 自走は作業ログと再開可能な進捗ファイルを用い、原則2本の大型PRにまとめる。
- 80年代風は単一の色合いでなく、4つの異なるデザイン方式を含める。
- 既存のイベント情報・公開HP・旧チラシとバックアップを壊さない。

## PR URL / レビュー待ち状況

- PR-A: 未作成
- PR-B: 未作成
- mainマージ（実装）: なし
- 本番デプロイ: 実施していない

## 設計資料の反映確認（2026-10-09）

- v2総合設計、長期自走手順、進捗ファイル、READMEリンク、ルートCLAUDE.mdの追加をGitHub上で確認。
- 最後の入口追加コミット: a4aa6db9cf416aad55412c83b5eb6ef4ebc58ff2。
- 元のアプリ実装コードはこの設計準備作業では編集していない。新規のビルド/実機テストも未実施。
- ユーザーの「PRを小分けにしない」「途中で止まりにくくする」を継続要件とする。PR-Aがレビュー待ちでもPR-Bをstackして準備できる。
- 画像やポスターの「1980年代風」には、CSS/Canvasで実現可能なレトロ印刷・紙質・網点・退色・版ずれ等の視覚スタイルと、画像の内容自体をAIで描き直す生成処理との違いがある。今回は前者をローカル機能として必須とし、後者はユーザー承認なしに外部生成AI接続しない。
- デザイン20件は名前や色違いだけでなく、実際の構図差をテストする。

## 追加設計・最終整合確認（2026-10-09）

- 既存のポスター/写真を取り込んで内容を保持し、80年代風に**非破壊加工するモード**をマスター設計 §3.4a および手順書B6に追加した。最低6プリセット、Before/After、強度調整、PNG、保存・復元を受入条件とする。追加試験T15〜T17。
- デザインテンプレート20種類・パレット12種類以上・非破壊画像加工6種類以上は**計画値**であり、現時点で実装・検証済みとは扱わない。
- `CLAUDE.md` に実装開始前の必読ファイルと安全な長期自走ループを配置した。
- GitHub比較（元main aa95ef74... → 2026-10-09時点のmain 495fbc260dbfb8af66e0337158bcc60eb1c498a7）で差分は `CLAUDE.md`, `README.md`, `docs/HAIKU55_EXECUTION_PLAYBOOK.md`, `docs/IMPLEMENTATION_PROGRESS.md`, `docs/TIRASI_V2_ARCHITECTURE_AND_FLYER_STUDIO.md` の5文書ファイルのみ。アプリ実装コードは未変更、open PRなし。
- 実装着手にはユーザーからの明示指示が必要。着手後はPR-A/Bの二本にまとめ、マージ/デプロイは手動承認待ち。

## 第2次設計監査（2026-10-09）

- 必読: `docs/V2_DESIGN_AUDIT_AND_CONTRACTS.md`。設計不足DA-01〜DA-17を確認・補正。主要補正は Event と CreativeDocument の分離（event-flyer/free-flyer/image-treatment）、公開/下書きプレビューの専用経路、screen/PNG/printの描画能力契約、実際のpx・印刷寸法の区別、バックアップと移行の整合性、20×4画像出力の最終ゲート。
- `docs/TIRASI_V2_ARCHITECTURE_AND_FLYER_STUDIO.md`、`docs/HAIKU55_EXECUTION_PLAYBOOK.md`、`CLAUDE.md`、`README.md` に監査文書への入口と実装に必要な補正を反映した。
- 参考にした外部仕様: html2canvasのCSS描画制限、CORSのcanvas制約、Web Shareの一時activation、ブラウザストレージの退避可能性、印刷背景、Viteビルド時メタ処理、WCAG。外部仕様の確認であり実機アプリテストではない。
- 追加の設計境界: アプリのデータをローカルで処理することは、現行Google Fontsや外部画像への通信が不要であるという意味ではない。オフライン保証は実装・検証してから示す。
- ブラウザ実機/PNG比較/物理印刷/新規ビルド: **未実施**。現状の新機能: **未実装**。今回もmainへの変更はdocs/README/CLAUDE.mdに限定。
- PR-AとPR-Bは原則2つの大型PR。PR-Aレビュー待ちなら積み重ねbranchによるPR-B開発を許可、細かいPRを作成しない。今回のドキュメント追加は実装開始承認を意味しない。
