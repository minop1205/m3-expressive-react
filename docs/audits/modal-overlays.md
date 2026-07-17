# モーダル系オーバーレイ監査レポート(2026-07-19)

Tier 1 監査。**Dialog / BottomSheet / SideSheet / NavigationDrawer(modal)** を、共通テーマ
(フォーカス管理・スクリム・モーション)を持つ一族としてまとめて監査した。

ソース: ① m3.material.io(dialogs / bottom-sheets / side-sheets / navigation-drawer 全トークン
セット)② Compose androidx-main(AlertDialog + DialogTokens / ModalBottomSheet + SheetBottomTokens +
SheetDefaults / NavigationDrawer + NavigationDrawerTokens / ScrimTokens / AndroidDialog)
③ WAI-ARIA APG modal dialog パターン ④ 実装 + テスト。

## 前提となる確認事項

- **SideSheet は Compose material3 に存在しない**(コンポーザブルもトークンもなし。コード検索 0 件)。
  SideSheet の仕様準拠判定は m3.material.io(+ MDC-Android)のみを根拠とする
- **NavigationDrawer は M3 Expressive で非推奨**になった(仕様ページに明記。公式は expanded
  Navigation rail への移行を推奨)。baseline 実装としての存続は妥当だが、将来 NavigationRail の
  expanded 側を優先整備する方針を推奨
- Compose の AlertDialog は**影を描画しない**(TonalElevation=0 のオーバーライド、shadowElevation なし)。
  Web では視覚的区別のため影が必要 → 実装の level3 影を維持(material-web と同判断)

## 結論サマリ

**一致(修正不要)**: スクリム 32%(4つ全て — サイトの drawer scrim 0.4 は deprecated 表記であり、
現行 ScrimTokens は 0.32)/ Dialog(surface-container-high・28dp・280〜560dp・padding 24・
icon 16→title 16→body 24→actions、buttons gap 8、icon 24 secondary、headline-small、body-medium)/
BottomSheet(surface-container-low・上角28dp・max 640・handle 32×4 pad 22・elevation L1)/
SideSheet(modal surface-container-low・standard surface・max 400・header/actions 72・padding 24/12/16/24・
headline title-large)/ NavigationDrawer(width 360・0,16,16,0・indicator 336×56 pill 28・active
secondary-container・アイテム余白 12+16/24 = Compose 実装値と一致)/ 全コンポーネントの
モーション + reduced-motion 対応(既に良好)/ Escape で閉じる。

**要修正(CONFIRMED)**:

