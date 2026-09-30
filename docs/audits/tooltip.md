# Tooltip 監査レポート(2026-09-30)

Phase B。`src/components/Tooltip/` の `Tooltip`(`variant: 'plain' | 'rich'`、`text` / `subhead` / `action`、
`placement: 'top' | 'bottom'`、`open` / `defaultOpen` / `onOpenChange`)を3ソースで突き合わせた:

1. **m3.material.io/components/tooltips/specs** + **/guidelines** + **/accessibility** — Playwright MCP で token-viewer
   (セットは「Tooltip - Plain」「Tooltip - Rich」の2つ)を visibility 表示のまま全展開して取得。寸法図2枚(plain / rich)と
   rich の Configurations 図(5構成)を原寸で取得して読んだ
2. **Compose androidx-main** — `Tooltip.kt`(`TooltipBox`、`TooltipScope.PlainTooltip` / `RichTooltip`、`TooltipDefaults`、
   `TooltipPositionProviderImpl`、`TooltipState`、caret、private レイアウト定数)、M3 が実際に import する
   `internal/BasicTooltip.kt`(ジェスチャ・hover・キー・semantics・`TooltipDuration`)、foundation の `BasicTooltip.kt`(照合のみ)、
   `tokens/PlainTooltipTokens.kt` / `RichTooltipTokens.kt`、`ShapeTokens` / `ElevationTokens` / `TypeScaleTokens` /
   `StandardMotionTokens` / `ExpressiveMotionTokens` / `MotionScheme.kt`、`ComposeMaterial3Flags.kt`(tooltip 関連フラグなし)
3. **実装** — `Tooltip.tsx`, `Tooltip.module.css`, テスト(7件、全通過)・ストーリー(Plain / Rich の2話、どちらも
   `defaultOpen`)。Storybook(dev)で `getBoundingClientRect` / computed style を実測、`page.mouse.move` で hover 経路、
   Tab / Escape、viewport 端への配置、`dir="rtl"`、実ブラウザで axe-core 4.10(tooltip を**開いた状態**)。jsdom でも一時テストで
   Tab / Escape / axe(開状態)を確認(テストは削除済み)

