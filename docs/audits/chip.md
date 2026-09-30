# Chip 監査レポート(2026-09-30)

Phase B。assist / filter / input / suggestion の4バリアント(flat / elevated、selected、アイコン・remove 付き)を
3ソースで突き合わせた:

1. **m3.material.io/components/chips/specs** + **/accessibility** + **/guidelines** — Playwright MCP でトークン
   テーブルの全4セット(Chip - Assist / Filter / Input / Suggestion。下段の baseline viewer はなし)を全展開し、
   visibility 表示でシェイプ・elevation の値も取得。寸法表・a11y 本文(キー操作表・ラベル表・remove の扱い)・
   guidelines(trailing icon の 48dp ターゲット、ラベルの切り詰め)を抽出
2. **Compose androidx-main** — `Chip.kt`(AssistChip / ElevatedAssistChip / FilterChip / ElevatedFilterChip /
   InputChip / SuggestionChip / ElevatedSuggestionChip、4つの `*ChipDefaults`、`ChipArrangement`、
   `SelectableChip` / `AnimatingChipContent`)、`AssistChipTokens` / `FilterChipTokens` / `InputChipTokens` /
   `SuggestionChipTokens` / `ChipsTokens`(Expressive)、`ElevationTokens`・`StateTokens`・`Surface.kt`・
   `internal/Elevation.kt`・`MotionScheme`。`ComposeMaterial3Flags` の分岐は Chip.kt に**なし**
3. **実装** — `src/components/Chip/Chip.tsx`, `Chip.module.css`, テスト(20件、全通過)・ストーリー(10話)。
   Storybook(dev)で `getComputedStyle` / `getBoundingClientRect` を実測、hover / Tab フォーカス / RTL を実操作。
   axe は一時テストで disabled(3バリアント)・filter selected + removable・input + `selected`・elevated
   suggestion を追加確認(違反なし)

**共有実装について**: 4バリアントは1つの `Chip` コンポーネント + 1つの CSS Module で、バリアント差はクラス
(`.assist` / `.input` / `.selected` / `.elevated` …)の上書きだけ。state layer は共有 `Ripple`、フォーカス表示は
共有 `FocusRing`。`Ripple` は `--md-ripple-color`(未指定時は `currentColor`)しか読まない — CH1 の原因。

## 結論サマリ

**一致している(修正不要)**:

- **寸法**: 高さ 32、角丸 8(`shape-corner-small`)、アイコン 18、左右パディング 16(assist / filter /
  suggestion のアイコンなし)、leading icon ありの開始側 8 + icon 18 + 間 8(ラベル開始 x=34 を実測)、
  outline 1px、selected の outline 幅 0、縦方向のタッチターゲット 48(`.action::after`)、remove ボタンの
  ターゲット 48×48
- **タイポグラフィ**: label-large(500 14/20 0.1)
- **色(静止状態)**: outline = **outline-variant**(全バリアント。site・Compose とも)、label = assist は
  **on-surface**・filter / input / suggestion は **on-surface-variant**、leading icon = primary(assist /
  suggestion / filter 非選択)、input 非選択の leading icon = on-surface-variant で hover / focus / pressed 時に
  primary(site・Compose トークンとも)、trailing icon = on-surface-variant、selected = container
  secondary-container・label / leading / trailing とも on-secondary-container(filter)、elevated container =
  surface-container-low(selected は secondary-container)
- **disabled**: outline on-surface 12%、selected / elevated の container on-surface 12%、label・アイコン
  on-surface 38%、elevated の影なし、Ripple / FocusRing を描かない、ネイティブ `disabled` で Tab 対象外
- **elevation**: elevated 1dp(level1)→ hover 3dp(level2)、focus / pressed は 1dp のまま、disabled 0、
  dragged 8dp(level4)+ 0.16 の state layer(`dragged` prop)。#9 の影トークン化は解決済み
