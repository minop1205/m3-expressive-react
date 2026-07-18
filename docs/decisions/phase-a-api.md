# Phase A — 公開 API 統一の決定記録(2026-07-19)

横断監査(docs/audits/2026-07-15-cross-cutting.md)の A1〜A7・G2・G5・ref 方針について、
Issue #12〜#21 での検討を経て以下のとおり決定した。破壊的変更は v1 前に一括で実施する。

| # | Issue | 決定 | 要点 |
|---|---|---|---|
| A2 | #13 | **`onChange(event, value)`(MUI 忠実・event ファースト)に全コンポーネント統一** | 本ライブラリの対象読者(MUI 利用者)の習慣を最優先。値ファースト案は移行差分が小さいが不採用。Radio は値引数を追加、Chip は `onSelectionChange`→`onChange` に改名、Button/IconButton トグルは event を第1引数に。選択グループ(NavigationBar/Rail, Tabs, SegmentedButton)も `(event, value)` に |
| A1 | #12 | **5段階スケール組(Button/IconButton/ButtonGroup/SplitButton/Slider)を `xs/sm/md/lg/xl` に統一** | 実質 Slider の `s/m/l`→`sm/md/lg` 改名のみ。Fab(`small/regular/medium/large`)・Badge(`small/large`)は MD3 固有スケール名として維持。Loading/ProgressIndicator の数値 px も維持(意味が異なる) |
| A5 | #16 | **コンテンツを挟むアイコン対は `startIcon`/`endIcon`** | Menu(MenuItem)/SearchBar/TextField の `leadingIcon`/`trailingIcon` を改名。単一 `icon`・状態別(`selectedIcon` 等)・List の汎用スロット(`leading`/`trailing` — アイコン以外も許容)は維持 |
| A3 | #14 | **ポップアップ系は `open`/`defaultOpen`/`onOpenChange` に統一、モーダル系は `onClose` を維持** | SearchBar の `expanded`/`onExpandedChange` を `open` 系に改名。Dialog/BottomSheet/SideSheet/NavigationDrawer は MUI 慣習の `onClose` 単方向のまま |
| A4 | #15 | **controlled/uncontrolled の二重性を全面補完 + RadioGroup 新設** | `defaultChecked`(Radio)/`defaultSelected`(Chip)/`defaultOpen`(SplitButton)/`defaultValue`(選択グループ)を追加(非破壊)。RadioGroup(value/defaultValue/onChange/name 配布/role="radiogroup")を新設 |
| A6 | #17 | **Fab は `color: 'primary'\|'secondary'\|'tertiary'` + `tonal?: boolean`(既定 true)に再設計** | トークン文字列(`'primary-container'` 等)の公開 API 漏出を解消。tonal=true が container 系配色。`expanded: boolean\|'container'` の整理も実装時に検討。LoadingIndicator の生 CSS `color` はグラフィック系の明示的例外として維持(JSDoc に明記) |
| A7 | #18 | **`SegmentedButton`(単数形)に改名** | 旧 `SegmentedButtons` は deprecated エイリアスとして1リリース維持 |
| G2 | #19 | **react-aria を依存から削除** | 手書き実装(APG 準拠 Menu、useModal、native input パターン)が既に高品質。CLAUDE.md の「useButton で press 処理」記述を実態(native 要素+プリミティブ)に修正(#11) |
| G5 | #20 | **CSS 変数フォールバックは全廃止 + stylelint で禁止** | `tokens.css`/`typescale.css` を必須依存として README に明記。値の二重管理とドリフトを排除。見た目の変化なし(トークン読込環境では従来からトークン値が勝っていた) |
| ref | #21 | **MUI 方式: `ref` は常にルート要素、TextField/SearchBar に `inputRef` を追加** | `{...rest}` の着地先もルートに統一。Chip の ref も root へ |

## 実施方針

- 破壊的変更(A1/A2/A3/A5/A6/A7/ref)は **1つのマイルストーンで一括実施**し、変更一覧を
  マイグレーションガイド(docs/migration-v1.md)にまとめる
- 非破壊(A4 の default* 追加、RadioGroup、G2、G5)は先行して個別 PR 可
- 各決定の実装 Issue は phase-a ラベルの実装 Issue 群を参照
