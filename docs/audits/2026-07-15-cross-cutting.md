# 横断監査レポート(2026-07-15)

全36コンポーネントを4観点(API一貫性 / テスト網羅 / インタラクション状態 / Storybook・CSS規約)で
並列監査した結果の統合レポート。個別コンポーネントの仕様深掘り監査(`docs/audits/<component>.md`)の
優先順位付けに使う。

## 全体所見

**強み(維持すべき点)**

- 全36コンポーネントにテストファイルがあり、**axe テストは全件実在**する
- 全コンポーネントが `forwardRef` を実装、`index.ts` からの export 漏れなし
- CSS Modules に野良の色リテラルはなし(hex はすべて `var(--md-sys-color-*, #fallback)` のフォールバック)
- 48dp タッチターゲットは全小型コントロールでカバーされている(手段は不統一、後述)
- hover 0.08 / dragged 0.16 の state layer は全体で正しい

**ライブラリ全体に効く問題(1箇所直せば全体に波及するもの)**

| # | 問題 | 影響範囲 | 修正コスト |
|---|---|---|---|
| G1 | `Ripple.module.css:37` の pressed 不透明度フォールバックが **0.12**(規約は 0.10)。Ripple 利用の全コンポーネントが継承。Checkbox/Radio/Switch/Chip は明示的に 0.12 | Button, IconButton, Fab, FabMenu, Card, List, Tabs, SegmentedButton, SplitButton + 手書き4件 | 小(5ファイル程度) |
| G2 | **react-aria が依存宣言のみで import ゼロ**。CLAUDE.md の「useButton (react-aria) で press 処理」規約はどこにも実装されていない | 全コンポーネント + CLAUDE.md | 要方針決定(採用 or 規約削除+依存除去) |
| G3 | **Chromatic のダークテーマカバレッジがゼロ**。`chromatic.modes` 未設定、ダーク story もなし(toolbar トグルのみ) | VRT 全体 | 小(`preview.tsx` に modes 追加) |
| G4 | **オーバーレイ系 story が閉じた状態でスナップショットされる**: Tooltip(両方)、Dialog(全3話)、Menu、BottomSheet、SideSheet(modal/left)、NavigationDrawer(modal)、SplitButton(ドロップダウン)。VRT が本体を一度も撮っていない。FabMenu の `defaultOpen` パターンが正解例 | 8コンポーネント | 小〜中 |
| G5 | `var(--md-sys-*)` の**フォールバック付与が不統一**(Chip/TextField 等は完備、約30ファイルで欠落。色トークンで最大30箇所/ファイル、typescale も19ファイル) | ほぼ全 CSS | 方針決定+機械的修正(stylelint 化推奨) |
| G6 | アニメーション系 story(LoadingIndicator, ProgressIndicator, morph 系)が**アニメーションを固定せず VRT がフレーク**する恐れ | 4-5コンポーネント | 小 |

**API 統一に関する意思決定が必要な項目(破壊的変更を伴うため早期に確定すべき)**

| # | 項目 | 現状 |
|---|---|---|
| A1 | **size 語彙が4系統**: `xs/sm/md/lg/xl`(Button系)、`xs/s/m/l/xl`(Slider)、`small/regular/medium/large`(Fab)・`small/large`(Badge)、数値px(Loading/ProgressIndicator) | Slider を Button 系に揃えるのが最小差分。数値 size は別 prop 名も検討 |
| A2 | **onChange シグネチャ不統一**: Checkbox `(checked, e)` / Switch `(selected, e)` / Radio `(e)` のみ / Button toggle `(selected)` / 選択グループ `(value)` / Chip は独自 `onSelectionChange` | 「値が第1引数、event が第2引数」等の統一規則を決める |
| A3 | **開閉ハンドラ名の不統一**: Menu/FabMenu/SplitButton/Tooltip は `onOpenChange`、SearchBar だけ `onExpandedChange`、モーダル系は `onClose` 単方向 | |
| A4 | **controlled/uncontrolled 二重性の欠落**: Radio(defaultChecked なし)、Chip(defaultSelected なし)、SplitButton(defaultOpen なし)、SearchBar(defaultExpanded なし)。選択グループ(NavigationBar/Rail, Tabs, SegmentedButtons)は controlled-only 必須 — NavigationDrawer だけ optional で不整合 | |
| A5 | **アイコン slot 命名が3系統以上**: `startIcon/endIcon`(Button, SplitButton)、`leadingIcon/trailingIcon`(Menu, SearchBar, TextField)、`leading/trailing`(List)、単一 `icon`(多数)、`selectedIcon/unselectedIcon`(Switch)、`insetIcon`(Slider) | MUI 基準なら `startIcon/endIcon` だが、slot 的な性質のものは別扱いも可 |
| A6 | **Fab の color 値がトークン文字列**(`'primary-container'` 等)、**LoadingIndicator の color が生 CSS 文字列** — 他の union 型 color prop と契約が異なる | |
| A7 | `SegmentedButtons`(複数形 export)とディレクトリ名 `SegmentedButton` の不一致 | |

