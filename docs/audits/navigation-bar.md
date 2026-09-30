# NavigationBar 監査レポート(2026-09-30)

Phase B Tier 3。NavigationRail と同時に監査した(姉妹レポート: `docs/audits/navigation-rail.md`)。3ソースを突き合わせた:

1. **m3.material.io/components/navigation-bar/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   トークンテーブルの全セット(Nav bar - Common / Item - Vertical / Item - Horizontal、下段の baseline viewer の
   Navigation bar (baseline) も)を全展開・visibility 表示で取得。バッジの読み上げ要件は
   **/components/badges/accessibility** から取得
2. **Compose androidx-main** — `NavigationBar.kt`(classic `NavigationBar`/`NavigationBarItem`)、`ShortNavigationBar.kt`
   (Expressive `ShortNavigationBar`/`ShortNavigationBarItem`)、`NavigationItem.kt`(共有の item 実装)、`Badge.kt`、
   `NavigationBarTokens` / `NavigationBarVerticalItemTokens` / `NavigationBarHorizontalItemTokens`、`StateTokens`、
   `MotionScheme`・`StandardMotionTokens`・`ExpressiveMotionTokens`。`ComposeMaterial3Flags` の分岐はナビ系ファイルに**なし**
3. **実装** — `src/components/NavigationBar/NavigationBar.tsx`, `NavigationBar.module.css`, テスト(7件、全通過)・
   ストーリー(`Default` の1話のみ)。Storybook(dev)で `getComputedStyle` / `getBoundingClientRect` を実測

**共有コードについて**: 依頼時の想定と違い、NavigationBar と NavigationRail の item は**コードを共有していない**
(`NavigationBarItem` は `NavigationBar.tsx` 内、`NavigationRailItem` は別ファイルで別 CSS)。ただし構造(indicator の
`::before`/`::after`、インラインのバッジ、単一 `icon`)は同じで、同じ欠陥を両方が持つ。両方に共通する発見は
**このレポートに1回だけ記録**し(NB5–NB7)、Issue タイトルは「Navigation items: 」とした。NavigationRail 側からは
相互参照する。

## 結論サマリ

**一致している(修正不要)**:

- **色**: コンテナ surface-container、active indicator secondary-container、選択アイコン on-secondary-container、
  選択ラベル secondary(vertical)、非選択アイコン・ラベル on-surface-variant(実測 rgb(74,68,88) / rgb(98,91,113) /
  rgb(73,69,78))。horizontal の選択ラベル on-secondary-container(Compose の値 — 下記裁定)
- **寸法**: アイコン 24、indicator 幅 56(vertical)・形状 full(`border-radius: 16px` = 高さ 32 の半分)、
  indicator とラベルの間 4、項目間の隙間 0(site `space between items 0`、Compose `ShortNavigationBar` も隙間なし)、
  vertical は等幅(Compose `EqualWeight`)、horizontal の indicator 高さ 40・左右 16・min-width 56
- **タイポグラフィ**: ラベルは vertical / horizontal とも label-medium(500 12/16 0.5)
- **state layer の不透明度**: hover 0.08・pressed 0.10(トークン参照)。state layer は indicator の形に切り抜かれる
  (site a11y「hover で indicator が縮小表示で出る」、Compose `IndicatorRipple` も indicator にクリップ)
- **selection のモーション**: indicator が中心から横方向(1軸)に広がる — `scaleX(0.3→1)` + 不透明度(site guidelines
  「中心から、1軸のみ」、Compose は width = total × progress)。`prefers-reduced-motion` で遷移を止める。色の遷移は
  なし(Compose `ShortNavigationBarItem` も色をアニメーションしない)
- **バッジの位置**: large は icon の上端から −2 / 開始端 icon 幅 −12、dot 6dp は icon の右上角(Compose `BadgedBox` の
  `BadgeWithContentHorizontalOffset` 12 / `VerticalOffset` 14 / `BadgeOffset` 6 と一致)、error / on-error
- **挙動・a11y**: `<nav>` ランドマーク、ネイティブ `<button>` で Tab 移動・Enter/Space で選択(site a11y のキー表
  「Tab / Space・Enter」と一致、一時テストで確認)、初期フォーカスは DOM 順で先頭の item(site「最初の item」)、
  現在地を `aria-current="page"` で公開、選択済みの再クリックでも `onChange` が発火(site guidelines の「再選択で
  先頭へスクロール」をアプリ側で実装できる)、controlled / uncontrolled(Phase A A4)、`onChange(event, value)`
  (A2)、disabled で Tab 対象外、axe 違反なし(vertical + horizontal、一時テストで確認)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| NB1 | **コンテナが baseline(80dp)のまま** | `height: 80px`、`padding-block: 12px 16px`(vertical)。JSDoc も「80dp … per Compose NavigationBarTokens」 | site: baseline nav bar は「no longer recommended … should be replaced by the **flexible** nav bar」、Common セット `Nav bar height` **64dp**、Vertical セット `container between space` **6dp**。Compose `ShortNavigationBar`: `defaultMinSize(minHeight = ContainerHeight 64dp)`、`TopIconItemVerticalPadding` 6dp → 6 + 32 + 4 + 16 + 6 = **64** | 中(VRT 差分あり) |