- **フォーカスリング**: secondary 3px・offset 2px・角丸 8(site の focus indicator 行と一致、実測)
- **state layer の不透明度**: hover 0.08 / pressed 0.10(トークン参照)
- **挙動・a11y**: ネイティブ `<button>` で Enter / Space 起動、filter は `aria-pressed` で選択状態を公開
  (Space / Enter でトグル、一時テストで確認)、controlled / uncontrolled(`selected` / `defaultSelected`、Phase A
  A4)、`onChange(event, selected)`(A2)、ref はルート `<span>`(#21)、アイコンは `aria-hidden`(site ラベル表
  「Hide image」)、remove ボタンの名前「Remove {label}」(site ラベル表と一致)、remove は primary と別の
  フォーカス可能要素で ←/→ で移動(RTL で左右が反転することを実測)、remove のクリックが primary の `onClick` を
  発火しない、trailing icon は RTL で左端(実測 8px)、`forced-colors` 対応、axe 違反なし

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| CH1 | **state layer の色がバリアント・選択状態で変わらない** | `.chip` / `.selected` が設定する `--md-ripple-hover-color` / `--md-ripple-pressed-color` は `Ripple` が**読まない変数**(material-web の旧名)。state layer は継承された `currentColor` = 周囲の on-surface になる(実測: filter 非選択・選択、input、suggestion の hover がすべて rgb(29,27,32))。dragged のレイヤーも `--_label-text-color`(常に on-surface-variant)固定 | site トークン: assist = **on-surface**、filter / input / suggestion 非選択 = **on-surface-variant**、selected = **on-secondary-container**(hover / focus / dragged)。filter の pressed だけは site の行が入れ替わっている(非選択 pressed = on-secondary-container、選択 pressed = on-surface-variant — 押した後の状態の色)。→ `--md-ripple-color` を状態ごとに設定 | 中 |
| CH2 | **focus の state layer 0.10 と focus 時の outline 色がない** | キーボードフォーカスで state layer 0(実測)、outline は outline-variant のまま | site: focus state layer **0.10**(全バリアント)、focus outline = assist **on-surface** / filter・input 非選択・suggestion **on-surface-variant**。Compose トークン `FlatFocusOutlineColor` / `UnselectedFocusOutlineColor` も同値(Defaults は `TODO(b/113855296)` で未使用)、focus 0.10 は ripple が描く。Radio の Ruling R2(FocusRing に**加えて** 0.10)と同じ扱い | 低 |
| CH3 | **flat の selected filter chip に hover の elevation がない** | 影なし(実測) | site: `Filter chip (selected) hover container elevation` **1dp**(非選択 hover は 0)。Compose Defaults も hover 1dp(下記裁定) | 低 |
| CH4 | **input chip に選択状態がない** | `isSelectable = variant === 'filter'` のため、input に `selected` を渡しても**黙って無視**(`aria-pressed` なし、見た目も変わらない — 一時テストで確認) | site・Compose とも input chip は selected を持つ: container secondary-container・outline 0・label / trailing on-secondary-container・**leading icon は primary**(on-secondary-container ではない)、disabled selected は container on-surface 12%。Compose `InputChip(selected, onClick)` は `Role.Checkbox` + selectable。API(input の `onChange` をどうするか)は要決定 | 中 |
| CH5 | **input chip の avatar がない** | `icon` の 18dp スロットのみ。円形画像を渡すと 18dp の四角に入る | site: avatar **24dp・円形**、avatar 側の開始パディング **4**、avatar とラベルの間 8、disabled で avatar 不透明度 **0.38**。Compose `InputChip(avatar = …)`: `CornerFull` でクリップ、disabled alpha 0.38、`contentPadding` の開始 4dp、avatar は leadingIcon より優先。guidelines「leading の円形画像はアイコンより大きく」 | 低(API 追加) |
| CH6 | **Backspace / Delete で input chip を削除できない** | キー処理は ←/→ のみ(一時テストで Backspace・Delete とも `onRemove` 0 回)。削除後はフォーカスが `<body>` に落ちる(実測) | site a11y キー表「**Backspace or Delete**: フォーカス中の input chip を削除」。Compose はキー処理なし(矛盾ではない — Android の IME 側)。削除後のフォーカス移動先(隣の chip)も同じ修正で決める | 中(a11y) |
| CH7 | **trailing icon まわりの寸法・input chip のラベル余白・最小幅** | remove は 24px の円ボタンを端から 8px に置く → 18dp アイコンの見た目は端から **11**・ラベルとの間 **11**。input(leading なし)の開始側 16。remove 付きでも最小幅なし(短いラベルでは 48dp の remove ターゲットが primary 側に食い込む) | site: 「Left/right padding for icon 8」「Padding between elements 8」、Compose も trailing は端 8 + 間 8(`ChipArrangement` + `ContentPadding` 8)。input のアイコンなし側は Compose `InputChipDefaults.contentPadding` 4 + arrangement 8 = **12**(site に記載なし=矛盾なし)。site guidelines「remove の 48×48 ターゲットが primary を妨げないよう chip に **min-width 88dp**」 | 低(VRT 差分あり) |
| CH8 | **ラベルが切り詰められない** | `white-space: nowrap`・`overflow: visible`。幅 60px の親に入れても chip は 100px のままはみ出す(実測) | site guidelines「ラベルは折り返しレイアウトや**ウィンドウ幅を超える**と切り詰める(truncate)」→ `min-width: 0` + `overflow: hidden; text-overflow: ellipsis`(Compose は折り返す — 下記裁定) | 低 |
| CH9 | **filter の checkmark が瞬時に出入りする** | 条件付きレンダリングのみ(遷移なし) | Compose `SelectableChip` → `AnimatingChipContent`: leading の出入りを `expandHorizontally`(FastSpatial)+ `fadeIn`(SlowEffects)/ `shrinkHorizontally`(DefaultEffects)+ `fadeOut`(FastEffects)。site guidelines「タップで leading の checkmark が**付加される**」(動画)。`prefers-reduced-motion` では瞬時に | 低 |
| CH10 | **chip 間を矢印キーで移動できない(chip set がない)** | 各 chip が個別に Tab 順に入る。境界で矢印キーを「chip set へ伝播」させるコメントはあるが、受け手のコンポーネントがない | site a11y キー表「Tab: chip **または chip group** にフォーカス」「**Arrows**: chip 間でフォーカス移動」、ラベル表の Web ロールは chip set 内の `gridcell`。Compose は `FlowRow` 任せ(矛盾ではない)。material-web は `md-chip-set` でロービングフォーカスを実装 → `ChipSet`(仮)の新設は API 判断 | 低(a11y・API) |

