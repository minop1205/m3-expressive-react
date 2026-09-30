# Toolbar 監査レポート(2026-09-30)

Phase B。`src/components/Toolbar/` の `Toolbar`(`variant`: docked / floating、`color`: standard / vibrant、
`orientation`: horizontal / vertical(floating のみ))を3ソースで突き合わせた:

1. **m3.material.io/components/toolbars/specs** + **/accessibility** + **/guidelines** — Playwright MCP で上段 token-viewer の
   全5セット(Toolbar - Color - Standard / Color - Vibrant / Docked / Floating / Floating - FAB)を visibility 表示のまま
   全展開して取得。Measurements は画像のみのため、寸法図5枚(docked padding / docked alignment / floating padding /
   floating size / floating margins)と色図2枚(standard / vibrant)を原寸で取得して読んだ。下段の
   「Bottom app bar (baseline)」viewer は空(AppBar 監査で扱い済み)
2. **Compose androidx-main** — `FloatingToolbar.kt`(`HorizontalFloatingToolbar` / `VerticalFloatingToolbar` と各 FAB 付き
   overload、`FloatingToolbarDefaults`、`FloatingToolbarColors`、`exitAlwaysScrollBehavior`、
   `floatingToolbarVerticalNestedScroll`、`minimumInteractiveBalancedPadding`)、`AppBar.kt` の `FlexibleBottomAppBar` /
   `BottomAppBarDefaults`(Compose の docked toolbar はこれ。`Toolbar.kt` / `DockedToolbar.kt` は存在しない)、
   `AppBarRow` / `AppBarColumn` / `AppBarDsl`、`tokens/` の `FloatingToolbarTokens`(12_0_0)・`DockedToolbarTokens`(14_0_0)・
   `BottomAppBarTokens`・`AppBarTokens`・`ElevationTokens`・`FabBaselineTokens`・`FabMediumTokens`・`IconButtonTokens`・
   `MotionSchemeKeyTokens`、`MotionScheme.kt`、`IconButtonDefaults.kt`、`ComposeMaterial3Flags`(toolbar 関連フラグなし)
3. **実装** — `Toolbar.tsx`, `Toolbar.module.css`, テスト(6件、全通過)・ストーリー(5話)。Storybook(dev)で全ストーリーの
   computed 値と `getBoundingClientRect` を実測、DOM 書き換えで docked × vibrant、`dir="rtl"`、キーボード操作、
   実ブラウザで axe-core 4.10(違反なし)