| NB2 | **indicator が 56×30 に潰れている** | `<button>` の UA パディング(上下 1px)を `.item` がリセットしていない(`padding-inline` だけ指定)ため、52px の内容箱に 32 + 4 + 16 = 52 が収まらず、indicator が flex-shrink で **30px** になる(実測: indicator 56×30、アイコンが indicator 上端から 3px) | indicator **56×32**(site Vertical セット / Compose `TopIconIndicatorVerticalPadding` 4 → 24 + 8)。`padding-block: 0`(NavigationRailItem は `padding: 0` でリセット済み)+ indicator に `flex-shrink: 0` | 中(VRT 差分あり) |
| NB3 | **文字サイズ拡大でバーが伸びない** | 固定 `height: 80px` + ラベル `white-space: nowrap` | site a11y「大きな文字サイズではバーが**縦に伸びて**ラベルを収め、既定のパディングは保つ。折り返しは可。2倍までは全文が見えること」。Compose も `defaultMinSize(minHeight)` で、全 item の最大高さに合わせて伸びる → `min-height` にして折り返しを許す | 中(a11y) |
| NB4 | **horizontal item の間隔と配置** | icon–label の間 **8**(`gap: 8px`)、item は `flex: 1 1 0` の等幅 | icon–label の間 **4**(site Horizontal セット `active indicator icon label space` 4dp、Compose `StartIconToLabelPadding` 4dp)。配置は site「horizontal item は**固定幅**で、余りはバーの両端に足す / 中央寄せで外側に余白」→ Compose の `ShortNavigationBarArrangement.Centered`(両端の余白 = 幅 × (100 − 10(n+3))/2 %、3/4/5/6 項目で 20/15/10/5%、7 項目以上は 0)を horizontal の既定にする | 低(horizontal ストーリーなし=現状 VRT 差分なし) |
| NB5 | **(共通)state layer: 押下リップル・focus 0.10 がない / 非選択の色 / focus ring の形** | 両コンポーネントとも手書きの `::after` で hover 0.08・pressed 0.10 のフェードだけ(共有 `Ripple` 不使用 → 押下の拡張円なし)、**focus の state layer 0.10 なし**。Bar の非選択 item の state layer は on-surface-variant(実測 rgb(73,69,78))。Bar の `FocusRing` は item の箱全体(379×52 の角の四角)を囲む | site a11y「タップで ripple が indicator を通過する」、トークン hover **0.08** / focus **0.10** / pressed **0.10**、state layer 色は active・inactive とも **on-secondary-container**(site Common セット全行)。Compose: indicator にクリップした `ripple(focusRingShape = indicatorShape)` — focus 表示も indicator の形。→ indicator 内に `Ripple`(hover はリストの行全体で拾う)+ focus 0.10、Bar の FocusRing は Rail と同じく indicator の形に合わせる | 中 |
| NB6 | **(共通)選択中の塗りアイコンを渡す手段がない** | `icon` の1つだけ。選択状態で切り替える API がない(ストーリーも outlined のまま) | site a11y・guidelines(bar・rail 両方):「選択中は **filled** アイコン、非選択は outlined。filled がなければ太いウェイトに」「アイコンは状態の主要な手がかり」。Compose は `selected` に応じて利用側が `icon` を切り替える作り。Web では Switch と同じ `selectedIcon` prop が自然(API 名は要決定) | 中(a11y・API) |
| NB7 | **(共通)バッジの読み上げ** | Bar: バッジ文字が名前の**先頭**に入る(アクセシブルネーム「5 Xray」)。Rail: バッジが `aria-hidden` のアイコン内にあり**一切読まれない**(名前「Alpha」)。dot バッジは両方で読まれない(一時テストで `computeAccessibleName` を確認) | site badges/accessibility「バッジの a11y ラベルは**ナビゲーション先の後に**読まれる。数値バッジは数を、数えないバッジは “**New notification**” と読む」。ライブラリの `Badge` は `aria-label="{n} notifications"` を持つので、item でも同じ規則で名前の末尾(または `aria-describedby`)に入れる | 中(a11y) |

Issue: NB1/NB2/NB3 → #171(同じ `.bar`/`.item` の高さ・パディングを書き換えるため同梱)、NB4 → #172、
NB5 → #173、NB6 → #174、NB7 → #175