| # | 対象 | 発見 | 深刻度 |
|---|---|---|---|
| **X1** | **4つ共通** | **APG 必須のモーダル挙動が全欠落**: ①フォーカストラップ(Tab/Shift+Tab の巡回)②開時にフォーカスをオーバーレイ内へ移動 ③閉時に呼び出し元へ復帰 ④背景の inert/aria-hidden 化 ⑤body スクロールロック。Compose は ModalDrawer で「開時フォーカス移動+Escape」を自前実装しており、Dialog はプラットフォームの別ウィンドウで同等性を確保 — Web では自前実装が必須。加えて全てインライン描画(ポータル未使用)で、祖先の transform/overflow に脆弱 | **高**(ライブラリ最大級) |
| **X2** | Dialog / BottomSheet / SideSheet / NavigationDrawer | **accessible name の配線不備**: Dialog は title 省略時に無名: BottomSheet は名前機構自体がない(利用者の aria-label 頼み)/ SideSheet は可視 headline が aria-labelledby 未配線 / NavigationDrawer は modal 無名+standard の aside にランドマークラベルなし。Compose は全モーダルに paneTitle を必ず付与 | 中 |
| **BS1** | BottomSheet | **ドラッグハンドルが装飾のみ**: ドラッグでの dismiss なし、キーボード/AT 代替なし。Compose はハンドルに contentDescription + dismiss/expand/collapse のカスタムアクション + クリックで状態循環を実装 | 中〜高 |
| **SS1** | SideSheet | headline の色が on-surface — 仕様は **on-surface-variant**(#49454F) | 低 |
| **ND1** | NavigationDrawer | アクティブ項目のラベル weight が常に 500 — サイトは **700**(Compose は 500 のまま → サイト優先で 700) | 低 |
| **ND2** | NavigationDrawer | inactive 項目の hover/focus/pressed 時のコンテンツ色が on-surface-variant のまま — 両ソースとも **on-surface** へ変化させる | 低 |
| **ND3** | NavigationDrawer | z-index 20 — 他のオーバーレイ(24)より低く、Dialog/Sheet の下に潜る。24 に統一 | 低 |

**軽微・記録のみ(Issue 化しない)**:

- BottomSheet: ウィンドウ幅 >640dp のとき左右マージン 56dp(サイト)— Compose も未実装。max-width 640 で実害小
- Dialog: フルスクリーン変種にスクリムがないのは**仕様どおり**(サイトの anatomy にも scrim なし。
  昨日の実装分析での指摘は取り下げ)
- ドラッグハンドルの不透明度: サイト 0.4(warning 表記)vs Compose 最新は不透明 → **Compose に従い現状維持**
- NavigationDrawer の modal に影がないのは Compose と同挙動(Defaults が token L1 を L0 に
  オーバーライド)→ 現状維持
- サイトの drawer「左右 padding 28dp」はコンテナ12+アイテム16の合算として実装・Compose と整合(右側は
  Compose 実装値 24 を採用)

## ソース間の食い違い(裁定)

| 項目 | site | Compose | 裁定 |
|---|---|---|---|
| Dialog の影 | elevation セル未解決(MD3 は Level3) | 影なし(tonal 0 オーバーライド) | Web は影が必要 → **level3 影を維持** |
| drawer スクリム | 0.4(deprecated 表記) | ScrimTokens 0.32 | **0.32**(現行トークン) |
| drawer アクティブラベル weight | **700** | 500(LabelLarge のまま) | site 優先 → **700**(ND1) |
| ハンドル不透明度 | 0.4(warning) | 不透明(旧 0.4 は削除済み) | Compose 優先 → **不透明維持** |
| Dialog モーション | — | なし(プラットフォーム任せ) | 実装済みの scale+fade を維持(Web では必要) |

## 実装計画の提案(Issue 構成)

1. **X1 → 1 Issue**: 共有ユーティリティ(例 `src/internal/useModal` あるいは `<ModalLayer>`)として
   フォーカストラップ+初期フォーカス+復帰+inert+スクロールロック(+ポータル化の判断)を実装し、
   4コンポーネントに適用。テストは4コンポーネント×(トラップ/初期/復帰/ロック)を必須とする
2. **X2 → 1 Issue**: タイトルの aria-labelledby 自動配線と、タイトル不在時のデフォルト aria-label
   (Compose の paneTitle 相当)を4コンポーネントに追加
3. **BS1 → 1 Issue**: ドラッグ dismiss(ポインタ)+ハンドルのボタン化(クリック/Enter で dismiss、
   AT 向けアクション)
4. **SS1 / ND1+ND2+ND3 → 各 1 Issue**: 小さな CSS 修正

## スキルへのフィードバック

- 共通テーマを持つコンポーネント群は**一括監査+統合レポート**が有効(横断欠落が1つの発見として
  まとまり、共有実装の Issue に直結する)。ただし収集は逐次でよい(並列エージェントの数は絞る)
- サイトのトークン表の **warning アイコンは deprecated の印**として扱い、Compose の現行値と食い
  違ったら Compose を疑うのではなく site 側の鮮度を疑う(drawer スクリム 0.4、ハンドル 0.4 の両例)
- Compose に存在しないコンポーネント(SideSheet)は、その事実自体を監査の冒頭に記録して仕様の
  拠り所を切り替える