Issue: CH1/CH2 → #182(同じ state layer / focus の CSS と `Ripple` の色指定を書き換えるため同梱)、CH3 → #183、
CH4 → #184、CH5 → #185、CH6 → #186、CH7/CH8 → #187(同じ `.action` / `.label` / `.trailingAction` の
レイアウトを書き換えるため同梱)、CH9 → #188、CH10 → #189

**軽微(判断・記録のみ)**:

- **選択可能 chip のロール**: site ラベル表は Web = `gridcell`(chip set 内)、Compose = `Role.Checkbox` + selected。
  実装は `<button aria-pressed>`(トグルボタン)。単独の chip ではトグルボタンは「選択 / 非選択」を正しく伝える
  ネイティブ手段で、axe も通る → **維持**。`gridcell` は CH10 の chip set を作るときに合わせて決める
- **remove だけの input chip**: site a11y「remove 以外のアクションがない chip は、chip と icon で**1つの**フォーカス
  要素」。実装は常に primary `<button>`(`onClick` なしでは何もしない)+ remove の2要素。CH6 で Backspace/Delete を
  primary 側で受けるなら、primary を「削除対象の chip」として残す形で要件の意図は満たせる。構造変更は CH6 の
  修正時に判断
- **`onRemove` にイベントが渡らない**: `onRemove?: () => void`。MUI `Chip` の `onDelete(event)` と違う。Phase A A2
  の「event ファースト」の精神からは `(event)` を渡すのが自然 — 非破壊(引数追加)なので CH6 の修正時に検討
- **input chip の `removable` が既定 false**: site guidelines は「input chip の trailing icon は**必須**で削除に使う」
  が、Compose `InputChip` の `trailingIcon` は任意。既定値の変更は破壊的なので記録のみ
- **filter chip の trailing icon はメニューも開ける**(site guidelines)。実装は × の remove 専用。ドロップダウン
  矢印 + `onClick` の組み合わせは将来の API 候補
- **`elevated` が input chip にも効く**: site・Compose とも elevated input chip は存在しない(トークンなし)。
  JSDoc で「assist / filter / suggestion のみ」と明記するか無視するか、実装時に判断
- **横方向のタッチターゲット**: `.action::after` は縦 48 だけ。1文字ラベルの chip は幅 41px 程度で、Compose の
  `minimumInteractiveComponentSize`(48×48)に届かない。実用上ほぼ起きない
- **elevation の遷移**: Compose は elevation を 120ms FastOutSlowIn(入り)/ 150ms(出)でアニメーション。実装は
  瞬時。`@media (prefers-reduced-motion)` の `.chip::before { transition: none }` は、元の transition がないので
  **死んだルール**(CH9 の修正時に整理)
- **Expressive の `shapes` オーバーロード**(Filter / Input のみ): 非選択 12dp → 押下 8dp → 選択 full の
  シェイプモーフ(FastSpatial、`TODO: Replace with correct animation tokens`)と tonal 配色(非選択 leading icon
  on-surface-variant)。site の現行トークンは 8dp のみ → **8dp を維持**。Expressive 版は Compose 側で TODO が残る
  ので、今回は対象外