**軽微(判断・記録のみ)**:

- **コンテナの elevation**: site は Common セット・baseline セットとも `container elevation` **3dp**(+ shadow color
  #000000)。Compose はトークン `ContainerElevation = Level2` だが、`NavigationBarDefaults.Elevation = Level0`(コメント
  なし)、`ShortNavigationBar` には elevation パラメータ自体がない。MD3 の tonal elevation は surface-container の色で
  表現済みで、影を出す実装は Compose にない → **影なしを維持**(下記裁定)
- **選択ラベルの太さ**: site a11y の本文は「選択中は **bold** のラベル、非選択は medium」だが、現行の Common /
  Vertical / Horizontal セットには active 用のウェイト行がなく label text は 500 のみ(700 は非推奨の baseline セット
  `Weight (active)` にだけある)。Compose も LabelMedium のまま → **500 を維持**。NavigationDrawer の ND1(現行
  トークン表に 700 がある)とは根拠の強さが違う
- **disabled の色**: 実装は on-surface @38%、Compose は `ItemInactive*Color.copy(alpha = 0.38)`(= on-surface-variant
  @38%)、site にトークンなし。差はごく僅か(TextField と同じ扱い)。disabled の選択 item で indicator を減光しない点は
  Compose と一致
- **セマンティクス**: Compose は `selectableGroup()` + 各 item `Role.Tab` + selected。Web ではページ遷移のナビゲーションに
  `role="tab"` は誤用なので、`<nav>` + `aria-current="page"` を**維持**(下記裁定)。ただし実際の遷移先は URL であることが
  多く、`<button>` しか描けない現状では中クリック・新規タブ・リンクのコピーができない。MUI `BottomNavigationAction` の
  `component={Link}` 相当(`href` / `component` prop)は将来の API 判断の候補
- **モーション**: indicator は `scaleX` 200ms emphasized-decelerate + 不透明度 100ms。Compose `ShortNavigationBarItem` は
  幅と alpha を同じ DefaultSpatial spring(standard 0.9/700、expressive 0.8/380)で動かす。見た目の差は僅か。ライブラリ
  全体の MotionScheme 既定は横断的な判断(Button B5 と同じ論点)
- **ラベルなし item**: Compose `ShortNavigationBarItem` の `label` は nullable、site guidelines は「ラベルを消さない」。
  `label` が任意なのは Compose どおりで問題なし(ラベルなしなら `aria-label` が必要 — JSDoc で案内するとよい)
- **項目数**: site「3–5 項目」。実装は制限しない(Compose も制限しない)
- **スクロールで隠す**: site「スクリーンリーダー使用時は隠さない」— アプリ側の責務
- **ストーリーのカバレッジ**: `Default` の1話だけで、horizontal・disabled・dot バッジ・4/5 項目がない → VRT が
  それらを一度も撮っていない。NB1 / NB4 / NB6 の修正 PR でストーリーを足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| 推奨コンテナ | flexible(64dp)を推奨、baseline(80dp)は非推奨 | classic `NavigationBar`(80dp)と Expressive `ShortNavigationBar`(64dp)を両方出荷 | site 優先 → **64dp の flexible を唯一の形に**(NB1)。classic 80dp を別 variant として残す必要はない(site が非推奨) |
