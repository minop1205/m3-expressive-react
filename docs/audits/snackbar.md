# Snackbar 監査レポート(2026-09-30)

Phase B。`src/components/Snackbar/` の `Snackbar`(`message` / `action`(`{ label, onClick }` またはカスタムノード)/
`onDismiss`)を3ソースで突き合わせた:

1. **m3.material.io/components/snackbar/specs** + **/accessibility** + **/guidelines** — Playwright MCP で token-viewer
   (セットは「Snackbars」の1つだけ、warning 行なし)を visibility 表示のまま全展開して取得。寸法図(Measurements)と
   Configurations 図(5構成)を原寸で取得して読んだ
2. **Compose androidx-main** — `Snackbar.kt`(slot / data の2オーバーロード、`OneRowSnackbar` / `NewLineButtonSnackbar` と
   その Legacy 版、`SnackbarDefaults`、private 定数)、`SnackbarHost.kt`(`SnackbarHostState`、`SnackbarDuration.toMillis`、
   `FadeInFadeOutWithScale`)、`tokens/SnackbarTokens.kt`(`VERSION: v0_103`)、`ComposeMaterial3Flags.kt`、
   `ShapeTokens` / `ElevationTokens` / `TypeScaleTokens` / `StandardMotionTokens` / `ExpressiveMotionTokens`、
   `IconButton.kt` / `SmallIconButtonTokens`、`Button.kt`(`TextButton` の寸法)、`strings.xml`
3. **実装** — `Snackbar.tsx`, `Snackbar.module.css`, テスト(6件、全通過)・ストーリー(4話)。Storybook(dev)で全ストーリーの
   `getBoundingClientRect` / computed style を実測、viewport 360px、`dir="rtl"`、Tab / Escape / 押下、実ブラウザで axe-core 4.10

