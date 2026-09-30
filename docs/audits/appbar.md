# AppBar 監査レポート(2026-09-30)

Phase B。`src/components/AppBar/` の `TopAppBar`(`variant`: small / center / medium / large、`title` /
`navigationIcon` / `actions` スロット)と、同じディレクトリにある `BottomAppBar`(actions + `floatingActionButton`)を
3ソースで突き合わせた:

1. **m3.material.io/components/app-bars/specs** + **/accessibility** + **/guidelines** — Playwright MCP で token-viewer の
   全セット(上段 viewer: App bar - Common / Size - Small / Size - Medium Flexible / Size - Large Flexible、下段
   baseline viewer: Size - Medium (baseline) / Size - Large (baseline)。`[Deprecated] Top app bar - *` 4セットは対象外)を
   全展開して取得(visibility 表示で shape / elevation も読んだ)。Measurements は画像のみのため、5枚の寸法図
   (small / medium flexible / large flexible / baseline medium / baseline large)を原寸で取得して読んだ。
   Bottom app bar は現在 `/components/toolbars/specs` の「Bottom app bar (baseline)」節にあり(旧 URL はリダイレクト)、
   token-viewer は空のため寸法図のみ
2. **Compose androidx-main** — `AppBar.kt`(`TopAppBar`・subtitle 付き `TopAppBar`・`CenterAlignedTopAppBar`・
   `MediumTopAppBar` / `LargeTopAppBar`・`MediumFlexibleTopAppBar` / `LargeFlexibleTopAppBar`・public `TwoRowsTopAppBar`・
   `TopAppBarDefaults`・`TopAppBarColors`・`TopAppBarState`・pinned / enterAlways / exitUntilCollapsed・`settleAppBar`・
   `BottomAppBar` / `FlexibleBottomAppBar` / `BottomAppBarDefaults`)、`tokens/` の `AppBarTokens`・`AppBarSmallTokens`・
   `AppBarMediumTokens`・`AppBarLargeTokens`・`AppBarMediumFlexibleTokens`・`AppBarLargeFlexibleTokens`・
   `BottomAppBarTokens`・`DockedToolbarTokens`・`ElevationTokens`・`TypeScaleTokens`・`MotionSchemeKeyTokens`、
   `MotionScheme.kt`、`ComposeMaterial3Flags`(app bar 関連フラグなし)。旧 `TopAppBarSmallTokens` 等はディレクトリに
   もう存在せず、`AppBar*Tokens` 系に置き換わっている
3. **実装** — `AppBar.tsx`, `AppBar.module.css`, テスト(8件、全通過)・ストーリー(5話)。Storybook(dev)で全ストーリーの
   computed 値と `getBoundingClientRect` を実測、`dir="rtl"`、長いタイトル + 360px 幅 + ルート文字サイズ 200%、
   実ブラウザで axe-core 4.10(違反なし)

**共有実装について**: `navigationIcon` / `actions` / `BottomAppBar` の children は任意の ReactNode で、ストーリー・JSDoc は
`IconButton variant="standard"`(size `sm` = 40px の見た目 + `::before` の 48px ターゲット)を想定している。
`IconButton` の standard は自前で `--_icon-color: on-surface-variant` を指定し、親の `color` を継承しない(Compose の
standard `IconButton` は `LocalContentColor` を継承する)。state layer / focus は `IconButton` 側(Ripple / FocusRing)の
責務で、focus state layer 0.10 の欠落は既知のライブラリ共通課題 #194 — AppBar としては重複起票しない。

**前提 — baseline と Expressive**: m3.material.io は app bar を **Search / Small / Medium flexible / Large flexible** の4種とし、
**Center-aligned は「Merged into small. Use centered-text configuration.」**、**Medium / Large(baseline)は「Not recommended.
Use medium / large flexible」**。Compose も `MediumFlexibleTopAppBar` / `LargeFlexibleTopAppBar` と subtitle 付き
`TopAppBar(titleHorizontalAlignment)` を持つ(baseline 版も非 deprecated で残る)。実装は baseline の4種のみで、
スクロール挙動を一切持たない。

## 結論サマリ

**一致している(修正不要)**:

- **container 色(静止時)**: **surface**(site Common `App bar container color` #FEF7FF、Compose `AppBarTokens.ContainerColor`
  = Surface、`defaultTopAppBarColors` も同じ。実測 = テーマの surface)
