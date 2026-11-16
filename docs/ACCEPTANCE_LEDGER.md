# v2 受入台帳

正本: V2_DESIGN_AUDIT_AND_CONTRACTS.md。2026-11-16、PR-A時点。

| 契約 | 実装・証拠 | 状態 |
|---|---|---|
| R01 / DA16,23 | published source / build meta / publication tests | A実装・検証 |
| R02 | 紹介5名のtoggle E2E・無言のslice廃止 | A実装・検証 |
| R03 / DA03,20 | public/draft/preview reload/back E2E | A実装・検証 |
| R04,11 / DA04 | strict nested validation / v1,v2 roundtrip / import preview | A実装・検証 |
| R05 | safeUrl / fallback / unsafe scheme拒否 | A実装・検証 |
| R06 | クライアント認証を称する表現・固定パスコード廃止 | A実装 |
| R07 / DA06,07,08 | legacy A4実測・PNG2480×3508・PDF1page / overflow block | A実装・Chromium検証 |
| R08 | 生成と保存/共有の分離・連打制御・失敗回復 | A実装・OS共有UIは未検証 |
| R09 / DA05,18 | IDB transaction・元JSON保護・中断4段階・CAS競合・保存エラー | A実装・検証、完全バックアップB |
| R10 / DA10 | date/weekday/offset・元文字列保持・時刻警告 | A実装・検証 |
| R12 / DA14,15 | lockfile / unit / Playwright / CI / ローカルフォント | A実装・検証 |
| DA01 | CreativeDocument 3モード | Bで実装 |
| DA02,19 | binding/override/visibility/undo/サイズ別編集保持 | Bで実装 |
| DA09,22 | 20構図×4出力・配色対比・比較証跡 | Bで実装・実測 |
| DA11 | 6非破壊加工・seed・強度・比較 | Bで実装 |
| DA12 | 原画像IDB・復号・容量・完全バックアップ | Bで実装 |
| DA13 | ギャラリー/簡易編集/詳細調整 | Bで実装 |
| DA17 | 2PR・進捗・実装と検証の区別 | 継続 |
| DA21 | 単一state transition・StrictMode・二タブ・storage失敗 | A実装・検証 |

物理印刷・実iPhone/Safariの共有・端末メモリ制約は別の手動確認。未実測をpassとしない。