- **`{...rest}` の着地先**: #21 は「rest もルートへ」だが、Chip は JSDoc に「rest は primary `<button>`」と明記した
  まま出荷済み(v1.0.0)。`aria-*` / `onFocus` を button に渡せる利点があり、A10(選択コントロールは input に
  維持)と同じ理屈の例外と読める。再判断が必要なら Phase A 側で
- **site a11y の「outline 色で対話性を示す」**: 3:1 のため outline-variant の代わりに outline を使う選択肢が示されて
  いるが、トークン表と Compose の既定は outline-variant → 既定は**維持**(利用者のテーマ選択)
- **テスト追加候補**: 状態ごとの state layer 色(CH1)、input の selected(CH4)、Backspace/Delete(CH6)、
  disabled・elevated の axe
- **ストーリーのカバレッジ**: selected の input、removable の filter、leading icon 付きの filter / input、dragged、
  elevated の filter / suggestion がなく VRT が撮っていない。CH4 / CH5 / CH7 の修正 PR で足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| flat filter の hover elevation | selected 1dp / **unselected 0** | `filterChipElevation` は selected 用トークンを両方に使い、**unselected も 1dp**(KDoc「selectable 状態を考慮しない」)。`FlatUnselectedHoverContainerElevation` = Level0 は未使用 | site とトークンが一致 → **selected のみ 1dp**(CH3) |
| state layer の色 | バリアント・選択状態ごとに明示(CH1) | トークンに state layer 色なし。`ripple()` の色は周囲の content color(バリアント非依存) | site 優先 → **site の色**(CH1)。Compose の実装はトークンの欠落によるもの |
| hover / focus 時の outline・アイコン色 | focus outline on-surface(assist)/ on-surface-variant(他)、input の leading は hover/focus/pressed で primary | トークンは同値、Defaults は `TODO(b/113855296)` で状態色を一切使わない | site + トークン → **状態色を使う**(CH2。input leading は実装済み) |
| filter の pressed state layer | 非選択 = on-secondary-container / 選択 = on-surface-variant(他の状態と逆) | 色トークンなし | 警告アイコンのない現行行で、押下後の状態を先取りする意図と読める → **site どおり**(CH1)。material-web の同名トークンも同じ並び |
| input の selected leading icon | primary | `SelectedLeadingIconColor` = Primary | 一致 → **primary**(CH4。filter の on-secondary-container と違う点に注意) |
| ラベルがはみ出すとき | 切り詰める(truncate) | `maxLines` なし → 折り返して高さが伸びる(最大幅 1000dp) | site 優先 → **1行 + 省略記号**(CH8) |
| input のアイコンなし側の余白 | 記載なし(avatar 4 / icon 8 / 要素間 8 のみ) | 4 + 8 = **12**(material-web は 16) | Compose > material-web → **12**(CH7) |
| remove 付き chip の最小幅 | guidelines で 88dp | 最小幅なし(trailing icon はクリック不可のスロット) | site 優先 → **88dp**(CH7) |
| disabled の outline 不透明度 | 0.12 | 各バリアントのトークン・Defaults は 0.12、Expressive `ChipsTokens.UnselectedDisabledOutlineOpacity` だけ **0.1**(未使用) | site + 出荷 Defaults → **0.12**(現実装のまま) |
| elevated assist の配色(引数付き) | — | `elevatedAssistChipColors(…)` が suggestion の既定を `copy` している(label on-surface-variant になる。TODO なし=上流バグと判断) | 引数なしの既定 = on-surface を採用(現実装のまま) |
| 選択可能 chip のロール | Web `gridcell`(chip set 内) | `Role.Checkbox` + selected | 単独 chip は `aria-pressed` を維持(軽微欄)、chip set で再判断(CH10) |

## 詳細対照表

### 寸法(site / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 高さ | 32 | 32(min) | 32 ✓ |
| 角丸 | 8 | CornerSmall 8 | 8 ✓ |
| アイコン | 18 | 18 | 18 ✓ |
| 左右パディング(アイコンなし・assist/filter/suggestion) | 16 | 8 + 8 = 16 | 16 ✓ |
| leading icon 側のパディング | 8 | 8 | 8 ✓ |
| icon ↔ label | 8 | 8 | 8 ✓ |
| trailing icon の端からの距離 | 8 | 8 | **11(24px 円の中央)✗ CH7** |
| label ↔ trailing icon | 8 | 8 | **11 ✗ CH7** |
| input のアイコンなし側 | — | 12 | **16 ✗ CH7** |
| avatar | 24・円形・開始 4 | 24・CornerFull・開始 4 | **なし ✗ CH5** |
| remove 付き chip の min-width | 88 | — | **なし ✗ CH7** |
| タッチターゲット | 48(remove も 48) | 48×48 | 縦 48 ✓ / remove 48×48 ✓ |
| outline | 1 | 1 | 1 ✓ |
| ラベル超過時 | truncate | 折り返し | **はみ出す ✗ CH8** |