**共有実装について**: `Toolbar` は `role="toolbar"` の `<div>` にスロットを並べるだけのコンテナで、children は任意の
ReactNode。ストーリー・JSDoc は `IconButton variant="standard"`(size `sm` = 見た目 40px + `::before` の 48px ターゲット)を
想定している。AppBar 監査と同じく、(a) `IconButton` はレイアウト上 40px しか占めない(AppBar は AB3 #235)、
(b) standard `IconButton` は自前で `--_icon-color: on-surface-variant` を指定し親の `color` を継承しない(AppBar は AB5 #237)。
いずれも AppBar 側の issue は「AppBar の CSS でスロットを直す」方針のため、Toolbar は同じ根本原因の別ホストとして
**個別に起票し相互参照する**(IconButton 側で直す判断になれば同時に閉じる)。state layer / focus は `IconButton` の責務で、
focus state layer 0.10 の欠落はライブラリ共通課題 #194(Toolbar 内でも実測 opacity 0)— 重複起票せず #194 にコメント。

**前提 — Toolbar と BottomAppBar**: m3.material.io は toolbar を **Docked / Floating** の2 variant、構成を **Standard(既定)/
Vibrant**・floating の **Horizontal(既定)/ Vertical**・**With FAB** とし、baseline の bottom app bar は「Not recommended.
Use docked toolbar.」。Compose は floating を `Horizontal/VerticalFloatingToolbar`(FAB は overload)、docked を
`FlexibleBottomAppBar` として出す。With FAB は site 注記「On Jetpack Compose, floating toolbar with FAB is fully
supported. On other platforms, each component needs to be added separately.」— Web では FAB を別部品として並べる現行
構成(ストーリー `FloatingWithFab`)で良い。

## 結論サマリ

**一致している(修正不要)**:

- **container 色**: standard **surface-container**(site Standard `Toolbar standard container color` #F3EDF7、Compose
  `FloatingToolbarTokens.StandardContainerColor` / `BottomAppBarTokens.ContainerColor`。実測 rgb(242,236,244))、
  vibrant **primary-container**(site #EADDFF、Compose `VibrantContainerColor`。実測 rgb(233,221,255)、docked × vibrant も同じ)
- **docked の高さ**: **64dp**(site Docked `container height` 64、Compose `DockedToolbarTokens.ContainerHeight` →
  `FlexibleBottomAppBarHeight`。実測 64、`min-height` なので内容に応じて伸びる)
- **docked の左右 padding**: **16dp**(site leading / trailing 16、guidelines「minimum of 16dp padding on the leading and
  trailing edge」、Compose `FlexibleContentPadding` start / end 16。実測 16)
- **docked の shape / elevation / 幅**: 角丸 **0**・影なし・全幅(site Docked `container shape` 0、guidelines「straight
  corners」「span 100% of the screen width」、Compose CornerNone・Level0・`fillMaxWidth`。実測 0px / none / 412)
- **floating の shape**: **full**(site `Floating toolbar container shape` Circular、Compose CornerFull。実測 `border-radius`
  9999px — 下記軽微欄)
- **floating の内側 padding**: **8dp**(site leading / trailing space 8 + 寸法図、Compose `ContentPadding` 8 四辺。実測 8)
- **floating の item 間隔**: **4dp**(site `space between actions` 4 + 寸法図 8 | 4 | 4 | 4 | 8。実装 `gap: 4px`。Compose は
  間隔なし — 裁定参照。ただし item 幅は TL1)
- **floating の elevation**: **6dp = level3**(site `Floating toolbar container elevation` 6dp、guidelines「Floating toolbars
  have elevation by default」。実装 `--md-sys-elevation-shadow-level3`。Compose は 0dp — 裁定参照)
- **floating の幅**: 内容に合わせる(guidelines「only as big as needed」「Don't add extra space」、Compose content-driven。
  実装 `width: fit-content`)
- **vertical floating**: Column に流れ、`aria-orientation="vertical"`(site 構成 Vertical、Compose `VerticalFloatingToolbar`)。
  docked は常に `aria-orientation="horizontal"`(docked に vertical はない)
- **role**: `role="toolbar"`(site a11y「On web, the toolbar container should have the toolbar role」)
- **Tab 順・起動**: 各 item が Tab で順に止まり、Space / Enter で起動(site a11y「Focus lands on the first interactive
  element. Use Tab to navigate through all other actions.」— ネイティブ `<button>`。矢印キーは TL4)
- **container 自体は非インタラクティブ**(site「The toolbar has no interactions by default」、Compose も state layer なし)
- **RTL**: item 順が反転(site「mirror … flip the order of the actions」、Compose `placeRelative`。実測 Bold 96 / Italic 52 /
  Underline 8)
- **ターゲットサイズ**: 各 `IconButton` の `::before` が **48×48**(guidelines「minimum 48x48dp target area」— 配置は TL1)
- **FAB との間隔 / FAB サイズ(ストーリー)**: toolbar と FAB の間 **8dp**・FAB **56dp**・shape **16dp**・縦中央
  (site Floating - FAB `space between toolbar and FAB` 8 / 56 / 16dp、Compose `ToolbarToFabGap` 8・`FabBaselineTokens`。
  実測 8 / 56 / 16px)
- **disabled / state layer の値**: toolbar 側に独自値はなく IconButton の値(disabled on-surface 0.38、hover 0.08 /
  focus 0.10 / pressed 0.10)と一致(site の Standard / Vibrant 各状態フォルダ)。focus 0.10 の欠落は #194
- **axe**: 違反なし(jsdom・実ブラウザとも)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| TL1 | **item が 48dp のスロットを占めず、floating の container が 56dp** | `IconButton`(sm)がレイアウト上 **40px**。実測 floating horizontal の高さ **56px**(8 + 40 + 8)、vertical の幅 **56px**、item ピッチ **44px**。docked も item 幅 40px | site: floating `container height - horizontal` / `- vertical` **64dp**、寸法図 **8 \| 48 \| 4 \| 48 … \| 8**(ピッチ **52**)。Compose: `ContainerSize` 64 = 8 + **48**(IconButton の `minimumInteractiveComponentSize`)+ 8(`ContentPadding` KDoc「icons in IconButton that meet the minimum touch target (48.dp)」)。docked も同様に 48dp の item(guidelines「All elements need a minimum 48x48dp target area」)。AppBar AB3 #235 と同じ根本原因 | 中 |
| TL2 | **docked の item 間隔が 8dp** | `gap: 8px` + `justify-content: center`。実測(4 item、412px)item は x=114–298 に中央寄せで固まる | site: Docked `max space between actions` **32dp**(min 4)、寸法図 **16 \| item \| 32 \| … \| 16**、guidelines「The 32dp padding between items is just the default」「In compact breakpoints, elements in the toolbar should be evenly spaced」。Compose: `FlexibleFixedHorizontalArrangement` = `spacedBy(32dp, CenterHorizontally)`(既定 `FlexibleHorizontalArrangement` は `SpaceBetween` — 裁定参照) | 中 |
| TL3 | **item の色が color scheme に追従しない**(vibrant で顕著) | `.toolbar[data-color]` は container の `color` を設定するだけで、standard `IconButton` は自前の on-surface-variant を使う。実測 vibrant の icon **rgb(73,69,78)**(on-surface-variant、灰色が lavender 上に乗る)。standard は `color: on-surface` を設定しているが IconButton に効かないため偶然正しい | site Vibrant: `Toolbar vibrant icon color` / `label color` **on-primary-container**(#4F378B)、state layer も on-primary-container、**selected button container surface-container / selected icon on-surface**。Standard: icon / label **on-surface-variant**(#49454F)、selected container **secondary-container** / selected icon **on-secondary-container**。Compose: toolbar が `LocalContentColor` = `toolbarContentColor`(vibrant → onPrimaryContainer)を供給し standard `IconButton` がそれを継承(`VibrantButton*` トークンは存在するが未配線 — 裁定参照)。AppBar AB5 #237 と同じ根本原因 | 中 |
| TL4 | **矢印キーで item 間を移動できない** | キーハンドラなし。実測: 先頭 item で ArrowRight → フォーカス移動なし、Tab → 次の item | site a11y キー表「**Tab or Arrows** — Navigate between interactive elements」(本文「Use Tab to navigate through all other actions」も並立)。`role="toolbar"` を名乗る以上、支援技術利用者は矢印キー操作を期待する(WAI-ARIA APG toolbar pattern)。Compose はキーハンドラを持たないが、Android の D-pad / 矢印の方向フォーカス移動が標準で効くため矛盾しない。horizontal は Left / Right(RTL で反転)、vertical は Up / Down。Tab 順は維持(裁定参照) | 中 |
| TL5 | **スクロール連動・展開 / 折りたたみの挙動がまったくない** | スクロールを観測しない、`expanded` 相当の状態なし、leading / trailing スロットなし | site guidelines: 「Docked toolbars can either remain on the screen during scroll, or animate offscreen」「Floating toolbars can remain on the screen, animate offscreen, or collapse into a single, high-emphasis action on scroll」「Don't collapse actions and scroll at the same time」、a11y use case「Maintain access to toolbar controls when the content is scrolled or collapsed」。Compose: floating `expanded` + `leadingContent` / `trailingContent`(`expand/shrinkHorizontally`、FastSpatial = expressive spring 0.6 / 800)、FAB 付きは toolbar 幅 × progress・FAB 56↔80dp・elevation 0↔1dp、`exitAlwaysScrollBehavior`(translate で画面外へ、snap は fraction 0.5、offscreen 時 `canFocus = false`)、`floatingToolbarVerticalNestedScroll`(閾値 40dp)、docked は `FlexibleBottomAppBar(scrollBehavior)` で高さを縮める。TalkBack 有効時は常に展開・scroll behavior 無効、a11y custom action「Expand / Collapse toolbar」。API 判断(スクロール源・expanded の制御 / 非制御・reduced motion)が必要 | 中 |

Issue: TL1 + TL2 → #240(どちらも `Toolbar.module.css` のレイアウト規則を書き換えるため同梱)、TL3 → #241、TL4 → #242、TL5 → #243
(focus state layer 0.10 は `IconButton` の #194 で扱う — 新規起票せず、Toolbar でも再現した旨をコメント)

**軽微(判断・記録のみ)**:

- **FAB 付きストーリーの FAB 色**: ストーリーは `Fab` 既定(primary の tonal = primary-container、実測 rgb(233,221,255))。
  site Floating - FAB: standard toolbar の FAB **secondary-container / on-secondary-container**、vibrant toolbar の FAB
  **tertiary-container / on-tertiary-container**。Compose は standard **PrimaryContainer**(ハードコード、TODO「load colors from
  the toolbar tokens」)/ vibrant TertiaryContainer。site が上位 → ストーリーは `color="secondary"`(vibrant と組むなら
  `"tertiary"`)にすべき。FAB は利用者が並べる別部品なのでストーリー修正のみ(TL1 / TL3 の修正 PR で合わせて直す)
- **FAB 付きの FAB elevation**: site 1dp(展開時)/ 3dp(medium、折りたたみ時)、Compose Level2(3dp)、ストーリーの
  `Fab` は既定 level3。Fab 側の判断・利用者の構成なので発行しない
- **FAB 付きの toolbar elevation**: Compose は FAB 付きで toolbar 1dp。site の Floating セットは 6dp のみ。FAB 付きの展開 /
  折りたたみは TL5 の範囲で判断
- **標準 container の `color` が on-surface**: site の icon / label は on-surface-variant。Compose `contentColorFor` は onSurface。
  現状は IconButton に効かないので見た目に影響なし。TL3 で「IconButton に色を流す」方式にするなら standard を
  on-surface-variant にしないと standard の icon が暗くなる — TL3 の issue に明記
- **`border-radius: 9999px`**: `--md-sys-shape-corner-full` の値。CLAUDE.md の `calc(var(--_height) / 2)` はシェイプ
  モーフ用の規約で、静的な full corner の見た目は同じ → 維持
- **docked の配置オプション**: site は compact で均等配置、medium 以上で中央寄せ / 端寄せ、Web・大画面では docked を
  丸めてもよい。Compose は `horizontalArrangement` を公開。TL2 の既定値修正とは別に、配置 prop の要否は必要になったら
  API 判断で
- **floating の画面端マージン**(horizontal 16dp / vertical 24dp): Compose も `ScreenOffset` を Defaults に置くだけで
  配置は呼び出し側。Web でも利用者が配置 → 現状どおり。JSDoc に書くと親切
- **floating の elevation を外す手段**: guidelines「If the content beneath the toolbar is visually distinct, elevation can be
  removed」。`style` / `className` で外せるので prop は不要
- **accessible name**: site は要求しない。APG は toolbar が複数あるとき `aria-label` を推奨。ストーリーは全て付与済み →
  JSDoc で推奨する程度
- **docked に `orientation="vertical"` を渡したとき**: `data-orientation="vertical"` が付くが CSS / aria は horizontal。
  型で docked に vertical を禁止するほどではない
- **BottomAppBar の扱い**(AppBar 監査からの持ち越し): site は「Bottom app bar (not recommended). Use docked toolbar」、
  Compose の `BottomAppBar` は非 deprecated。ライブラリでは `BottomAppBar` の JSDoc に「新規には `Toolbar variant="docked"`
  を推奨」と書く程度に留め、deprecated 化は v2 の API 整理で判断
- **overflow メニュー**: site「When actions don't fit in a toolbar, add a menu」、Compose `AppBarRow` の自動 overflow。
  Web では利用者が `Menu` を trailing に置く → 現状どおり
- **ストーリーのカバレッジ**: docked × vibrant、toggle(selected)を含む vibrant、disabled item、RTL、テキストボタン /
  text field のスロットがない。TL1〜TL4 の修正 PR で足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| floating の elevation | `container elevation` **6dp**、guidelines「have elevation by default」 | `ContainerExpandedElevation` / `Collapsed` **Level0(0dp)**(`// TODO read from token`)、FAB 付きは 1dp / 0dp | site が上位、Compose は TODO 付きの仮値 → **6dp(level3)**(実装どおり) |
| floating の item 間隔 | `space between actions` **4dp** + 寸法図 | `ContainerBetweenSpace` 4dp は**未参照**、Row は `Arrangement.Center`(間隔 0) | site と token が一致 → **4dp**(実装どおり)。item 幅は TL1 |
| docked の既定配置 | 16 \| 32 \| … \| 16(「32dp … is just the default」)、compact は均等、本文「By default … center-aligned」 | 既定 `SpaceBetween`、固定版 `spacedBy(32dp, CenterHorizontally)`、`ContainerMinSpacing` 4dp 未参照 | site が上位 → **中央寄せ + 32dp 間隔**(TL2)。狭い幅で 32dp が入らない場合は min 4dp まで縮めるのが token の意図(`max space` 32 / `min space` 4) |
| standard の content 色 | icon / label **on-surface-variant**(色図も暗灰)。ただし Color 節の本文は「Standard button (**Primary**)」 | `contentColorFor(SurfaceContainer)` = **onSurface**(TODO「load colors from the toolbar tokens」) | token 表と色図が一致 → **on-surface-variant**。本文の「Primary」は旧記述と見なす(TL3) |
| vibrant の selected button 色 | selected container **surface-container** / icon **on-surface** | `VibrantButton*` トークンは同値だが**未配線**(呼び出し側任せ) | site が上位 → toolbar 側で供給する(TL3) |
| standard toolbar の FAB 色 | **secondary-container** / on-secondary-container | **PrimaryContainer**(ハードコード、TODO) | site が上位 → secondary-container(ストーリーのみ、軽微欄) |
| FAB の shape(medium 80dp 時) | 20dp | FabBaseline 16dp のまま(`FabMediumTokens` の shape は TODO でコメントアウト) | site が上位 → 20dp。TL5(折りたたみ)を実装する時に適用 |
| キーボード | キー表「**Tab or Arrows**」、本文「Use **Tab** to navigate through all other actions」 | キーハンドラなし(D-pad の方向フォーカスは OS 標準) | 両方を満たす → **Tab で全 item を巡回(現状維持)+ 矢印キーでも移動**(TL4)。APG の roving tabindex(Tab で toolbar を1回だけ通過)は site 本文と矛盾するため採らない |
| Floating セットの warning 行 | `container height`・`margin from screen edge`・色5行に warning、置き換え行(`- horizontal` / `- vertical`)あり | — | warning 行 = 古い行。置き換え行(horizontal / vertical 64dp、margin 16 / 24dp)を採用。値は同じ |
| Docked `container color` | warning 付き #F3EDF7 | `DockedToolbarTokens.ContainerColor` 未参照、`BottomAppBarTokens` SurfaceContainer を使用 | 値が一致 → surface-container(実装どおり) |
| role / semantics | 「On web, the toolbar container should have the toolbar role」 | role なし(`parentSemantics` の custom action のみ) | site が Web を明示 → `role="toolbar"`(実装どおり) |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| docked 高さ | 64 | 64 | 64 ✓(min-height) |
| docked 左右 padding | 16 / 16 | 16 / 16 | 16 / 16 ✓ |
| docked item 間隔 | 32(max)/ 4(min) | `SpaceBetween`(既定)/ `spacedBy(32)` | **8 ✗ TL2** |
| docked item 幅 | 48 ターゲット | 48(IconButton) | **40**(`::before` 48)✗ TL1 |
| floating 高さ(horizontal)/ 幅(vertical) | 64 / 64 | 64 / 64(`heightIn` / `widthIn` min) | **56 / 56 ✗ TL1** |
| floating 内側 padding | 8 | 8 | 8 ✓ |
| floating item 間隔 | 4 | 0(token 4 は未参照) | 4 ✓ |
| floating item ピッチ | 52(48 + 4) | 48 | **44 ✗ TL1** |
| floating の画面端マージン | 16(horizontal)/ 24(vertical) | `ScreenOffset` 16(呼び出し側) | 呼び出し側 ✓ |
| toolbar と FAB の間隔 | 8 | 8(ハードコード) | ストーリー 8 ✓ |
| FAB(展開 / 折りたたみ) | 56(16dp shape, icon 24)/ 80(20dp shape, icon 28) | 56 ↔ 80(shape 16 のまま) | ストーリー 56 / 16 ✓、折りたたみなし(TL5) |

### シェイプ・elevation

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| docked shape | 0 | CornerNone | 0 ✓ |
| floating shape | Circular | CornerFull | full(9999px)✓ |
| docked elevation | —(図に影なし) | Level0 | none ✓ |
| floating elevation | 6dp | 0dp(TODO) | level3 ✓(裁定参照) |
| FAB 付き toolbar / FAB elevation | —/ 1dp(展開)・3dp(medium) | 0↔1dp / Level2 | ストーリー level3 / level3(軽微欄) |

### カラー(light)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| standard container | surface-container | SurfaceContainer | surface-container ✓ |
| standard icon / label | on-surface-variant | onSurface(`contentColorFor`) | icon on-surface-variant ✓(IconButton 自前)/ container `color` on-surface(軽微欄) |
| standard selected container / icon | secondary-container / on-secondary-container | 呼び出し側 | IconButton の toggle 色(toolbar は供給しない)✗ TL3 |
| vibrant container | primary-container | PrimaryContainer | primary-container ✓ |
| vibrant icon / label / state layer | on-primary-container | onPrimaryContainer(`LocalContentColor`) | **on-surface-variant ✗ TL3** |
| vibrant selected container / icon | surface-container / on-surface | 未配線 | **IconButton の既定 ✗ TL3** |
| disabled icon / label | on-surface 0.38 | content 色 × 0.38 | IconButton の on-surface 0.38 ✓ |
| FAB(standard / vibrant toolbar) | secondary-container / tertiary-container | PrimaryContainer / TertiaryContainer | ストーリー primary-container(軽微欄) |

### モーション(TL5 の仕様メモ)

| 項目 | site | Compose |
|---|---|---|
| 展開 / 折りたたみ | 「collapse into a single, high-emphasis action on scroll」 | `expanded`、leading / trailing を `expand/shrinkHorizontally`(horizontal: leading は Start から出て End へ縮む、trailing は逆。vertical: leading Bottom、trailing Top)、spec = FastSpatial(expressive spring 0.6 / 800、standard 0.9 / 1400)、隠れた側の余白は `minimumInteractiveBalancedPadding`(DefaultEffects 1.0 / 1600) |
| FAB 付き | — | toolbar 幅 = 最大内在幅 × progress、FAB 56 ↔ 80dp、toolbar elevation 0 ↔ 1dp、全体幅は一定(toolbar + 8 + 56) |
| 画面外へ退避 | docked / floating とも「animate offscreen」 | floating `exitAlwaysScrollBehavior`(translate、snap DefaultEffects、fraction 0.5 で判定、fling は spline decay)、docked `FlexibleBottomAppBar(scrollBehavior)`(高さを縮める、snap FastSpatial) |
| スクロールで折りたたみ | 「Don't collapse actions and scroll at the same time」 | `floatingToolbarVerticalNestedScroll`(閾値 40dp、下スクロールで collapse・戻すと expand) |
| a11y | 「Maintain access to toolbar controls when the content is scrolled or collapsed」 | TalkBack 有効時は常に展開・scroll behavior 無効、custom action「Expand / Collapse toolbar」、画面外では `canFocus = false` |
| reduced motion | — | —(Web 実装時は `prefers-reduced-motion` で即時切替にすること) |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| role | Web は `toolbar` | なし | `role="toolbar"` ✓ |
| aria-orientation | —(vertical 構成あり) | 別 composable | floating は prop に追従、docked は horizontal ✓ |
| 初期フォーカス | 最初の interactive 要素 | 合成順 | DOM 順 ✓ |
| Tab | 全 item を巡回 | — | 全 item を巡回 ✓ |
| 矢印キー | 「Tab or Arrows」 | OS の方向フォーカス | **なし ✗ TL4** |
| 起動 | Space / Enter | — | ネイティブ `<button>` ✓ |
| ターゲット | 48 × 48 | 48(IconButton) | 48(`::before`)✓(レイアウトは TL1) |
| focus state layer | 0.1 | ripple | **0**(#194) |
| RTL | 反転 | `placeRelative` | 反転 ✓ |
| スクロール時の操作維持 | 必須 | 画面外で focus 不可 | スクロール挙動なし(TL5) |
| axe | — | — | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- Toolbars の specs は token-viewer が2つ(上段: 5セット、下段: Bottom app bar (baseline) — 空)。Floating セットは
  warning 行と置き換え行(`- horizontal` / `- vertical`)が並ぶので、置き換え行を読むこと
- Compose の docked toolbar は `FlexibleBottomAppBar`(`AppBar.kt`)で、`DockedToolbarTokens` の一部だけを参照する。
  `FloatingToolbarDefaults` は elevation・FAB 色・gap・モーションがほぼ TODO 付きのハードコード → site との食い違いは
  site を採る根拠として TODO を記録する
- a11y ページのキー表と本文が食い違う(「Tab or Arrows」vs「Use Tab」)ことがある — 両方を満たす形で裁定する