- **container shape / elevation(静止時)**: 角丸 **0**・elevation **0**(site・Compose とも。実装は border-radius / shadow なし)
- **title 色**: **on-surface**(site #1D1B20、Compose `TitleColor`。実測 rgb(29,27,32))
- **action(trailing)icon 色**: **on-surface-variant**(site #49454F、Compose `TrailingIconColor`。実測)
- **small の高さ**: **64dp**(site・Compose `AppBarSmallTokens.ContainerHeight`。実測 64)
- **左右 padding**: bar の端に **4dp**(site Common left / right padding 4、Compose `TopAppBarHorizontalPadding` 4.dp。
  実装 `padding-inline: 4px` — ただしスロット内の配置は AB3)
- **nav なしのタイトル開始位置**: **16dp**(Compose `TopAppBarTitleInset` 12 + title の 4 = 16。実装 4 + 12 = 16)
- **タイポグラフィ(baseline)**: small / center **TitleLarge**(22/28/400)、medium **HeadlineSmall**(24/32)、large
  **HeadlineMedium**(28/36)(site baseline セット・Compose `AppBarSmall/Medium/LargeTokens.TitleFont`。実測一致)
- **small のタイトル**: 1行・折り返さない(site guidelines「Don't wrap text in a small app bar」。実装は nowrap +
  ellipsis — 下記軽微欄)
- **ランドマーク / 見出し**: `<header>`(banner)+ タイトルは見出し要素(site a11y「The headline has accessibility role
  'Title'」、use case「Understand what page they're currently visiting」。Compose は `heading()` なし — 裁定参照)
- **キーボード**: Tab で nav → actions の順、Space / Enter で起動(site a11y のキー表・「Initial focus … on the leading button」。
  ネイティブ `<button>` の順序どおり)
- **RTL**: nav が右端・actions が左端・タイトル右寄せに反転(site「layout of the app bar is mirrored」。実測)
- **ターゲットサイズ**: 各 `IconButton` が `::before` で **48×48**(site 寸法図の 48 ターゲット)
- **axe**: 違反なし(jsdom・実ブラウザとも)
- **BottomAppBar**: 高さ **80dp**・container **surface-container**・icon **on-surface-variant**・左 padding **4dp**・
  FAB の右 **16dp**(site 寸法図 4 / 16 / 80、Compose `BottomAppBarTokens` ContainerHeight 80 / SurfaceContainer、
  `ContentPadding` 4 + `FABHorizontalPadding` 12 = 16。実測 80 / rgb(242,236,244) / 4 / 16)、elevation 0(裁定参照)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| AB1 | **スクロール連動の挙動がまったくない**(on-scroll の container 色変化・隠す / 折りたたむ) | スクロールを観測しない。container は常に surface、`position` 指定なし。medium / large は常に展開 | site: 「On scroll, the container changes color to **surface container**」(Common `App bar container color on scroll` #F3EDF7)、guidelines「initially the same color as the background, then fill with a contrasting color on scroll」「can remain on a page at all times, or can hide and reappear」「medium / large flexible … transform into small app bars … remain small until the page is scrolled back to the top」、a11y「Maintain access to app bar actions when the content is scrolled」。Compose: `scrolledContainerColor` = SurfaceContainer、`pinnedScrollBehavior`(色のみ)/ `enterAlwaysScrollBehavior`(隠す)/ `exitUntilCollapsedScrollBehavior`(2段を64dp に畳む)、single-row は `overlappedFraction > 0.01` で DefaultEffects spring(1.0 / 1600)で色遷移、2段は `collapsedFraction` に連続追従(`FastOutLinearInEasing`)。スクロール源の指定方法など API 判断が必要 | 高 |
| AB2 | **medium / large の高さとタイトル下余白** | 実測 medium **116px**(64 + 行高 32 + 下 padding 20)、large **128px**(64 + 36 + 28)。下余白は行ボックス下端から | site / Compose: medium **112dp**・large **152dp**(`AppBarMediumTokens` / `AppBarLargeTokens.ContainerHeight`)。下余白は Compose `MediumTitleBottomPadding` **24dp** / `LargeTitleBottomPadding` **28dp** を**最終ベースラインから**測る(site baseline 寸法図も 24 / 28)。large はタイトルが約 30px 高すぎる | 中 |
| AB3 | **nav / action スロットの配置が 48dp グリッドになっていない**(BottomAppBar も同様) | `IconButton`(sm)は見た目 40px でレイアウト上も 40px、スロット間 `gap: 4px`。実測: nav icon は bar 端から **12px**、action の間隔(ピッチ)**44px**、右端 icon も端から **12px**、nav ありのタイトル開始 **60px**(4 + 40 + 4 + 12)。BottomAppBar も actions ピッチ 44px | site 寸法図: **4 \| 48 \| 4 \| title** → icon は端から **16dp**、タイトル **56dp**、action は **48dp ターゲットが隙間なく並ぶ**(Common `App bar icon spacing` **0**)。Compose: `IconButton` は `minimumInteractiveComponentSize` で 48dp をレイアウトに占め、actions の Row に間隔なし、タイトル x = max(12, nav 幅) + 4 = 56。BottomAppBar も site 寸法図で 48 ターゲットが隣接、Compose actions Row 間隔なし | 中 |
| AB4 | **center の タイトルが bar の中央にならない** | タイトル要素が nav と actions の間を `flex: 1` で占め、その中で `text-align: center`。実測: 文字の中心が bar 中心から **22px** 左(nav 40px・actions 84px の差の半分) | Compose: centered title は **bar 全幅で中央**に置き、nav / actions に衝突するときだけ内側に押す(`AppBar.kt` l.3194–3211)。site 寸法図(Product の例)も bar 中央 | 低 |
| AB5 | **nav icon の色が on-surface-variant** | `.nav { color: on-surface }` を指定しているが、`IconButton` standard が自前で `--_icon-color: on-surface-variant` を指定するため効かない(実測 nav の svg rgb(73,69,78)) | site Common `App bar leading icon` **on-surface**(#1D1B20)、Compose `LeadingIconColor` = OnSurface → `navigationIconContentColor` を `LocalContentColor` で供給し standard `IconButton` がそれを継承 | 低 |
| AB6 | **M3 Expressive の構成がない**(medium / large flexible、subtitle、small の centered 構成) | variant は baseline の small / center / medium / large のみ。subtitle なし。medium / large のタイトルは HeadlineSmall / HeadlineMedium | site: variants = Small / **Medium flexible**(**112dp**、subtitle ありで **136dp**、title **HeadlineMedium**、subtitle **LabelLarge**)/ **Large flexible**(**120dp** / **152dp**、**DisplaySmall** / **TitleMedium**)、small の subtitle **LabelMedium**(subtitle 色 **on-surface-variant**)、テキスト配置 leading / centered は全 variant の構成、flexible は見出しを **最大2行** まで折り返す。baseline medium / large は「Not recommended」。Compose: `MediumFlexibleTopAppBar` / `LargeFlexibleTopAppBar`(同じトークン値)、subtitle 付き `TopAppBar(titleHorizontalAlignment)`。variant 名・`subtitle` / 配置 prop の API 判断が必要 | 中 |

Issue: AB1 → #233、AB2 → #234、AB3 → #235(TopAppBar と BottomAppBar のスロット配置を同じ方針で書き換えるため同梱)、AB4 → #236、AB5 → #237、AB6 → #238
(focus state layer 0.10 は `IconButton` の #194 で扱う — 新規起票せず)

**軽微(判断・記録のみ)**:

- **見出しレベルが `<h1>` 固定**: site は「role Title」とだけ言い、Compose は `heading()` すら付けない。アプリ側に既に
  `<h1>` がある構成では重複するが、app bar のタイトルが「現在のページ名」である以上 h1 は妥当な既定。見出しレベルを
  変える prop(MUI の `component` 相当)は必要になったら API 判断で
- **small のタイトルを ellipsis で切る**: guidelines は「Don't truncate the headline text」かつ「Don't wrap text in a small
  app bar」(長いなら flexible を使え)。small で収まらない場合のフォールバックとして ellipsis は妥当 → 維持。
  medium / large は折り返しに上限がない(Compose も `maxLines` を付けない)。flexible 追加(AB6)時に site の「2行まで」を
  どう扱うか判断
- **行の高さが `height: 64px` 固定**: Compose は `max(height, title の高さ)` で伸びる。実測ではルート文字サイズ 200% でも
  TitleLarge の行高 56px が 64px に収まるため実害なし。AB2 / AB6 の修正時に `min-height` 化を検討
- **ストーリーの `BottomAppBar` の FAB 色**: ストーリーは `Fab` 既定色(primary-container 系、実測 rgb(233,221,255))。
  Compose `BottomAppBarDefaults.bottomAppBarFabColor` = secondary-container。ストーリー上の選択なので発行しない
- **BottomAppBar の FAB 縦位置**: 実装は縦中央、Compose は上 12dp 揃え(`FABVerticalPadding` 8 + `ContentPadding` top 4)。
  56dp の FAB では両者同じ(12dp)。40dp の FAB(ストーリー)でのみ 8dp 差
- **BottomAppBar 自体が baseline**: site では「Bottom app bar (not recommended). Use docked toolbar.」。ライブラリには別に
  `Toolbar` がある。BottomAppBar を deprecated 扱いにするかは Toolbar 監査と合わせて判断
- **WindowInsets / スクロール時の固定**: Compose は system bar の inset を持つ。Web では利用者が `position: sticky` 等で
  配置するのが通常 → AB1 の API 設計で sticky を内蔵するかを合わせて判断
- **Search app bar**: site の variant だが、Compose では `TopSearchBar`(SearchBar 側)。ライブラリの `SearchBar` の監査で扱う
- **ストーリーのカバレッジ**: nav なし・actions なし・長いタイトル・RTL・スクロールがストーリーにない。AB1 / AB4 / AB6 の
  修正 PR で足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| on-scroll の elevation | Common `App bar container elevation on scroll` **3dp** | `AppBarTokens.OnScrollContainerElevation` Level2(3dp)だが **未使用**。container は `drawBehind` の矩形で影なし、色変化のみ | site の本文「On scroll, the container changes color to surface container」と Scroll states 図は色のみ。3dp は旧来の tonal elevation(= surface-container 相当の色)の名残と見て **色変化のみ・影なし**(AB1) |
| BottomAppBar の elevation | 寸法図・色図に影なし(token viewer は空) | トークン Level2(3dp)、`BottomAppBarDefaults.ContainerElevation` = **0.dp**(コメントなし) | Defaults と site の図 → **0**(実装どおり) |
| flexible のタイトル下余白 | 寸法図「12」(テキスト枠の下端から) | `MediumTitleBottomPadding` 24 / `LargeTitleBottomPadding` 28(最終ベースラインから) | 同じ位置を別の基準で示したもの(HeadlineMedium / DisplaySmall の descent 分)。実装は Compose のベースライン基準で合わせる(AB2 / AB6) |
| Center-aligned | Small に統合(centered-text 構成)、全 variant で配置を選べる | `CenterAlignedTopAppBar` は残存 + subtitle 付き `TopAppBar` / flexible に `titleHorizontalAlignment` | 両者とも「配置は構成」の方向 → AB6 の API 判断で `variant="center"` を配置 prop に寄せるか決める |
| 見出しセマンティクス | 「The headline has accessibility role 'Title'」 | `heading()` なし、`isTraversalGroup` のみ | site が上位 → 見出し要素を維持(実装どおり) |
| icon spacing トークン | Common `App bar icon spacing` **0** | `AppBarTokens.IconButtonSpace` 0(未使用だが Row に間隔なし) | 一致 → 0(AB3) |
| icon button size トークン | Size セットの `icon button size` 24dp に **warning** | `AppBarTokens.IconSize` 24(未使用) | warning 行 = 古い行。サイズは IconButton に任せる(実装どおり 24) |
| baseline medium / large | 「Not recommended」 | 非 deprecated のまま | site が上位 → flexible を推奨既定にする方向(AB6)。baseline 値の修正(AB2)は存続する間の正しさとして別に行う |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| small / center 高さ | 64 | 64 | 64 ✓ |
| medium(baseline)高さ | 112 | 112(collapsed 64) | **116 ✗ AB2** |
| large(baseline)高さ | 152 | 152(collapsed 64) | **128 ✗ AB2** |
| medium / large タイトル下余白 | 24 / 28 | 24 / 28(ベースラインから) | **20 / 28(行ボックスから)✗ AB2** |
| medium / large flexible 高さ | 112(136)/ 120(152) | 同じ | **なし ✗ AB6** |
| bar 左右 padding | 4 / 4 | 4 / 4 | 4 / 4 ✓ |
| nav / action ターゲット | 48、icon は端から 16 | 48 をレイアウトに占める | 40 + `::before` 48、icon は端から **12 ✗ AB3** |
| action 間隔 | 0(48 が隣接) | 0 | **gap 4(ピッチ 44)✗ AB3** |
| タイトル開始(nav あり / なし) | 56 / 16 | 56 / 16 | **60** ✗ AB3 / 16 ✓ |
| center のタイトル中心 | bar 中央 | bar 中央(衝突時のみ内側へ) | **nav〜actions 間の中央 ✗ AB4** |
| icon | 24 | IconButton 任せ | 24 ✓ |
| BottomAppBar 高さ / 左 / FAB 右 | 80 / 4 / 16 | 80 / 4 / 4 + 12 | 80 / 4 / 16 ✓ |
| BottomAppBar action 間隔 | 48 が隣接 | 間隔なし | **gap 4 ✗ AB3** |

### カラー(light)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| container | surface | Surface | surface ✓ |
| container(スクロール時) | surface-container | SurfaceContainer | **変化なし ✗ AB1** |
| title | on-surface | OnSurface | on-surface ✓ |
| subtitle | on-surface-variant | OnSurfaceVariant | **なし ✗ AB6** |
| leading(nav)icon | on-surface | OnSurface | **on-surface-variant ✗ AB5** |
| trailing(action)icon | on-surface-variant | OnSurfaceVariant | on-surface-variant ✓ |
| BottomAppBar container / icon | surface-container / on-surface-variant | SurfaceContainer / contentColorFor | ✓ / ✓ |

### タイポグラフィ

| variant | title(site / Compose) | subtitle(site / Compose) | 実装 |
|---|---|---|---|
| small / center | TitleLarge / TitleLarge | LabelMedium / LabelMedium | TitleLarge ✓ / subtitle なし(AB6) |
| medium(baseline) | HeadlineSmall / HeadlineSmall | —(warning 行)/ — | HeadlineSmall ✓ |
| large(baseline) | HeadlineMedium / HeadlineMedium | —(warning 行)/ — | HeadlineMedium ✓ |
| medium flexible | HeadlineMedium / HeadlineMedium | LabelLarge / LabelLarge | なし(AB6) |
| large flexible | DisplaySmall / DisplaySmall | TitleMedium / TitleMedium | なし(AB6) |

### スクロール・モーション(AB1 の仕様メモ)

| 項目 | site | Compose |
|---|---|---|
| 色の変化 | flat → on scroll で surface-container | single-row: `overlappedFraction > 0.01f` で 0/1、`animateColorAsState(DefaultEffects)` = spring(1.0, 1600)。2段: `collapsedFraction` に連続追従、`lerp(…, FastOutLinearInEasing)` |
| 常時表示 | 「remain on a page at all times」 | `pinnedScrollBehavior`(色のみ) |
| 隠す / 再表示 | 「hide when scrolling up and reveal when scrolling down」 | `enterAlwaysScrollBehavior`(bar 全体を heightOffset で隠す、下スクロールで即再表示) |
| flexible → small | 「transform into small … remain small until scrolled back to the top」 | `exitUntilCollapsedScrollBehavior`(下段のみ畳む、先頭到達で再展開)。上段タイトル alpha `CubicBezierEasing(.8, 0, .8, .15)`、下段 alpha `1 - fraction`、fraction 0.5 でセマンティクスを切替 |
| スナップ | — | `settleAppBar`: 0.01 < fraction < 1 のとき fling 後、0.5 未満なら展開・以上なら収納。snap = DefaultEffects spring、fling = spline decay |
| reduced motion | — | —(Web 実装時は `prefers-reduced-motion` で色遷移・スナップを即時にすること) |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| ランドマーク | — | `isTraversalGroup` | `<header>`(banner)✓ |
| タイトル | role Title、ラベル = 表示テキスト | `heading()` なし | `<h1>` ✓(レベル固定は軽微欄) |
| nav / action のラベル | icon button の a11y ガイドに従う | 呼び出し側 | 呼び出し側(ストーリーは `aria-label` あり)✓ |
| フォーカス順 | 最初は leading button、Tab で順送り | — | DOM 順 ✓ |
| ターゲット | 48 | 48(IconButton) | 48(`::before`)✓(配置は AB3) |
| スクロール時の操作維持 | actions に常にアクセス可能 | pinned / enterAlways | スクロール挙動なし(AB1) |
| RTL | 反転 | 反転 | 反転 ✓ |
| テキスト拡大 | — | 高さはタイトルに合わせて伸びる | 200% でも収まる(軽微欄) |
| axe | — | — | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- App bars の specs は token-viewer が3つ(上段: Common + Size 3セット、中段: Search 用で空、下段: baseline 2セット +
  `[Deprecated] Top app bar - *` 4セット)。Measurements は画像だけなので、`img[alt*=measurements]` の `src` を
  `=w1400` に書き換えて curl で取得し、画像として読むと寸法が取れる
- Bottom app bar は `/components/bottom-app-bar/*` から `/components/toolbars/*` にリダイレクトされ、ページ末尾の
  「Bottom app bar (baseline)」節にある(token viewer は空)
- Compose の旧 `TopAppBarSmallTokens` などは廃止され `AppBar*Tokens` に集約されている。`AppBarTokens` の
  icon size / spacing / elevation-on-scroll の多くは `AppBar.kt` から参照されない(値は定数やレイアウトで実現)ので、
  トークンと実装の両方を読むこと
- スロットに `IconButton` を置く部品では、IconButton の「見た目 40px + `::before` 48px」がレイアウト上 40px しか
  占めない点を必ず実測する(Compose は 48dp をレイアウトに占める)。また standard IconButton は親の `color` を継承しない