### カラー(light、静止状態)

| 要素 | assist | filter 非選択 | filter 選択 | input 非選択 | input 選択 | suggestion |
|---|---|---|---|---|---|---|
| container | transparent ✓ | transparent ✓ | secondary-container ✓ | transparent ✓ | secondary-container **✗ CH4** | transparent ✓ |
| elevated container | surface-container-low ✓ | surface-container-low ✓ | secondary-container ✓ | (なし) | (なし) | surface-container-low ✓ |
| outline | outline-variant ✓ | outline-variant ✓ | 0 ✓ | outline-variant ✓ | 0 **✗ CH4** | outline-variant ✓ |
| label | on-surface ✓ | on-surface-variant ✓ | on-secondary-container ✓ | on-surface-variant ✓ | on-secondary-container **✗ CH4** | on-surface-variant ✓ |
| leading icon | primary ✓ | primary ✓ | on-secondary-container ✓ | on-surface-variant ✓ | **primary ✗ CH4** | primary ✓ |
| trailing icon | — | on-surface-variant ✓ | on-secondary-container ✓ | on-surface-variant ✓ | on-secondary-container **✗ CH4** | — |
| disabled | label・icon on-surface 38%、outline / container on-surface 12% ✓(全バリアント) |

### 状態(state layer / outline / elevation)

| 状態 | site | Compose | 実装 |
|---|---|---|---|
| hover 不透明度 | 0.08 | 0.08 | 0.08 ✓ |
| focus 不透明度 | 0.10 | 0.10(ripple) | **なし ✗ CH2** |
| pressed 不透明度 | 0.10 + ripple | 0.10 + ripple | 0.10 + ripple ✓ |
| dragged | 0.16 + 8dp | 0.16 + Level4 | 0.16 + level4 ✓(色は CH1) |
| state layer の色 | assist on-surface / 他 on-surface-variant / 選択 on-secondary-container(filter pressed は逆) | 周囲の content color | **常に on-surface ✗ CH1** |
| focus outline 色 | on-surface(assist)/ on-surface-variant | トークン同値・未使用 | **変化なし ✗ CH2** |
| focus indicator | secondary 3dp offset 2dp | (InsetRing 設定時のみ) | ✓ |
| elevated: 通常 / hover / focus / pressed / disabled | 1 / 3 / 1 / 1 / 0 dp | 同じ | ✓ |
| flat filter 選択の hover | 1dp | 1dp(非選択も 1dp — 裁定) | **0 ✗ CH3** |

### 挙動・a11y(site accessibility ページ)

| 要件 | 実装 |
|---|---|
| Tab で chip(または chip group)へ | 各 chip が Tab 順 ✓ / group は **なし(CH10)** |
| Space / Enter で起動・選択・解除 | ネイティブ button ✓ |
| Backspace / Delete でフォーカス中の input chip を削除 | **✗ CH6** |
| 矢印キーで chip 間を移動 | **✗ CH10**(chip 内の primary ↔ remove の移動は ✓、RTL 反転 ✓) |
| a11y 名 = ラベル、アイコンは隠す | ✓ |
| remove の名前「Remove {chip content}」 | ✓ |
| 2アクション(選択 + remove)は別々のフォーカス要素 | ✓(remove は Tab 順から外し矢印で到達。Shift+Tab で前の要素へ抜ける) |
| 選択状態をロールで伝える | `aria-pressed` ✓(ロールは軽微欄) |
| checkmark のモーション + reduced motion | **瞬時 ✗ CH9** |

## 手順メモ(今回わかったこと)

- m3.material.io の Chips は token-viewer が1つだけ(baseline viewer なし)。visibility 表示にしたままセットを
  切り替えると、シェイプ(`rounded_corner 8dp`)と elevation(`layers 1dp`)が `.token-value-wrapper` の文字列で
  そのまま読める(今回はボックスシャドウの解析が不要だった)
- CSS のカスタムプロパティ名が共有プリミティブの契約と一致しているか確認すること。Chip は material-web 由来の
  `--md-ripple-hover-color` を設定していたが、本ライブラリの `Ripple` は `--md-ripple-color` しか読まず、
  コードを読むだけでは効いているように見える。hover 中の state layer の `backgroundColor` を実測して初めて判明した