**共有実装について**: Tooltip はライブラリの `Ripple` / `FocusRing` / `useModal` を使わず、位置決めも CSS の
`position: absolute` だけ。Menu の flip(#54)は `Menu.tsx` 内の `useLayoutEffect` に**インライン実装**されており共有ユーティリティ
ではない — Tooltip は**再利用していない**(TT4 で抽出・共有を提案)。rich の `action` は呼び出し側のノード(ストーリーでは
`Button variant="text" size="xs"`)なので、action の状態レイヤー(hover 0.08 / focus 0.10 / pressed 0.10)は Button に従う。
IconButton の focus 0.10 欠落(#194)やスロット周り(#235 / #237 / #240 / #241)は Tooltip のコードには該当しない。

**前提 — Compose の API**: `rememberPlainTooltipPositionProvider` / `rememberRichTooltipPositionProvider` は**非推奨**(WARNING)で、
現行は `rememberTooltipPositionProvider(TooltipAnchorPosition.Above|Below|Left|Right|Start|End, spacing = 4.dp)`。
比較は現行 provider に対して行った(非推奨の rich provider は anchor の start 端に揃える配置)。

## 結論サマリ

**一致している(修正不要)**:

- **plain container**: **inverse-surface**(site `#322F35`、Compose `PlainTooltipTokens.ContainerColor`。実測 rgb(50,47,53))
- **plain supporting text**: **inverse-on-surface / body-small**(site 12 / 16 / 400 / 0.4、Compose `BodySmall`。
  実測 `12px / 16px`、`0.4px`、rgb(245,239,247))
- **plain 角丸 4dp**(site token、Compose `CornerExtraSmall`。実測 4px)、**elevation なし**(Compose `shadowElevation = 0`)
- **plain 高さ 24dp・左右 8dp・上下 4dp**(site 寸法図 24 / 8、Compose `sizeIn(minHeight = 24)` + `PlainTooltipContentPadding`
  8 / 4。実測 `padding: 4px 8px`、`min-height: 24px`)、**最大幅 200dp**(Compose `plainTooltipMaxWidth`)
- **rich container**: **surface-container**(site `#F3EDF7`、Compose `RichTooltipTokens.ContainerColor`)、**角丸 12dp**
  (site token、Compose `CornerMedium`。実測 12px)、**elevation level 2 = 3dp の影**(site token 3dp、Compose
  `shadowElevation = Level2`、`tonalElevation = 0`。実装 `--md-sys-elevation-shadow-level2`)。site の surface tint 行は
  warning 付き(廃止)で、Compose も tonal 0 なので対応不要
- **rich subhead**: **on-surface-variant / title-small**(14 / 20 / 500 / 0.1。実測一致)
- **rich supporting text**: **on-surface-variant / body-medium**(14 / 20 / 400、tracking 0.25 — 裁定参照。実測 0.25px)
- **rich action**: **primary / label-large**(site・Compose `ActionLabelTextColor` + `LabelLarge`。実装は `.action` に primary を置き、
  中身は呼び出し側の text Button)。action の hover 0.08 / focus 0.10 / pressed 0.10(site token)は Button 側に委ねられ一致
- **rich 左右 16dp**(site 寸法図、Compose 16)、**subhead → 本文 4dp**、**本文 → action 12dp**(site 寸法図。実測 4 / 12)、
  **最大幅 320dp・最小幅 40dp**(Compose `richTooltipMaxWidth` / `sizeIn(minWidth = 40)`)
- **anchor との距離 4dp**(site「If there's a visual boundary, like a button, the distance is 4dp」、Compose
  `SpacingBetweenTooltipAndAnchor` 4dp。実測 gapTop 4 / gapBottom 4)
- **plain の既定配置は上**(site「positioned directly above the parent element」、Compose 既定 `Above`)。**anchor の中央揃え**
  (Compose Above / Below は anchor 中央 → clamp。site desktop「centered below」)
- **hover で即時表示**(show delay なし: Compose `BasicTooltip` は pointer Enter で即 `show`、site も遅延を規定しない)、
  **フォーカスで表示・blur で非表示**(Compose focus 処理、site a11y「appear when … hovered or focused」)
- **`role="tooltip"`**(site a11y「The tooltip container should have the Tooltip role」)+ **`aria-describedby` を開いている間だけ付与**、
  閉じている間は `visibility: hidden` で支援技術から外れる
- **caret なし**(Compose `caretShape: Shape? = null` が既定 — caret は opt-in。site は caret に触れない)
- **`prefers-reduced-motion`**: scale を外して opacity のみ(Compose に該当概念はなく、Web の要件として妥当)
- **RTL**: 中央揃えなので anchor 中心と tooltip 中心が一致(実測 669.5 / 669.5)、rich は `text-align: start` で右揃え、
  action も右端から 16px
- **HTML 属性パススルー**(#6 で修正済み。ルート `<span>` に `id` / `data-*` / `aria-*` / `style`)
- **axe**: jsdom・実ブラウザとも plain / rich を開いた状態で違反なし(ただし TT1 の構造的問題は axe では検出されない)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| TT1 | **rich tooltip の action にキーボードで到達できない** | trigger の `onBlur` が無条件に `setOpen(false)`。Tab で action へ移ると tooltip が閉じ(`visibility: hidden`)、**フォーカスが `<body>` に落ちる**(実測: 2回目の Tab 後 `activeElement = BODY`、jsdom でも open クラスが外れる)。操作可能な要素を含むのに `role="tooltip"` のまま | site a11y「**Tab — Focus lands on button, if available**」「Focus order within the rich tooltip moves top to bottom between interactive elements」「Avoid trapping … focus」。Compose: `hasAction = true` のとき、表示中の **Tab で popup を focusable にしてフォーカスを tooltip 内へ移す**、TalkBack / Switch Access 有効時は常に focusable、`isPersistent` は「actionable content があるなら true」(KDoc)。→ フォーカスが wrapper(trigger + tooltip)内にある間は閉じない(`focusout` の `relatedTarget` 判定)。action を含む rich の role は APG の tooltip(操作要素を含まない)から外れるので、非モーダルの `role="dialog"`(+ `aria-labelledby` = subhead)等にするか判断が要る | 高 |
| TT2 | **WCAG 1.4.13(hover / focus で出る内容)を満たさない — hoverable / dismissible / 1.5 秒の猶予** | (a) plain は `pointer-events: none` で、pointer を tooltip 上へ動かすと trigger の `mouseleave` で即閉じる(実測)。(b) Escape は wrapper の `onKeyDown` だけで処理 — **hover だけで開いてフォーカスが別の場所にあると Escape で閉じない**(実測 / jsdom とも)。(c) `mouseleave` / `blur` で即時に閉じ、猶予がない | site guidelines「Both plain and rich tooltips **disappear 1.5 seconds after navigating away from the target region**」、a11y「Plain tooltips should **remain on the screen temporarily after the cursor moves away**」「remain on screen long enough for people to receive the information」。Compose `BasicTooltipDefaults.TooltipDuration = 1500L`、Escape(KeyDown)で dismiss。WCAG 1.4.13: pointer を内容の上へ動かしても消えない(hoverable)、pointer / focus を動かさずに消せる(dismissible — 通常 Escape)。→ leave / blur 後 1500ms で閉じる(tooltip 上へ入ったらキャンセル)、plain も tooltip 上の hover を保持、表示中は document レベルで Escape を拾う | 高 |
| TT3 | **tooltip の幅が anchor の幅に潰れる(短い plain が折り返す)。plain の最小幅 40dp と左揃えも欠落** | `.wrapper` が `position: relative; display: inline-flex` で、`position: absolute` の tooltip は**包含ブロック(= trigger 幅)で shrink-to-fit** する。実測: Plain ストーリー「Add to favorites」が **66px 幅・2行・40px 高**(trigger 40px)、Rich は **128px 幅・220px 高**(本文が約6行)。plain に `min-width` なし、plain 本文は `text-align: center` | 幅は内容に合わせて最大幅まで伸びる: Compose `sizeIn(minWidth = 40, maxWidth = 200 / 320, minHeight = 24)`(popup は anchor 幅に制約されない)。site 寸法図: 1行の plain「Save to favorites」は 1行・24dp、複数行の plain は**左揃え**で折り返す(Compose `Text` の既定 = start)。guidelines「Avoid wrapping text to multiple lines」。→ `width: max-content`(上限 `max-width`)、plain に `min-width: 40px`、plain 本文 `text-align: start` | 高 |
| TT4 | **viewport の端で flip も clamp もしない(はみ出す・祖先の overflow で切れる)** | CSS だけの `top` / `bottom` + `left: 50%`。実測: Plain ストーリーでも tooltip 上端が **-4px**(viewport 上に切れる)、trigger を画面下端に置くと rich は **604〜824px(viewport 600px)で完全に画面外**、上端に置いて top にすると -224px。portal ではないので `overflow: hidden` の祖先内では切り取られる。Menu の flip(#54)は Menu 内にインライン実装で再利用されていない | Compose `TooltipPositionProviderImpl`: Above は `anchor.top - height - 4dp` が < 0 なら **Below に flip**、x は anchor 中央から **`coerceIn(0, window.width - popup.width)` で clamp**、y も clamp。popup は window 直下(`clippingEnabled = false`)。site「They **adjust position to avoid going off screen**」「adjusts in increments of 8dp」「Tooltips shouldn't cover the parent element」。→ 開いたときに実測して flip + clamp(Menu の #54 のロジックを共有ユーティリティへ抽出して両方で使う)、祖先の clipping を避けるなら `position: fixed` / portal / Popover API | 中 |
| TT5 | **rich tooltip の上下 padding が spec と違う(上 16 → 12、action ありの下 16 → 8)、action 行の最小高 36dp がない** | `.tooltip[data-variant='rich'] { padding: 16px }`、`.action { margin-top: 12px }` のみ。実測: subhead 上端まで **16px**、action ボタン下端から container 下端まで **16px**(xs Button 32px) | site 寸法図: **上 12 / subhead→本文 4 / 本文→action 12 / 下 8**、左右 16。Compose: title `paddingFromBaseline(top = 28dp)`(= 行ボックス上端まで約 13dp)、action 行 `requiredHeightIn(min = 36dp)` + **bottom 8dp**。→ 上 12、action ありの下 8 + action 行 `min-height: 36px`(action なしの下 padding は Compose の本文 bottom 16 と実装が一致 — 変えない) | 中 |
| TT6 | **persistent rich tooltip(クリックで開き、別の UI を操作するまで残る)がない** | 開閉は hover / focus / Escape と controlled `open` のみ。クリック起動・外側クリックでの dismiss・「hover では開かない」モードがない | site guidelines「Persistent rich tooltips only appear when **clicked or tapped**」「remain active even when leaving the target region. They only disappear once a person **interacts with another UI element**. **Hovering doesn't trigger** the tooltip」、「The page loads and a new feature is being explained」でも表示。Compose `TooltipState(isPersistent = …)`: persistent なら hover exit / タイムアウトで閉じず、popup の `onDismissRequest`(外側クリック)で `dismiss()`。→ `persistent`(または `trigger="click"`)相当の prop を追加する API 判断(A3 の `open` / `onOpenChange` 命名は維持) | 中 |
| TT7 | **タッチの long-press 起動がなく、複数の tooltip が同時に開きうる** | タッチ専用の処理なし(モバイルブラウザの互換 `mouseenter` でタップ時に開き、別の場所をタップするまで残る)。各インスタンスが独立した state で、hover 中の tooltip と focus 中の別 tooltip が同時に開く | site「**tap and hold** the element on mobile」「**Triggering a new tooltip immediately closes any other open tooltip**」「Don't — Only display one tooltip at a time」。Compose: touch / stylus の long-press(`longPressTimeoutMillis`)で `show`、指を離すと閉じ、release を consume して子の click を発火させない。`GlobalMutatorMutex` で**新しい show が他を dismiss**。→ `pointerType === 'touch'` の long-press で開く(release で閉じる/猶予)、モジュールスコープの「現在開いている tooltip」で他を閉じる | 中 |
| TT8 | **表示モーションが Compose と違う(scale 0.9、anchor 側を原点、100ms tween)** | `transform: scale(0.9) → 1`、`transform-origin: center bottom`(bottom 配置は center top)、opacity / transform とも **100ms `easing-standard`** | Compose `animateTooltip`: scale **0.8 → 1**(`FastSpatial` spring: standard 0.9 / 1400、expressive 0.6 / 800)、alpha 0 → 1(`FastEffects` spring 1.0 / 3800)、`graphicsLayer` で transformOrigin 指定なし = **中心**。enter / exit 同一。site は tooltip のモーションを規定しない(矛盾なし)。→ scale 0.8、spring 相当の easing / duration(ライブラリの他の FastSpatial 実装に揃える)。原点は中心 | 低 |

Issue: TT1 → #257、TT2 → #258、TT3 + TT4 → #259(どちらも `.tooltip` の位置決め・サイズ決定部分を書き換えるため同梱)、
TT5 → #260、TT6 → #261、TT7 → #262、TT8 → #263
(TT1 / TT2 / TT7 はいずれも開閉ハンドラを触るので、修正 PR は順に積むこと — 各 issue に明記)

**軽微(判断・記録のみ)**:

- **rich の既定配置**: site は rich を「**bottom right** of the parent」(desktop は「centered below」も可)、Compose の現行 provider は
  plain / rich 共通で `Above` が既定(非推奨の rich provider は start 端揃え)。実装は variant に関係なく `placement='top'` が既定。
  site 優先なら rich の既定は下(中央 — desktop の記述と TT4 の clamp で足りる)。**VRT の Rich ストーリーは既に `placement="bottom"`**。
  既定値の変更は API の既定を変えるので TT3 + TT4 の issue で判断事項として挙げた
- **placement の種類**: Compose は Above / Below / Left / Right / Start / End。site は上 / 下(app bar 内は下)しか語らない。
  `'start' | 'end'` 追加は需要次第
- **anchor との距離 8dp**: site「If there's no visual boundary, like with text baselines, the distance is 8dp」。Compose は `spacing`
  引数(既定 4)。テキストの trigger 向けに距離の上書き手段(CSS 変数 `--_spacing` 等)を用意する程度でよい
- **app bar 内では下に出す**: site の記述。自動判定はせず `placement="bottom"` を使う旨を JSDoc で示す
- **action は最大2つ**: site「Rich tooltips can have up to two text buttons」「Keep buttons short so they can be side by side」。
  実装の `action` は単一ノードでフラグメントも入るが、`.action` に flex / gap がない。2つ並べた時の配置(Configurations 図は
  左寄せ・横並び)を TT5 の修正で `display: flex; gap` として整える
- **rich で subhead も action もない場合**: Compose は本文に**上下 4dp だけ**の padding(`PlainTooltipVerticalPadding`)を付ける
  特殊経路を持つ。site の構成図 3(subhead + 本文、action なし)は通常の padding。site 優先で実装(16)を維持
- **plain tooltip の役割と名前**: site は plain を「icon-only buttons のラベル」に使うよう勧める。実装は `aria-describedby`
  (説明)で、名前は trigger の `aria-label` から来る。Plain ストーリーは `aria-label="Info"` + tooltip「Add to favorites」で名前と
  説明が食い違っている — ストーリーを揃える(`aria-labelledby` にするかは APG 準拠の describedby を維持)
- **Compose の `liveRegion = Assertive` / `paneTitle`**: Android の TalkBack 向け(`TODO(b/496338253)` の回避策を含む)。
  Web は `aria-describedby` で十分で、live region にはしない
- **focus で開いた tooltip の自動消去(Compose は 1500ms で閉じる)**: WCAG 1.4.13 の persistent(dismiss / blur まで残る)に
  反するので Web では採らない(裁定参照)
- **caret**: Compose は opt-in(16×8dp、`TooltipDefaults.caretShape()`)。site は触れない。需要が出たら追加
- **component token 名**: CSS が `--_container-color` 等の private token を使わず system token を直書き(CLAUDE.md の CSS 規約)。
  TT3 / TT5 の書き換え時に `--_*` へ寄せる
- **ストーリーのカバレッジ**: 画面端、RTL、長文、action 2つ、persistent、hover / focus の遷移がない。各修正 PR で足すこと

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| leave 後の消え方 | 「disappear **1.5 seconds** after navigating away from the target region」、a11y「remain on the screen temporarily after the cursor moves away」 | hover exit で**即** `dismiss()`。1500ms は focus / long-press で開いた非 persistent tooltip の**自動消去**タイムアウト | site が上位 → **leave / blur 後 1.5 秒で閉じる**(TT2)。Compose の「focus で開いて 1.5 秒で自動消去」は WCAG 1.4.13 の persistent に反するので採らない |
| rich の既定配置 | bottom right(desktop は centered below 可) | 現行 `rememberTooltipPositionProvider` は `Above` 既定(非推奨の rich provider は start 揃え) | site 優先で rich は**下**が既定、ただし既定値の変更は API 判断(軽微欄 / TT3 + TT4 の issue で判断) |
| 位置調整の単位 | 「adjusts in increments of **8dp**」 | 連続値で clamp(`coerceIn`) | 8dp 刻みは視覚上の指針と判断し、**clamp**(TT4)。8dp の画面端マージンを取るかは実装時に判断 |
| body-medium tracking | rich supporting text **0.25pt** | `TypeScaleTokens.BodyMediumTracking` **0.2sp** | site が上位 → **0.25**(実装・`tokens.css` どおり) |
| rich の縦の余白 | 上 12 / subhead→本文 4 / 本文→action 12 / 下 8 | baseline 基準: title 28(上端 ≈ 13)、本文 `paddingFromBaseline(24)`(subhead→本文 ≈ 9)、本文 bottom 16、action 行 min 36 + bottom 8 | 上・下・action 行は両者ほぼ一致 → **上 12 / 下 8 / 行 36**(TT5)。subhead→本文と本文→action は site の **4 / 12**(実装どおり)を採る |
| rich の action 状態 token | hover 0.08 / focus 0.10 / pressed 0.10(primary) | `RichTooltipTokens` に `Action{Hover,Focus,Pressed}LabelTextColor` はあるが `RichTooltip` は読まず、呼び出し側の `TextButton` 任せ | 値は一致 → action は**ライブラリの text Button に委ねる**(実装どおり) |
| surface tint | token 行あり(warning = 廃止) | `tonalElevation = 0` | 廃止行 → **tint なし**(実装どおり) |
| anchor の semantics | a11y「Tooltip role」 | anchor に `onLongClick` アクション、popup に `liveRegion = Assertive` / `paneTitle`(TODO b/496338253)。describedby 相当なし | Web は **`role="tooltip"` + `aria-describedby`**(APG)。Compose の live region は Android 固有の回避策 |
| action を含む rich の role | 「Tooltip role, **or similar**」、フォーカスは内部へ移れるがトラップしない | `hasAction` で focusable popup | site の「or similar」の範囲で、操作要素を含む rich は **非モーダル dialog 相当**を検討(TT1 の issue で判断) |
| `isPersistent` の既定 | persistent はクリック起動・hover では開かない | `rememberTooltipState` は false、`TooltipState(...)` と `rememberBasicTooltipState` は **true**(不一致) | Web は **既定 false(transient)**、persistent は明示 opt-in(TT6) |
| show delay | 記述なし | hover は即時 | 一致 → **即時**(実装どおり) |
| モーション | 仕様ページに記述なし | scale 0.8↔1(FastSpatial)+ alpha(FastEffects)、中心原点 | Compose に従う(TT8)。Expressive スキームの FastSpatial は 0.6 / 800 |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| plain 高さ | 24 | min 24 | min 24 ✓ |
| plain padding(左右 / 上下) | 8 / — | 8 / 4 | 8 / 4 ✓ |
| plain 最小幅 / 最大幅 | — | 40 / 200 | **なし** / 200(**TT3**) |
| plain 幅の決まり方 | 1行は1行(寸法図) | 内容幅(anchor に非依存) | **anchor 幅で shrink-to-fit ✗ TT3**(実測 66px・2行) |
| rich 左右 | 16 | 16 | 16 ✓ |
| rich 上 | 12 | baseline 28(≈ 13) | **16 ✗ TT5** |
| rich subhead → 本文 | 4 | ≈ 9(baseline 24) | 4 ✓(裁定) |
| rich 本文 → action | 12 | 16(本文 bottom) | 12 ✓(裁定) |
| rich action 行 | —(寸法図の行) | min 36 | **なし ✗ TT5** |
| rich 下(action あり) | 8 | 8 | **16 ✗ TT5** |
| rich 下(action なし) | —(構成図 3) | 16(本文 bottom) | 16 ✓ |
| rich 最小幅 / 最大幅 | — | 40 / 320 | 40 / 320 ✓(ただし **TT3** で実幅は 128px) |
| anchor との距離 | 4(境界あり)/ 8(境界なし) | 4(`spacing` 引数) | 4 ✓ |
| caret | — | opt-in 16×8 | なし ✓ |

### シェイプ・色・タイポ・elevation

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| plain container | inverse-surface | InverseSurface | ✓ |
| plain text | inverse-on-surface / body-small 12/16/0.4/400 | InverseOnSurface / BodySmall | ✓ |
| plain 角丸 | 4 | CornerExtraSmall 4 | 4px ✓ |
| plain 本文揃え | 左揃え(複数行の寸法図) | start(`Text` 既定) | **center ✗ TT3** |
| rich container | surface-container | SurfaceContainer | ✓ |
| rich 角丸 | 12 | CornerMedium 12 | 12px ✓ |
| rich elevation | 3dp(level 2)、tint 行は廃止 | shadow Level2、tonal 0 | shadow-level2 ✓ |
| rich subhead | on-surface-variant / title-small 14/20/0.1/500 | OnSurfaceVariant / TitleSmall | ✓ |
| rich 本文 | on-surface-variant / body-medium 14/20/0.25/400 | OnSurfaceVariant / BodyMedium(0.2) | ✓(0.25) |
| rich action | primary / label-large、hover 0.08 / focus 0.10 / pressed 0.10 | Primary / LabelLarge(状態は TextButton) | primary + 呼び出し側 Button ✓ |

### 挙動・位置・モーション・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| hover で表示 | ✓(desktop) | 即時 | 即時 ✓ |
| focus で表示 | ✓ | ✓(1.5s で自動消去) | ✓(自動消去なし — 裁定) |
| leave 後の猶予 | 1.5 秒 | 即時 | **即時 ✗ TT2** |
| tooltip 上の hover 保持 | —(WCAG 1.4.13) | — | rich のみ、**plain ✗ TT2** |
| Escape | —(WCAG 1.4.13) | ✓ | focus が wrapper 内の時だけ、**hover のみ ✗ TT2** |
| タッチ | tap and hold | long-press | **なし ✗ TT7** |
| 同時表示 | 1つだけ | `GlobalMutatorMutex` | **複数可 ✗ TT7** |
| persistent rich | クリック起動、他の操作まで残る | `isPersistent` + 外側クリックで dismiss | **なし ✗ TT6** |
| rich action へのフォーカス | Tab で button へ、トラップしない | `hasAction` で Tab 時に focusable | **閉じて body へ落ちる ✗ TT1** |
| 画面端 | 画面外を避ける(8dp 刻み) | flip + clamp | **なし ✗ TT4**(実測 -4px / 画面外) |
| 祖先の clipping | — | window 直下の popup | absolute のため切れる(TT4) |
| RTL | — | Start / End を反転 | 中央揃え・start 揃えで破綻なし ✓ |
| モーション | — | scale 0.8 + alpha(spring)、中心 | **scale 0.9、100ms、anchor 側原点 ✗ TT8**(VRT は reduced motion + アニメ無効で撮るので見えない) |
| reduced motion | — | — | opacity のみ ✓ |
| role / 関連付け | Tooltip role | liveRegion / paneTitle(Android) | `role="tooltip"` + `aria-describedby`(開いている間)✓ |
| axe(開状態) | — | — | jsdom / 実ブラウザとも違反なし ✓ |

## 手順メモ(今回わかったこと)

- Tooltip の specs は token-viewer が1つでセットが「Tooltip - Plain」「Tooltip - Rich」の2つ。rich の elevation は `3dp` として
  innerText に出る(`.elevation-preview-block` はなし)。surface tint 行に warning が付く
- m3 の timing(「1.5 秒後に消える」)は guidelines の Behavior 節にしかなく、specs の token には出ない。Compose の 1500ms は
  **意味が違う**(focus / long-press の自動消去)ので、数値の一致だけで一致と判断しないこと
- CSS だけで位置決めするポップアップは、`position: absolute` の包含ブロックが狭い trigger の wrapper になると **shrink-to-fit で
  幅が潰れる**。jsdom テストでも axe でも検出されず、`getBoundingClientRect` の実測でしか分からない
- hover 経路を `page.mouse.move` で試すときは trigger の 48dp タッチターゲット(`::before`)が anchor の外まで広がっている点に注意
  (rich の Button trigger では 4px の隙間が `::before` に覆われていて、隙間で閉じる問題が観測されない)
- Compose の tooltip 挙動の本体は `material3/.../internal/BasicTooltip.kt`(M3 が import する方)にある。foundation 版は照合用