| コンテナ elevation | 3dp(shadow color #000) | トークン Level2 / Defaults Level0 / ShortNavigationBar はパラメータなし | 3dp は tonal elevation 時代の値と判断(CLAUDE.md「site 行の鮮度を疑う」— Compose がトークンを上書きして 0 にしている)→ **影なし** |
| 非選択 item の state layer 色 | on-secondary-container(Common セット) | トークンは同値だが**未参照**。`ripple()` の既定色(content color 由来) | site 優先 → **on-secondary-container**(NB5)。Rail の実装は既にこの値 |
| horizontal の選択ラベル色 | Common セットは layout を分けず secondary | `ShortNavigationBarItemDefaults`: start-icon 位置は on-secondary-container(`TODO: Replace with the correct token once it is available`) | site の nav rail 色ロール「Secondary (vertical), On secondary container (horizontal)」が Compose と一致 → **on-secondary-container**(現実装のまま)。bar の Common セットは layout 別の行がまだない(TODO と同じ状態)と判断 |
| horizontal item の配置 | 固定幅・中央寄せ・両端に余白 | 既定 `EqualWeight`、`Centered` は選択式 | site 優先 → horizontal では **Centered 相当を既定**(NB4) |
| 選択ラベルの太さ | a11y 本文は bold、現行トークンは 500 のみ | LabelMedium(500) | 現行トークン + Compose → **500**(軽微欄) |
| item のロール | (記載なし。a11y 本文は「選択」) | `Role.Tab` + `selectableGroup` | Web の慣習(APG: ページ遷移は `role="tab"` にしない)→ **`<nav>` + `aria-current="page"`** |

## 詳細対照表

### 寸法(site トークン / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| コンテナの高さ(vertical) | 64 | 64(min、`ShortNavigationBar`) | **80 固定 ✗(NB1/NB3)** |
| item の上下パディング | 6(container between space) | 6 | 12 / 16 **✗(NB1)** |
| コンテナの高さ(horizontal) | 64 | 64(min) | 64 ✓(固定 — NB3) |
| indicator(vertical) | 56×32 | 56×32 | **56×30 ✗(NB2)** |
| indicator(horizontal) | 高さ 40・左右 16 | 40・16 | 40・16 ✓ |
| indicator ↔ label(vertical) | 4 | 4 | 4 ✓ |
| icon ↔ label(horizontal) | 4 | 4 | **8 ✗(NB4)** |
| 項目間の隙間 | 0 | 0(Short) / 8(classic) | 0 ✓ |
| horizontal の配置 | 固定幅・中央寄せ | `Centered`: 両端 20/15/10/5% | **等幅 ✗(NB4)** |
| アイコン | 24 | 24 | 24 ✓ |
| タッチターゲット | — | item min 48×48 | item 全体(等幅 × 高さ)✓ |
| コンテナ形状 | 0 | CornerNone | 0 ✓ |

### カラー(light)

| 要素 | site | Compose | 実装 |
|---|---|---|---|
| コンテナ | surface-container | SurfaceContainer | ✓ |
| active indicator | secondary-container | SecondaryContainer | ✓ |
| 選択アイコン | on-secondary-container | OnSecondaryContainer | ✓ |
| 選択ラベル(vertical) | secondary | Secondary | ✓ |
| 選択ラベル(horizontal) | (secondary — 裁定参照) | OnSecondaryContainer(TODO) | on-secondary-container ✓ |
| 非選択アイコン・ラベル | on-surface-variant | OnSurfaceVariant | ✓ |
| state layer(選択) | on-secondary-container | ripple 既定色 | ✓ |
| state layer(非選択) | on-secondary-container | ripple 既定色 | **on-surface-variant ✗(NB5)** |
| disabled | — | on-surface-variant @0.38 | on-surface @38%(軽微) |
| バッジ | error / on-error | Badge 既定 | ✓ |

### 状態・モーション

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| hover | 0.08 | 0.08 | 0.08 ✓ |
| focus | 0.10 | 0.10(ripple の focus) | **なし ✗(NB5)**(FocusRing のみ) |
| pressed | 0.10 + ripple | 0.10 + ripple | 0.10 のフェードのみ **✗(NB5)** |
| focus 表示の形 | — | indicator の形 | item の箱全体 **✗(NB5)** |
| selection | 中心から 1 軸で広がる | 幅 × progress + alpha(DefaultSpatial) | `scaleX` + opacity ✓(時間は軽微欄) |
| reduced motion | — | — | 遷移なし ✓ |

### 挙動・a11y

| 要件 | 実装 |
|---|---|
| ランドマーク | `<nav>` ✓(`aria-label` は利用側 — ストーリーでは未指定) |
| 現在地 | `aria-current="page"` ✓ |
| Tab で item 間を移動 / Space・Enter で選択 | ネイティブ `<button>` ✓(一時テストで確認) |
| 初期フォーカスは先頭 item | DOM 順 ✓ |
| 選択中は filled アイコン | **✗(NB6)** |
| バッジはナビ先の後に読む / dot は “New notification” | **✗(NB7)** |
| 文字サイズ 2 倍まで全文表示、バーが縦に伸びる | **✗(NB3)** |
| axe | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- 「同じ実装を共有している」という前提は実装を読んで確かめること。今回は構造が同じだけの別実装だった。共通の欠陥は
  片方のレポートに1回だけ書き、Issue タイトルを「Navigation items: 」にしてどちらの修正 PR でも拾えるようにした
- m3.material.io のコンポーネントページで、**別コンポーネントの a11y ページが要件を持つ**ことがある(バッジの読み上げ順は
  badges/accessibility にしかない)。子要素として埋め込むコンポーネント(Badge, FAB 等)の a11y ページも読むこと
- ネイティブ `<button>` の UA パディング(1px 6px)の取り残しは、トークン値を読むだけでは見つからない。寸法は必ず
  実測する(NB2 は Storybook の `getBoundingClientRect` でだけ見えた)
- ストーリーが1話しかないコンポーネントは、表示されていない layout(今回の horizontal)の実測ができない。一時ストーリーを
  作るか、CSS 読みで判定したことを明記する(NB4 の gap は CSS 読み)