**その他の単発修正(非破壊・すぐ直せる)**

- **DatePickerField / Tooltip に HTML 属性パススルーがない**(`id`/`data-*`/`aria-*`/`style` を渡せない)
- **TextField に JSDoc が皆無**(唯一のドキュメント欠落コンポーネント)
- **未 export の公開型**: `NavigationItemLayout`, `SliderSize/SliderOrientation/SliderValue`, `TimePickerMode`, Menu の align union
- **Chip の elevated shadow がハードコード**(`rgba(0,0,0,0.3)` — elevation トークン未使用)
- SearchBar の disabled が**全体 `opacity: 0.38`**(トークンベースの per-layer 減光でない、二重減光の恐れ)
- SearchBar / TextField / Chip の **ref が内側要素**(input / button)を指し、root は un-reffed(MUI ユーザーの期待とズレる可能性 — 方針確認)

## コンポーネント別 優先度マップ(深掘り監査の順序)

判定基準: 機能的 a11y リスク(キーボード操作・フォーカス管理が未検証/未実装の疑い)>
状態レイヤー/プリミティブ逸脱 > API 問題 > VRT 盲点。

### Tier 1 — 最優先(機能的 a11y リスクが濃厚)

| コンポーネント | 主な問題 |
|---|---|
| **Menu** | 矢印キー/Home/End/typeahead 未テスト(実装有無も未確認)、open 時のフォーカス移動・close 時の復帰なし、FocusRing なし、story が閉じたまま、disabled item 未検証 |
| **Dialog** | フォーカストラップ・初期フォーカス・復帰が未テスト(実装有無未確認)、story 全部閉じたまま |
| **BottomSheet / SideSheet / NavigationDrawer(modal)** | 同上(トラップ/復帰/スクリム dismiss 未検証)、modal story 閉じたまま |
| **Checkbox / Radio / Switch** | **FocusRing も Ripple も不使用**(outline:none のみ → キーボードフォーカス表示の欠落疑い)、pressed 0.12、Space キー未テスト、フォーム送信未テスト。Radio は矢印キーのグループ移動未テスト+ defaultChecked なし |
| **Slider** | キーボード操作テストがゼロ(矢印/Home/End)、FocusRing なし・outline:none もなし、ドラッグ未テスト、size 語彙逸脱 |

### Tier 2 — 高優先

| コンポーネント | 主な問題 |
|---|---|
| **SearchBar** | 全体 opacity disabled、state layer なし、`onExpandedChange` 命名、defaultExpanded なし、ref が inner input、focused/active story なし |
| **SegmentedButton** | roving tabindex/矢印キー未テスト、controlled-only、複数形命名、per-segment disabled story なし |
| **DatePicker / TimePicker** | グリッド/ダイヤルのキーボード操作未テスト、min/max 未テスト、DatePickerField のパススルー欠落、story 1話のみ(TimePicker は input モード未収録) |
| **Chip** | 独自 `onSelectionChange`、defaultSelected なし、elevation shadow ハードコード |
| **Tabs** | ArrowLeft/Home/End 未テスト、disabled タブの story・テストなし |

### Tier 3 — 通常優先(状態は概ね良好、仕様照合を淡々と)

Button, IconButton, Fab(color API は A6), SplitButton, Card, List,
NavigationBar / NavigationRail(state layer 値は最も正確), FabMenu, TextField(JSDoc), Carousel,
SwipeToDismiss(スワイプ動作自体が未テストな点のみ注意), Snackbar, Tooltip(パススルー欠落),
AppBar, Toolbar, ButtonGroup, Badge, Divider, LoadingIndicator, ProgressIndicator

## 推奨実行順

1. **Phase 0 — ライブラリ全体の単発修正**(G1, G3, G4, G6 + 単発修正群): 破壊的変更なし、即効性最大
2. **Phase A — API 統一方針の確定**(A1〜A7 + G2 の react-aria 採否): 破壊的変更はまとめて1回で
3. **Phase B — コンポーネント深掘り監査**: Tier 1 から順に、仕様照合(m3.material.io + Compose)+
   キーボード/フォーカス実装検証 + テスト補強。パイロット(Button)で手順確立後、Tier 1 へ

## CLAUDE.md と実装の乖離(AI ドキュメント整備の前提として要修正)

- 「`forwardRef` with `useButton` (react-aria)」 — **どのコンポーネントも react-aria を使っていない**(G2 の決定に従って修正)
- 「pressed 0.10」 — Ripple プリミティブの実体は 0.12(G1 修正後に整合)
- 「48dp touch target via `::before`」 — Checkbox/Radio/Switch は 48px の `.input` 要素方式で、手段が二本立て(規約をどちらかに寄せるか、両方式を明記)