**共有実装について**: action と dismiss は**素の `<button>`**(`.action` / `.dismiss`)で、ライブラリの `Button` / `IconButton` /
`Ripple` / `FocusRing` を一切使っていない。したがって IconButton の focus 0.10 欠落(#194)や、スロットホストの 40px 配置・
IconButton の親色非継承(#235 / #237 / #240 / #241)は**現状のコードには直接は該当しない**。ただし SN2 の修正で
`IconButton variant="standard"` に置き換える場合は、#194 の focus 0.10 と #237 / #241 の「親の content color を継承しない」
問題がそのまま入り込むので、issue に明記した。

**前提 — Compose のレイアウトフラグ**: `ComposeMaterial3Flags.isSnackbarStylingFixEnabled`(`// TODO: b/485970632`)は
**既定 false**。現行既定は Legacy レイアウト(複数行時に first baseline を 30dp に置き、`TwoLinesContainerHeight` 68dp を
最小高にする)で、フラグ on の fixed レイアウトは「correctly handles vertical alignment for multi-line text」として
テキストに上下 14dp の padding を付け、要素を縦中央に置く。実装は fixed 側と同じ組み方(6 + 8 = 14px)で、
1行 48 / 2行 68 はどちらの版とも一致する(裁定参照)。

## 結論サマリ

**一致している(修正不要)**:

- **container 色**: **inverse-surface**(site token `#322F35`、Compose `SnackbarTokens.ContainerColor`。実測 rgb(50,47,53))
- **supporting text**: **inverse-on-surface / body-medium**(14 / 20 / 400、tracking 0.25 — 裁定参照。実測 `14px / 20px`、
  `0.25px`)
- **action の文字色**: **inverse-primary / label-large**(site `#D0BCFF` 14 / 20 / 0.1 / 500、Compose `ActionLabelTextColor`
  + `LabelLarge`。実測 rgb(207,189,254)、`500 14px / 20px`、`0.1px`)
- **dismiss icon 色**: **inverse-on-surface**(site `#F5EFF7`、Compose `IconColor`。実測 rgb(245,239,247))
- **角丸**: **extra-small 4dp**(site「Extra small rounding」、`ShapeTokens.CornerExtraSmall` 4dp。実測 4px)
- **elevation**: **level 3**(site プレビュー = level 3 の影、Compose `ElevationTokens.Level3` 6dp を shadowElevation で。
  実装 `--md-sys-elevation-shadow-level3`)
- **高さ**: **1行 48dp / 2行 68dp**(site token + 寸法図、Compose `SingleLineContainerHeight` / `TwoLinesContainerHeight`。
  実測 Message / WithAction / WithActionAndDismiss = 48px、TwoLine = 68px)
- **start padding 16dp / action 側 end padding 8dp**(site 寸法図、Compose `HorizontalSpacing` 16 /
  `HorizontalSpacingButtonSide` 8。実測 `padding: 6px 8px 6px 16px`)。テキストの上下 14dp(Compose fixed
  `SnackbarVerticalPadding`)も 6 + 8 = 14px で一致
- **最大幅 600dp**(Compose `ContainerMaxWidth`。実測 TwoLine = 600px)
- **hover state layer 0.08**: action = inverse-primary 8%、dismiss = inverse-on-surface 8%(site hover token と一致)
- **action は1つだけ**(site「A snackbar can contain a single action」、Compose `action` スロット1つ)、dismiss は任意
  (site「"Dismiss" or "cancel" actions are optional」、Compose `withDismissAction = false`)
- **dismiss のアクセシブル名 "Dismiss"**(Compose `Strings.SnackbarDismiss` = "Dismiss")
- **live region**: `role="status"` + `aria-live="polite"`(site a11y「use a live region with a polite (queued) announcement
  instead of an assertive announcement」、Compose `liveRegion = LiveRegionMode.Polite`)。**フォーカスを奪わない・トラップしない**
  (site a11y Focus の3項目)も満たす。ただし挿入タイミングの問題は SN1
- **RTL**: `padding-inline` / flex で正しく反転(実測: message が右、start padding 16px が右側、end 8px が左側)
- **axe**: jsdom・実ブラウザとも違反なし

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| SN1 | **host(表示キュー・自動消去・配置・入退場モーション)がない** | 見た目の bar だけ(JSDoc「pair it with your own positioning / auto-hide logic」)。キュー、duration、自動消去、画面下部への配置、enter / exit アニメーション、reduced motion、消去後のフォーカス復帰はすべて利用者任せ。`role="status"` の要素ごと mount / unmount するため、live region が**内容と同時に DOM へ挿入**される(支援技術によっては読まれない — 実機スクリーンリーダーでは未検証) | Compose は `SnackbarHost` + `SnackbarHostState` を同梱: `showSnackbar(message, actionLabel, withDismissAction, duration = if (actionLabel == null) Short else Indefinite)`、**Mutex による公平キューで1件ずつ**、`Short 4000ms / Long 10000ms / Indefinite`、`accessibilityManager.calculateRecommendedTimeoutMillis(…, containsControls = hasAction)` で延長、`FadeInFadeOutWithScale`(opacity 0↔1 = `FastEffects` spring 1.0 / 3800、scale **0.8↔1** = `FastSpatial` spring 0.9 / 1400、translate なし)、data オーバーロードは外側 **12dp** の margin。site: 「Only one snackbar may be displayed at a time」「Consecutive snackbars must appear one at a time」「Don't stack snackbars」「placed at the bottom of a UI」「auto-dismiss after **4–10 seconds**」「**Snackbars with actions should remain on the screen until the user takes an action … or dismisses it**」、a11y「Focus returns from the snackbar to the previously focused element」。→ `SnackbarHost`(または provider + `useSnackbar().show()`)を追加する API 判断が必要。既定 duration は action ありなら無期限、hover / focus-within 中はタイマー停止(WCAG 2.2.1 — site は自動消去そのものを避ける方針なので矛盾なし)、live region は常設の容器に置いて中身だけ差し替える、`prefers-reduced-motion` ではフェードのみ(または即時) | 高 |
| SN2 | **action / dismiss に focus・pressed の状態表現がなく、Ripple / FocusRing もない** | 素の `<button>` に `:hover` の 8% 背景だけ。Tab でのフォーカス表示は**ブラウザ既定の outline**(実測 `outline: auto 1px rgb(0,95,204)`、Chrome の白+青の2重リング)、focus state layer なし、押下は背景変化なし(実測 `rgba(0,0,0,0)`)・ripple なし | site token: focus state layer **0.10**(action = inverse-primary、icon = inverse-on-surface)、pressed (ripple) **0.10**(同色)。Compose は action に `TextButton`、dismiss に `IconButton` を使い、状態・ripple・フォーカス表示はそれらに従う。→ ライブラリの `Button variant="text"`(色は inverse-primary)と `IconButton variant="standard"`(色は inverse-on-surface)で組むか、同等に `Ripple` + `FocusRing` + focus 0.10 を付ける。IconButton を使う場合は #194(focus 0.10 欠落)と #237 / #241(親の content color を継承しない)を先に / 同時に解決すること | 中 |
| SN3 | **dismiss ボタンとアイコンが小さく、48dp のタッチターゲットも右端の配置もずれている** | dismiss は **32×32px**、アイコン **18px**、`::before` 等のタッチターゲット拡張なし。snackbar の end padding 8px が dismiss 有りでも残り、アイコン右端から container 右端まで **15px**(実測)。action との間は `gap: 8px` | site: icon size **24dp**(token + 寸法図)、寸法図は dismiss 領域を **12 \| 24 \| 12**(= 48dp 幅)で container の右端にぴったり置く。Compose: `IconButton`(small container **40dp**、`minimumInteractiveComponentSize` で **48dp**)、Row の end padding は `if (dismissAction == null) 8.dp else 0.dp`。→ アイコン 24px、48px のタッチ領域、dismiss 有りのとき end padding 0 | 中 |
| SN4 | **action ボタンが TextButton の寸法になっていない** | `.action`: 高さ **36px**、左右 padding **8px**、min-width なし、タッチターゲット拡張なし(実測 Undo = 49×36) | Compose `TextButton`: `ButtonDefaults.MinHeight` = `ButtonSmallTokens.ContainerHeight`(**40dp**。precision-pointer フラグ時のみ 36dp)、`MinWidth` **58dp**、`TextButtonContentPadding` 左右 **12dp**、48dp タッチターゲット。site は「a single text button」とだけ書き、寸法は Button に委ねる(矛盾なし)。SN2 と同じ箇所なので同梱 | 低 |
| SN5 | **長い action を別行に置くレイアウトがない** | 常に1行 flex。viewport 360px の TwoLine ストーリーで message 幅が **136px** に潰れ **116px 高**(約6行)になる | site Configurations 図 5「Two lines with longer action」(action が右下の別行)、guidelines「If an action is long, it can be displayed on a third line」。Compose `actionOnNewLine: Boolean = false`(自動判定はなく明示指定。KDoc「Recommended for action with long action text」)。fixed の `NewLineButtonSnackbar`: text は上下 14 / end 16、ボタン行は end 寄せ・bottom 4dp・end 8dp(dismiss 有りは 0)。→ `actionOnNewLine` 相当の boolean prop(API 判断) | 中 |
| SN6 | **幅が内容に縮む(容器幅に広がらない)** | `display: inline-flex` + `max-width: 600px` のみ。実測 Message ストーリーで **154px**、WithAction 198px | Compose: `containerWidth = min(constraints.maxWidth, ContainerMaxWidth)`(可用幅いっぱい、上限 600dp)、data オーバーロードは外側 12dp。site guidelines(compact)「maintaining a **fixed distance from the leading, trailing, and bottom edges** of the screen」、medium 以上は「scale horizontally to accommodate longer text」「Don't place snackbars flush to one edge」。→ 既定で `width: 100%`(上限 600px)、左右の余白は host 側(SN1)。medium 以上で内容幅にするかは host の配置オプションとして判断 | 低 |
| SN7 | **Escape で閉じられない** | キーハンドラなし(`onDismiss` を渡しても Escape は無反応) | site a11y キー表「**Esc — Dismisses the snackbar when in focus**」「Tab — Moves focus between interactive elements」。Compose はキー処理を持たないが、全 snackbar に `semantics { dismiss { … } }` を付けて支援技術から閉じられるようにしている(矛盾なし)。→ snackbar 内にフォーカスがある時の Escape で `onDismiss`(host ではフォーカスを元の要素へ戻す — SN1) | 中 |

Issue: SN1 → #251、SN2 + SN3 + SN4 → #252(いずれも action / dismiss ボタンを Button / IconButton 相当に置き換える同一箇所のため同梱)、
SN5 → #253、SN6 → #254、SN7 → #255
(focus state layer 0.10 は #194、IconButton の親色非継承は #237 / #241 を SN2 の issue で参照 — 重複起票しない)

**軽微(判断・記録のみ)**:

- **Web でのフォーカス移動ショートカット**: site a11y「On web, a shortcut should exist for users to move focus to snackbars
  with actions (like **Alt+G**). Ensure that this shortcut is clearly documented」。キー割り当てはアプリ側の責務(他のショートカットと
  衝突しうる)。SN1 の host に `focus()` 手段(ref / `hostState.focus()`)を用意し、JSDoc で推奨を示す程度にとどめる
- **Web の自動消去に関する要件**: site a11y「auto-dismissing snackbars … Information … **must also be communicated inline**」は
  アプリ側の要件。SN1 の host / ストーリーの JSDoc で明記する
- **dismiss のツールチップ**: Compose data オーバーロードは dismiss を `TooltipBox`(plain tooltip「Dismiss」、上側)で包む。
  Web は `aria-label` で名前は足りる。ライブラリの `Tooltip` で包むかは SN2 の修正時に判断(VRT には出ない)
- **`paneTitle = "Alert"`**: Compose は snackbar に pane title を付ける。Web に同等の概念はなく、`role="status"` のままとする
  (`role="alert"` は assertive で site の「polite」に反する)
- **"Dismiss" のハードコード**: 英語固定で差し替え手段がない(Dialog の "Close" も同様)。ライブラリ全体の i18n 方針
  (ラベル prop を持たせるか)として別途判断
- **`aria-live="polite"` の重複**: `role="status"` が暗黙に polite を持つので冗長だが無害(古い支援技術向けの保険として残してよい)
- **カスタム action ノード**: `isValidElement` の場合はスタイルなしでそのまま置く。site「Don't use a filled or elevated button in a
  snackbar」— JSDoc で text ボタンを推奨する
- **message の内容**: `ReactNode` なのでリンク等も置けるが、site「Avoid using stylized text or inline links」「Avoid adding icons」。
  型では禁じず JSDoc で示す
- **container の半透明**: site は「slight transparency」を許容。対応不要
- **component token 名**: CSS が `--_container-color` 等の private token を使わず system token を直書きしている(CLAUDE.md の
  CSS 規約から外れる)。SN2〜SN4 の書き換え時に `--_*` へ寄せる
- **ストーリーのカバレッジ**: RTL、狭い幅、長い action、キーボードフォーカス、host(キュー / 自動消去)がない。各修正 PR で足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| 2行の高さ | token `two lines height` **68dp**。guidelines 本文(Responsive layout)は「expand vertically from 48dp to **64dp**」 | `TwoLinesContainerHeight` 68dp(Legacy の最小高。fixed は 14 + 40 + 14 = 68 で自然に一致) | token と Compose が一致 → **68dp**(実装どおり)。guidelines の 64dp は古い本文と判断 |
| body-medium tracking | supporting text tracking **0.25pt** | `TypeScaleTokens.BodyMediumTracking` **0.2sp** | site が上位 → **0.25**(実装・`tokens.css` どおり) |
| 複数行のテキスト配置 | 寸法図は1行のみ | 既定(フラグ off)の Legacy は first baseline 30dp、フラグ on の fixed は上下 14dp padding・縦中央 | フラグの意図(「correctly handles vertical alignment」)に従い **fixed 側**(実装どおり)。2行時の見た目の差は 1px 程度 |
| action の状態 token | hover 0.08 / focus 0.10 / pressed 0.10(inverse-primary) | `SnackbarTokens` に `Action{Hover,Focus,Pressed}LabelTextColor` はあるが `Snackbar.kt` は読まず、状態は `TextButton` 任せ | 値は一致(TextButton も 0.08 / 0.10 / 0.10、色は content color)→ **site の token 値**(SN2) |
| icon size | token **24dp** | `SnackbarTokens.IconSize` 24dp は未参照、`IconButton` 既定の 24dp アイコンで結果は同じ | 一致 → **24dp**(SN3) |
| dismiss の配置 | 寸法図 12 \| 24 \| 12 で右端に密着 | `IconButton` 48dp(タッチ)+ end padding 0 | 一致 → **48dp 領域を右端に**(SN3) |
| 長い action | 図 5・「can be displayed on a third line」 | `actionOnNewLine` 明示指定(自動判定なし) | 一致 → **opt-in の prop**(SN5)。自動判定(はみ出し検知)は site も Compose も求めていないので採らない |
| 幅 | compact は左右・下に固定距離、medium 以上は内容に応じて横に伸びる | 可用幅いっぱい(上限 600dp) | compact では一致 → **既定は容器幅いっぱい・上限 600**(SN6)。medium 以上の内容幅は host の配置オプションとして判断 |
| action ありの duration | 「remain on the screen until the user takes an action … or dismisses it」 | `showSnackbar` の既定 = action ありなら `Indefinite` | 一致 → **無期限**(SN1) |
| タイマーの一時停止 | 記述なし(自動消去自体を Web では避ける方針) | 一時停止なし(a11y 設定で延長のみ) | 矛盾なし → Web では **hover / focus-within で停止**を追加(WCAG 2.2.1)(SN1) |
| Escape | 「Esc — Dismisses the snackbar when in focus」 | キー処理なし、`semantics.dismiss` のみ | 矛盾なし → **Escape で dismiss**(SN7) |
| モーション | 仕様ページに記述なし(guidelines の動画のみ) | fade(FastEffects)+ scale 0.8↔1(FastSpatial)、TODO「to be replaced with the public customizable implementation」 | Compose に従う(SN1)。Expressive スキームでは FastSpatial が 0.6 / 800 になる点は実装時に選ぶ |
| a11y 本文の focus 復帰 | 「return to the element that triggered the snackbar, or go to the next most logical element」、Compose については「may move to the nearest visible element」 | フォーカス管理なし | site に従う(SN1 / SN7) |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 1行の高さ | 48 | 48 | 48 ✓ |
| 2行の高さ | 68(guidelines 本文 64) | 68 | 68 ✓ |
| start padding | 16 | 16 | 16 ✓ |
| end padding(action のみ) | 8 | 8 | 8 ✓ |
| end padding(dismiss あり) | 0(12 \| 24 \| 12 が右端) | 0 | **8 ✗ SN3** |
| テキスト上下 | — | 14(fixed)/ baseline 30(Legacy 複数行) | 6 + 8 = 14 ✓ |
| 最大幅 | —(medium 以上で横に伸びる) | 600 | 600 ✓ |
| 幅の既定 | compact で左右固定距離 | 可用幅いっぱい | **内容幅(154px 等)✗ SN6** |
| action 高さ / padding / min-width | —(text button) | 40 / 12 / 58、タッチ 48 | **36 / 8 / なし ✗ SN4** |
| dismiss container / icon / タッチ | icon 24、領域 48 | 40 / 24 / 48 | **32 / 18 / 32 ✗ SN3** |
| action と dismiss の間 | 寸法図で 12(dismiss 領域の左余白) | TextButton と IconButton が隣接 | gap 8(SN3 / SN4 の修正で決まる) |
| 外側の margin | 左右・下に固定距離 | data オーバーロード 12 | なし(host の責務 — SN1) |

### シェイプ・色・タイポ

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| container | inverse-surface | inverse-surface | ✓ |
| 角丸 | extra-small 4 | CornerExtraSmall 4 | 4px ✓ |
| elevation | level 3 | Level3(6dp shadow) | shadow-level3 ✓ |
| supporting text | inverse-on-surface / body-medium 14/20/0.25/400 | inverse-on-surface / BodyMedium(tracking 0.2) | ✓(0.25) |
| action | inverse-primary / label-large 14/20/0.1/500 | inverse-primary / LabelLarge | ✓ |
| icon | inverse-on-surface | inverse-on-surface | ✓ |
| hover state layer | 0.08(action: inverse-primary、icon: inverse-on-surface) | TextButton / IconButton 既定 | 8% ✓ |
| focus state layer | 0.10 | 同上 | **なし ✗ SN2** |
| pressed state layer / ripple | 0.10 + ripple | 同上 | **なし ✗ SN2** |
| フォーカス表示 | (FocusRing) | TextButton / IconButton 既定 | **ブラウザ既定 outline ✗ SN2** |

### 挙動・モーション・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 表示数 | 1件ずつ、重ねない | Mutex キュー | **なし ✗ SN1** |
| 自動消去 | action なし 4–10s、action ありは消えない | Short 4s / Long 10s / Indefinite(action ありの既定)、a11y 延長 | **なし ✗ SN1** |
| タイマー停止 | — | なし | なし(SN1 で追加) |
| 配置 | 画面下部・コンテンツの前面、FAB の上 | `SnackbarHost` を Scaffold の下部スロットへ | **なし ✗ SN1** |
| enter / exit | — | fade + scale 0.8↔1(spring) | **なし ✗ SN1**(VRT は reduced motion で撮るので見えない) |
| reduced motion | — | — | 該当モーションなし(SN1 で対応) |
| live region | polite、フォーカスを奪わない | `LiveRegionMode.Polite`、paneTitle "Alert" | `role="status"` + polite ✓(挿入タイミングは SN1) |
| フォーカス移動 | Web はショートカット(Alt+G 等) | — | なし(軽微欄) |
| フォーカス復帰 | 元の要素へ | なし | なし(SN1) |
| キーボード | Tab、Esc で dismiss | `semantics.dismiss` | Tab ✓、**Esc なし ✗ SN7** |
| 長い action | 別行 | `actionOnNewLine` | **なし ✗ SN5** |
| RTL | — | — | 反転 ✓ |
| axe | — | — | jsdom / 実ブラウザとも違反なし ✓ |

## 手順メモ(今回わかったこと)

- Snackbar の specs は token-viewer が1つ・セットも「Snackbars」1つだけ(メニューは `check\nSnackbars` のみ)。
  elevation 行は SVG ではなく `.elevation-preview-block` の `box-shadow` として描画される(innerText には値が出ない)
- guidelines 本文の数値(「48dp to 64dp」)が token(68dp)と食い違う。本文の数値は token / Compose と照合してから使うこと
- Compose の Snackbar は `ComposeMaterial3Flags.isSnackbarStylingFixEnabled`(既定 false)で Legacy / fixed の2つのレイアウトを
  持つ。どちらと比べたかを明記すること
- `SnackbarTokens` の action 状態色・`IconSize` は `Snackbar.kt` から参照されず、実際の値は `TextButton` / `IconButton` の既定から
  来る。寸法は `Button.kt`(`TextButtonContentPadding` 12、`MinWidth` 58、`MinHeight` = small 40)まで読むこと
- 見た目だけの bar(host なし)のコンポーネントでは、キュー・タイミング・モーション・live region の挿入タイミングが丸ごと
  抜ける。jsdom テストも VRT も検出しない
