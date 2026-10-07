# Carousel 監査レポート(2026-09-30)

Phase B。`src/components/Carousel/` の `Carousel`(`variant`: multi-browse / uncontained / hero、`itemWidth` / `itemHeight` /
`spacing`)と `CarouselItem` を3ソースで突き合わせた:

1. **m3.material.io/components/carousel/specs** + **/accessibility** + **/guidelines** — Playwright MCP で token-viewer
   (セットは「Carousel item」の1つだけ)を visibility 表示のまま全展開して取得。Measurements は画像のみのため、寸法図
   (multi-browse / hero / small item 40–56dp)と色図を原寸で取得して読んだ。uncontained / center-aligned hero / full-screen は
   本文の属性表で確認
2. **Compose androidx-main** — `carousel/` ディレクトリ全9ファイル(`Carousel.kt`(`HorizontalMultiBrowseCarousel` /
   `HorizontalUncontainedCarousel` / `HorizontalCenteredHeroCarousel`、`CarouselDefaults`、`Modifier.carouselItem`)、
   `Keylines.kt`、`KeylineList.kt`、`Arrangement.kt`、`Strategy.kt`、`KeylineSnapPosition.kt`、`CarouselState.kt`、
   `CarouselItemScope.kt`、`CarouselParallaxScrollEffect.kt`)、`tokens/ShapeTokens.kt`、`Shapes.kt`、`CarouselSamples.kt`。
   **`CarouselTokens` は存在しない**(token 層がなく、値はすべて `CarouselDefaults` のハードコード)
3. **実装** — `Carousel.tsx`, `Carousel.module.css`, テスト(6件、全通過)・ストーリー(3話)。Storybook(dev、viewport 700px、
   carousel 幅 605px)で全ストーリーの `getBoundingClientRect` / computed opacity・transform を複数のスクロール位置で実測、
   `dir="rtl"`、`prefers-reduced-motion: reduce`、キーボード操作(item 内に `<button>` を注入した場合も)、実ブラウザで
   axe-core 4.10

**共有実装について**: `Carousel` は `role="group"` + `aria-roledescription="carousel"` の横スクロール `<div>`(CSS
scroll-snap)で、`CarouselItem` は素の `<div>`。Ripple / FocusRing / state layer は一切使っておらず、キーハンドラもない。
したがって focus state layer 0.10 の欠落(#194)も、クリック可能なコンテナでの入れ子キー横取り(Card #216 / List #226)も
**現状では該当しない**。ただし CR5(item のインタラクティブ化)・CR6(矢印キー)を実装する時には、この2つの教訓を
そのまま適用すること(各 issue に明記)。

**前提 — レイアウトの対応**: m3.material.io は layout を **Multi-browse / Uncontained(+ multi-aspect ratio)/ Hero
(+ center-aligned)/ Full-screen** とする。Compose が公開するのは **multi-browse / uncontained / centered hero の3つ**だけで、
start 寄せの hero と full-screen(縦)は公開 API がない(内部の `Carousel()` は `VerticalPager` を持つが非公開)。
multi-aspect は実験的な `Modifier.carouselParallaxScrollEffect`(LazyRow 用)。CLAUDE.md の「どの variant が存在するかは
Compose が決める」に従い、3 variant の現構成を前提に監査した(full-screen 等は軽微欄)。

## 結論サマリ

**一致している(修正不要)**:

- **padding**: 左右 **16dp**・上下 **8dp**(site 全 layout の属性表 + 寸法図 16 | … | 16、8 / 8。Compose は既定 0dp で
  サンプルが `PaddingValues(horizontal = 16.dp)` — 裁定参照。実測 `padding: 8px 16px`、`scroll-padding-inline: 16px`)
- **item 間隔**: **8dp**(site「Padding between elements 8dp」+ 寸法図。Compose 既定 `ItemSpacing = 0.dp`、サンプル 8dp —
  裁定参照。実装 `gap: 8px`、`spacing` prop で変更可)
- **item の角丸**: **28dp = extra-large**(site「Item corner radius 28dp」+ token `container shape` 28dp、Compose サンプル
  `MaterialTheme.shapes.extraLarge` = `ShapeTokens.CornerExtraLarge` 28dp。実測 28px)。ただし縮小時の角丸は CR1
- **縦位置**: 「Vertically centered」(実装 `align-items: center`)
- **container 色**: **surface**(site Color「Container: Surface」+ 色図。実測 rgb(253,247,255))。Compose は色を持たない
- **container 自体は非インタラクティブ**・item は **overflow: hidden** で中身(画像)をクリップ(`.item > img` は cover)
- **multi-browse / hero の snap**: snap-scrolling(site「Recommended for multi-browse, hero, and full-screen」、Compose
  `singleAdvanceFlingBehavior`。実装 `scroll-snap-type: x mandatory`)。hero の snap が中央(`scroll-snap-align: center`)なのは
  Compose `HorizontalCenteredHeroCarousel`(先頭 item は start、末尾は end に寄る)と同じ挙動
- **自動回転なし**(site / Compose とも自動送りの概念なし。APG の rotation control 要件は不要)
- **item 内のフォーカス可能要素**: Tab で順に到達し、ブラウザが scroll-into-view + snap で可視域へ送る(ただし CR6)
- **aria-roledescription="carousel"** + 利用者指定の `aria-label`(site「The carousel container is labelled appropriately」、
  Compose `Role.Carousel`、APG carousel pattern)
- **RTL**: DOM 順どおり右から並ぶ(実測 item 0 が右端)。ただし mask の計算は CR3
- **axe(jsdom)**: 違反なし(実ブラウザでは CR5 参照)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| CR1 | **keyline(large / medium / small)レイアウトがなく、item を scale + 半透明にしているだけ** | 全 item が `itemWidth`(260px)固定幅。focus 帯(padding 内側)からはみ出た割合で `transform: scale(0.82〜1)` + `opacity(0.5〜1)`。実測 multi-browse(605px): 16 \| **260** \| 8 \| **260** \| 次の item は x=575 で右端に **30px だけ見切れ**、scale 0.82・opacity **0.5**・高さ **164px**。medium / small(40–56dp)は存在しない。hero(`itemWidth` 420): 2つ目の item が **363px 幅で半分見切れ**・opacity 0.625 | site: 「Carousel items must be fully visible on-screen (except for the uncontained layout). When scrolled, items automatically change size and snap into place」、multi-browse は **large + medium + small(40–56dp)** を 16 \| L \| 8 \| M \| 8 \| S \| 16 に収める(寸法図)、hero は **large + small**(16 \| L \| 8 \| S \| 16)、縮んだ item も**高さは同じ・角丸 28dp のまま**(寸法図・small item 図)。Compose: item は常に large 幅で配置し、keyline 間を線形補間した幅で**矩形 mask(クリップ)**+ 平行移動、`maskClip(shape)` で角丸は dp 一定。`multiBrowseKeylineList`: `small = (large/3).coerceIn(40, 56)`、`medium = (large+small)/2`、large 個数は `floor((W − M − Smax)/L)`〜`ceil(W/L)` を試し最小コスト配置を選ぶ、large は `(W − (nS + nM/2)·S)/(nL + nM/2)` で可用幅にフィット(medium は ±10% flex)。`heroKeylineList`: medium なし、small 1(centered は 2)。**opacity のフェードはどちらのソースにもない** | 高 |
| CR2 | **uncontained の item が縮小・半透明になり、snap もする** | uncontained でも CR1 と同じ mask が掛かる。実測(`itemWidth` 200): 3つ目 185px / opacity 0.79、4つ目以降 164px / **0.5**。`scroll-snap-type: x mandatory`(start snap) | site: 「items are a single size and flow past the edge of the screen」「Since items don't change size …」「Default: Standard scrolling. **Recommended for uncontained layouts**」。Compose: `HorizontalUncontainedCarousel` の既定 fling は `noSnapFlingBehavior()`(decay のみ)、item は `itemWidth` 固定(`uncontainedKeylineList` の medium は端で切れる1枚の parallax 用 — 裁定参照)。→ uncontained は**サイズ・不透明度を変えず、既定は snap なし** | 中 |
| CR3 | **mask の位置計算が scroller のページ上の位置だけずれる(RTL で顕著)** | `applyMask` が `el.offsetLeft - scroller.scrollLeft` を使うが、scroller は positioned でないため `offsetLeft` は **offsetParent(body)基準**。ストーリーでは scroller が x=40 にあり、全 item の判定が **40px 右にずれる**(LTR 実測: scrollLeft 268 で完全に画面外の item 0 が opacity 0.56 / scale 0.84 と判定)。RTL(`dir="rtl"`)では**スナップ位置の先頭 item 自体が scale 0.97・opacity 0.915 で描画**される | mask はスクロールコンテナ座標で計算すること(`getBoundingClientRect` の差分、または scroller を `position: relative` にする)。site / Compose とも focal item は常にフルサイズ(Compose は RTL で `translationX` を反転するだけ)。CR1 で mask を作り直す時に同時に直る | 中 |
| CR4 | **reduced motion でも item が縮小・半透明のまま** | `@media (prefers-reduced-motion: reduce)` は `transition` を切るだけ。実測(reduce): 3つ目以降 scale 0.82・opacity 0.5 | site a11y「When reduced motion settings are turned on, the parallax effect should be removed and carousel items should no longer expand as they come into view. **All items are the same size.** Make sure carousels with reduced motion reach the edges of the window」「For hero carousels with reduced motion, the small carousel item is only partially shown on screen」。→ reduce 時は keyline mask を無効にして全 item 同寸・端まで流す(hero は次の item が見切れる形)。Compose に該当処理はない(矛盾なし) | 中 |
| CR5 | **item が操作・フォーカスできず、状態表現もない** | `CarouselItem` は素の `<div>`(`tabIndex` なし、`onClick` は div に落ちるだけ、Ripple / FocusRing / state layer なし)。実ブラウザ: Tab で **carousel container 自体にフォーカス**(Chrome の keyboard-focusable scroller)。axe-core(実ブラウザ)**`scrollable-region-focusable`** 違反(jsdom では出ない) | site a11y: use cases「Navigate between different carousel items」「**Activate a carousel item**」、「use Tab to place initial focus on the **first carousel item**」「**Avoid focusing on the carousel container**」、キー「Space or Enter — Activates the focused carousel item」、Interaction「Tapping on a carousel item **changes the shape slightly**, and creates a touch ripple」「The hover state provides a visual cue that the carousel item is interactive」。token: hover state layer on-surface **0.08** + container elevation **1dp**、focus state layer on-surface **0.10** + focus indicator secondary **3dp** / offset 2dp、pressed on-surface **0.10**、disabled container opacity 0.38。Compose は item を `Modifier.clickable` / `maskClip` で呼び出し側が作る(サンプルは clickable 付き)。→ Web では `CarouselItem` に `onClick` / `href`(ボタン / リンク化)を持たせる API 判断が必要。Card #216 / List #226 の入れ子キー横取り対策、#194 の focus 0.10 を最初から入れること | 中 |
| CR6 | **矢印キーで item 間を移動できず、フォーカスした item が focal 位置に来ない** | キーハンドラなし(ArrowRight は container のネイティブスクロール 268px になるだけ)。item 内 `<button>` を Tab で辿ると、3つ目(x=575、30px だけ見えて opacity 0.5)に**フォーカスが入ってもスクロールしない**(ブラウザは一部可視と判断)→ フォーカス中の item が半透明・見切れのまま | site a11y「use **Tab or the arrow keys** to navigate the carousel items」「Use the **up and down arrow keys to leave the carousel** and focus on the next element on the page」、キー表「Tab or Arrows — Moves to the previous or next carousel item」。WCAG 2.4.11(Focus Not Obscured)。Compose は Pager 上に構築され、フォーカス移動で該当ページへスクロールする(Pager のフォーカス処理は foundation 側 — 未取得)。→ item フォーカス時に focal(large)位置へ snap スクロール、Left / Right(RTL 反転)で前後の item、Up / Down は横取りしない(ブラウザ既定の順次移動に委ねる)。入れ子の入力要素のキーは横取りしない(#216 / #226 の教訓) | 中 |
| CR7 | **item に「n / 全体」のラベル・slide semantics がない** | item は role なし・名前なし。スクリーンリーダーは「carousel, Photos」の後に中身を平読みするだけ | site a11y「Each carousel may have a different number of items, so **the label reads out the total amount of items and the current item in focus**」「The carousel item label indicates the current item in focus and the total number of items」。WAI-ARIA APG carousel: 各 slide は `role="group"` + `aria-roledescription="slide"` + `aria-label="n of m"`。Compose は `Role.Carousel`(item 数は Pager の collection semantics — foundation 側、未取得)。→ `CarouselItem` に `role="group"` / `aria-roledescription="slide"` と既定の「n of m」ラベル(上書き可、i18n 可能に)を付与 | 中 |

Issue: CR1 + CR2 + CR3 → #245(いずれも `applyMask` と `.item` の transform / opacity を keyline mask に置き換える同一箇所のため同梱)、
CR4 → #246、CR5 → #247、CR6 → #248、CR7 → #249
(focus state layer 0.10 は #194、入れ子キー横取りは #216 / #226 を CR5 / CR6 の issue で参照 — 重複起票しない)

**軽微(判断・記録のみ)**:

- **item の既定色**: site token は item container **surface** + outline **1dp outline**(hover / focus / pressed でも outline 行あり)。
  実装は **surface-container-high**・outline なし。Compose は色も枠も持たない(画像で埋まる前提)。色図の点線は注釈で、
  surface の container に surface の item を置くと空 item は見えなくなる → 実装のプレースホルダ色で良い。token の
  outline は CR5 の状態設計時に要否を判断
- **item の hover elevation 1dp**: token のみ(Compose なし)。CR5 の状態設計で扱う
- **full-screen layout**: site にはある(縦スクロール・padding 0・item 間 16dp・snap 必須)が Compose に公開 API がない →
  追加しない。必要になったら API 判断
- **start 寄せ hero と center-aligned hero**: site は両方、Compose は centered のみ。実装の `hero` は中央 snap(Compose 相当)
  なのに JSDoc は「centres one large item with a peek of the next」で片側 peek の説明 — CR1 で hero keyline を作る時に
  「centered hero(small 2つ)」か「hero(small 1つ)」かを決め、JSDoc を合わせる
- **uncontained の trailing padding**: site 属性表は「Leading padding 16dp」のみ(item は右端へ流れる)。実装は末尾にも 16px
  あるが、スクロール末端でのみ見える余白で見た目への影響は小さい
- **uncontained multi-aspect ratio**: Compose は実験 API。`CarouselItem` の `style.width` で各幅を与えれば近いものは作れる。
  CR1 の mask 実装が item 幅の不揃いを許すかは実装時に確認
- **「Show all」ボタン / 見出しの矢印ボタン**: site a11y の「On vertically-scrolling pages, carousels require an accessible way to
  view all the items without horizontally scrolling」はアプリ側の構成要件(Compose も持たない)。JSDoc / ストーリーで推奨を示す
  → **対応済み(#374)**: JSDoc・ストーリー `ShowAll`・サイト docs「Scrolling with a mouse, wheel and keyboard」で Show all を推奨
- **`aria-label` 必須化**: 型では任意。名前がないと `group` が無名になる。JSDoc で必須と書く(型で強制するほどではない)
- **container role の表記**: site「The carousel container has the container role」は抽象的。`group` + roledescription は APG と
  一致(`region` は landmark が増えるため採らない)
- **snap の強さ**: Compose multi-browse / hero は `PagerSnapDistance.atMost(1)`(1 フリングで最大1 item)。CSS の
  `scroll-snap-stop: always` 相当だが Web のホイール / トラックパッドでは過剰に重くなりうる → 採らない。
  ただしマウスドラッグ(#374、JS 制御)の release は Compose どおり**押下時の item から最大 ±1 item**
- **snap アニメーションの spring**(`StiffnessMediumLow`): Web はネイティブ snap に任せる(`scroll-behavior` / reduced motion は
  ブラウザ既定)。マウスドラッグの release も `scrollTo({ behavior: 'smooth' })`(ブラウザの snap と同じ曲線、
  reduced motion は即時)で揃える — touch と同じ見え方を優先
- **mask の transition**: 実装は scroll に `transition: short2 linear` を重ねて追従が遅れる。CR1 で scroll 位置から直接算出する
  (Compose も補間は scroll offset の関数でアニメーションなし)。→ #245 で scroll イベントから算出、さらに #375 で
  compositor 駆動に変更(下記「修正」)
- **ストーリーのカバレッジ**: RTL、reduced motion、item 内テキスト / ボタン、画像 item、狭い幅(small が 40dp 未満になる幅)
  がない。CR1〜CR7 の修正 PR で足すこと

## 修正(#374 マウススクロール / #375 スクロール中のガタつき、2026-10-07)

### #375 — 方式の裁定: **案 A(ネイティブスクロール維持 + compositor 駆動の mask)を採用**

原因: #245 の mask は `onScroll` で全 item の `--_item-start` / `--_item-size` / `--_content-start` を書き、CSS が
`inset-inline-start` / `width`(レイアウトプロパティ)に変換していた。スクロール(特に touch の慣性)は compositor が
即座に動かすのに mask はメインスレッドで ≥1 フレーム遅れて追従するため、古い mask が剛体スクロールされては
次フレームで戻る =「行って戻る」ガタつき。uncontained は mask がないので滑らか。

| 検討 | 結論 |
|---|---|
| A-1: `clip-path: inset()` + `transform` を scroll-driven animation で | **不可**。Chromium 147 の trace(`blink.animations` の `Animation` イベント)で `clip-path` は `compositeFailed: 8192, unsupportedProperties: ["clip-path"]` — scroll-driven でも compositor に乗らず、mask の端がメインスレッドに残る(transform 単独は `compositeFailed: 0`) |
| **A-2: transform だけで mask(採用)** | item を「終端クリップ > 始端クリップ > item」の3層に分け、各層を `overflow: hidden` + 片側だけ角丸にして **translateX だけ**で動かす(終端クリップ = `start + size − L`、始端クリップ = `L − size`、item = `contentStart`)。keyline 補間(shift 領域は非線形)を `itemTrack()` が許容誤差 0.1px の区分線形キーフレームに標本化(粗グリッド + 二分 + 間引き、1 要素 5〜12 キーフレーム)し、`element.animate(frames, { timeline: new ScrollTimeline({ source, axis: 'inline' }) })` で compositor に渡す。RTL は ScrollTimeline の進捗が inline-start 起点(実測: `scrollLeft −250 / 1000` → 25%)なので符号だけ反転。trace で全アニメーション `compositeFailed: 0` |
| B: Pager 風に自前スクロール(transform トラック) | 不採用。A-2 でラグが消えるため不要。B はネイティブ慣性・トラックパッド / Shift+ホイール・ブラウザのフォーカス scroll-into-view・支援技術のスクロール操作を全部作り直す必要があり a11y リスクが大きい |

フォールバック: `ScrollTimeline` が無いブラウザ(Firefox、Safari 25 以前)は scroll イベントで **transform だけ**を書く
(レイアウトなし。compositor スクロール中は従来同様 1 フレーム遅れうるが、layout は発生しない)。Safari 26 は
scroll-driven animations を実装済み(MDN / caniuse)。WebKit がそれを compositor(threaded animation)で回すかは
本機で WebKit を実行できず未検証 — 回らなくても最悪フォールバックと同等で、レイアウトは発生しない。

補足の設計判断:
- **縁の描画**: 2 つのクリップはそれぞれ自分の側の角だけを丸め、item 自身の端は可視範囲の外に置く → 各辺のアンチエイリアスは1回
  (item の背景がにじまない)。幅 < 2 × 角丸の small item は JS が `--_corner-cap`(可視幅 / 2)で角丸を詰める(Compose /
  CSS の角丸縮小と同じピル形状。値が変わる時だけ書く、paint のみ)
- 完全に mask された item は始端クリップを 2px 余分にずらし、2 つのクリップ端のピクセルスナップ差で 1px の筋が残るのを防ぐ
- クリップ要素は `pointer-events: none`(画面外 item のクリップが隣の item に重なってクリックを奪うため)、item だけが受ける
- hover の elevation とフォーカスリングはクリップの外の `.frame`(可視ボックスに追従、hover / focus 中の slot だけ JS 更新)に移動。
  FocusRing は `composes: ring fill` + `:has(:focus-visible)`(選択系コントロールと同じ方式)
- 押下時の角丸変化は登録カスタムプロパティ `--_carousel-shape` を transition(角丸キャップの更新で transition が走らないように)
- マウスドラッグ中(メインスレッドで `scrollLeft` を書く)は scroll-driven animation を一時停止して inline transform で同一フレーム
  描画、release で再開(負荷時に compositor 側 mask が 1 フレーム遅れる現象を実測したため。再開直後の pending 中も inline を書く)

### #374 — マウス操作

- **ドラッグ**(`pointerType === 'mouse'`、主ボタン): 8px(Compose touch slop)を超えたらドラッグ開始。ポインタに追従し、release で
  速度(直近 100ms)から — snap 系(multi-browse / hero / reduced motion)は **400px/s(Compose `MinFlingVelocityDp`)以上で
  進行方向の次の snap 位置、未満なら最寄り、押下時の位置から最大 ±1 item**、uncontained は Android の spline decay(Compose
  `rememberSplineBasedDecay`)の到達距離まで snap なしで流す。ドラッグ中と settle 中はネイティブ snap を切り、着地後に戻す
- slop を超えたドラッグの後の click は capture で握りつぶす(`onClick` / `href` が発火・遷移しない)。押下中の ripple は
  pointercancel で解除、押下の角丸変化も出さない。item 内の入れ子のインタラクティブ要素(input・button 等)からは開始しない。
  touch / pen はネイティブスクロールのまま。画像・リンクのネイティブ drag は抑止
- カーソル: スクロール可能な時 `grab`、ドラッグ中 `grabbing`(item 上も)
- **縦ホイールは奪わない**(ページスクロールを優先)。opt-in の `wheelScroll` も**追加しない** — Shift + ホイールとトラックパッドの
  横スワイプはネイティブで動き、ホイールの横取りはページのスクロールを止めてしまう。代わりに m3 推奨の「Show all」を
  ストーリー `ShowAll` とサイト docs で示す

### 実測(headless Chromium 147、Storybook、viewport 700px)

`Page.startScreencast` で compositor の出力フレームを取り、各 item 色の可視範囲を走査線で追跡(rAF の
`getBoundingClientRect` はメインスレッドの状態しか見えず、旧実装でもズレを検出できない)。**zigzag** = ある辺が 3 フレーム以内に
前進→後退→前進した回数(ガタつき)。`load` = 毎フレーム 12ms のメインスレッド負荷(低速端末相当)。

| ケース | 旧(develop) | 新 |
|---|---|---|
| multi-browse touch fling(load 0 / 12) | zigzag 71 / 58、最大逆行 30px | 0 / 0 |
| hero touch fling(0 / 12) | 64 / 54、37px | 0 / 0 |
| narrow touch fling(0 / 12) | 82 / 77、30px | 0 / 0 |
| RTL touch fling | 67、30px | 0 |
| マウスドラッグ + release(multi-browse / hero / narrow / interactive / RTL、load 12) | (動かない) | zigzag 0、snap 位置に着地 |
| キーフレーム精度(全 scroll 位置 7px 刻み、厳密計算との差) | — | 最大 0.114px |

その他(実ブラウザ): 通常クリックで link item が遷移・button item が発火、ドラッグでは発火しない、slop 未満の移動はクリック、
入れ子の button からドラッグしない、縦ホイールで scrollLeft 不変(ページが動く)、横ホイールはネイティブで snap、
uncontained の fling は 160px のドラッグで 220px 進んで snap なし、reduced motion は全 item 同寸・アニメーションなし・release 即時、
RTL は右ドラッグで前進して右端に snap、矢印キー / フォーカスの scroll-into-view は従来どおり、hover の elevation と
フォーカスリングは mask された item の可視ボックスに一致、axe-core(実ブラウザ)全ストーリー違反 0。
静止時の見た目: reduced motion(VRT の撮影条件)は旧と同一(差 ≤ 4px・角の AA のみ)。motion 有効時は mask 端が
小数位置のまま AA される(旧はレイアウトの整数スナップ)ため縁の 1px が僅かに異なる。

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| item 間隔 | **8dp**(全 layout)、full-screen 16dp | `ItemSpacing = 0.dp`(サンプルは 8dp) | site が上位 → **8dp**(実装どおり)。Compose の 0 は「呼び出し側で指定」の既定 |
| container padding | 左右 16 / 上下 8(full-screen 0) | `ContentPadding = 0.dp`(サンプル horizontal 16) | site が上位 → **16 / 8**(実装どおり) |
| item の角丸 | 28dp(token `container shape`) | 既定なし(`maskClip(shape)` を呼び出し側が指定、サンプルは extraLarge 28dp) | 一致とみなす → **28dp** |
| uncontained の端 item | 「single size」「don't change size」 | `uncontainedKeylineList` が端で切れる1枚を medium keyline(`remaining × 1.5`、上限 large × 0.85)で mask(parallax) | site が上位 → **サイズ不変**(CR2)。Compose の端 mask は「見切れ」を parallax で見せる演出で、site の multi-aspect / parallax 記述(「Carousel items have a parallax effect when they're scrolled」)と両立させる場合は CR1 の実装時に判断 |
| uncontained の snap | 「Both default scrolling and snap-scrolling work well」、default を推奨 | 既定 `noSnapFlingBehavior` | 一致 → **既定は snap なし**(CR2) |
| hero の種類 | hero(start、small 1)+ center-aligned hero(small 2) | centered hero のみ | Compose が variant の有無を決める → 現状の1種(中央 snap)で可。small の個数は CR1 で決める(軽微欄) |
| full-screen | あり | 公開 API なし | Compose に従い**追加しない**(軽微欄) |
| item の状態 token | hover 0.08 / focus 0.10 / pressed 0.10、hover elevation 1dp、outline 1dp | token なし(item は呼び出し側の clickable) | site が上位 → item を操作可能にするなら site の値(CR5) |
| item の既定色 | surface + 1dp outline | なし | 空 item が背景に溶けるためプレースホルダ色を維持(軽微欄) |
| キーボード | 「Tab or arrow keys」「up and down arrow keys to leave」 | Pager の方向フォーカス(OS 標準) | site に従い **Tab + Left / Right**、Up / Down は横取りしない(CR6) |
| a11y 本文とキャプション | 本文「use Tab or the arrow keys」、キャプション「use arrows to navigate items」 | — | 本文を採用(Tab と矢印の両方) |
| token viewer の warning 行 | `container surface tint layer color` に warning | — | 旧 tint 方式の行 → 無視 |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| container padding(左右 / 上下) | 16 / 8(full-screen 0 / 0、uncontained は leading 16) | 0(サンプル 16 / —) | 16 / 8 ✓ |
| item 間隔 | 8(full-screen 16) | 0(サンプル 8) | 8 ✓ |
| large item 幅 | Dynamic, or user-set(最大幅を指定) | `preferredItemWidth`(必須)を可用幅にフィット | `itemWidth` 固定 260(hero 320)、フィットなし ✗ CR1 |
| medium item 幅 | Dynamic | `(L + S) / 2`(±10% flex) | **なし ✗ CR1** |
| small item 幅 | 40–56 | `(L / 3).coerceIn(40, 56)` | **なし ✗ CR1** |
| 縮んだ item の高さ | 同じ(寸法図) | 同じ(主軸のみ mask) | **scale で縮む(200 → 164)✗ CR1** |
| 端の item | 画面内に完全表示(uncontained 以外) | keyline(anchor 10dp)で画面内に収める | **30px 見切れ ✗ CR1** |
| uncontained item 幅 | 一定 | `itemWidth` 固定 | **164〜200 で変化 ✗ CR2** |
| item 高さ | —(コンテンツ次第) | 呼び出し側 | `itemHeight` 200 |

### シェイプ・色

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| item 角丸 | 28dp | 呼び出し側(サンプル 28dp) | 28px ✓ |
| 縮小時の角丸 | 28dp 一定(small は pill 状) | `rememberMaskShape` で dp 一定 | scale で **23px 相当に縮む ✗ CR1** |
| container 色 | surface | なし | surface ✓ |
| item 色 | surface + outline 1dp | なし | surface-container-high(軽微欄) |
| item の不透明度 | 常に 1 | 常に 1 | **0.5〜1 ✗ CR1 / CR2** |
| disabled | container opacity 0.38、outline 0.12 | なし | なし(CR5) |

### モーション・スクロール

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| multi-browse snap | snap-scrolling | `singleAdvanceFlingBehavior`(1 item / fling、spring StiffnessMediumLow)、first focal に start snap | `x mandatory`・start ✓ |
| hero snap | snap-scrolling | 同上、centered | `x mandatory`・center ✓ |
| uncontained | default(snap も可) | `noSnapFlingBehavior` | **mandatory snap ✗ CR2** |
| サイズ変化 | 「items automatically change size」、parallax | keyline 間の線形補間(scroll offset の関数) | scale + opacity、`transition: short2 linear` ✗ CR1 |
| reduced motion | 全 item 同寸・parallax なし・端まで | 処理なし | **transition を切るだけ ✗ CR4** |
| 自動回転 | なし | なし | なし ✓ |
| RTL | — | `translationX` を反転 | 並びは反転 ✓、mask 判定がずれる ✗ CR3 |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| container role / 名前 | container role、ラベル付き | `Role.Carousel` | `group` + `aria-roledescription="carousel"` + `aria-label` ✓ |
| container へのフォーカス | 「Avoid focusing on the carousel container」 | — | **Chrome で container にフォーカス ✗ CR5** |
| 初期フォーカス | 最初の item | Pager | item はフォーカス不可 ✗ CR5 |
| item 間移動 | Tab または矢印 | 方向フォーカス | 矢印なし ✗ CR6 |
| carousel から出る | 上下矢印 | — | ブラウザ既定(横取りなし)✓ |
| 起動 | Space / Enter | clickable(呼び出し側) | 不可 ✗ CR5 |
| item ラベル | 「current item … total」 | Pager の collection info(未取得) | **なし ✗ CR7** |
| フォーカス item の可視化 | — | Pager がスクロール | 一部可視ならスクロールしない ✗ CR6 |
| hover / focus / pressed | 0.08 / 0.10 / 0.10 + ripple + 形状変化 | 呼び出し側 | なし ✗ CR5(focus 0.10 は #194 の教訓) |
| 入れ子の操作要素 | — | — | キーハンドラがないため横取りなし ✓(CR5 / CR6 実装時は #216 / #226) |
| axe | — | — | jsdom 違反なし / 実ブラウザ `scrollable-region-focusable` ✗ CR5 |

## 手順メモ(今回わかったこと)

- Carousel の specs は token-viewer が1つ・セットも「Carousel item」1つだけ(メニューは `check\nCarousel item` のみ)。
  寸法は全 layout とも本文の属性表(テキスト)にあり、図は確認用
- Compose carousel には `CarouselTokens` がなく、`CarouselDefaults` の既定値(spacing 0 / padding 0 / shape なし)は
  「呼び出し側が決める」意味。site の 8 / 16 / 28dp はサンプルの値と一致する — 既定値の食い違いを「矛盾」と扱わないこと
- scroll 連動の JS 計算は `offsetLeft` の基準(offsetParent)を必ず確認する。ストーリーの `layout: 'padded'`(40px)で
  ずれが見える。RTL で `document.documentElement.dir='rtl'` にして scroll イベントを dispatch すると差が顕在化する
- axe は jsdom では `scrollable-region-focusable` を検出しない(レイアウトがないため)。スクロールコンテナは実ブラウザで
  axe を回すこと
- compositor とメインスレッドのズレは rAF の `getBoundingClientRect` では見えない(どちらもメインスレッドの値)。
  `Page.startScreencast` のフレームを走査して可視範囲を追う。CDP `Input.dispatchTouchEvent` の連続 move で touch fling を再現できる
- 何が compositor に乗るかは trace の `blink.animations` / `Animation` イベントの `compositeFailed` で確認できる
  (Chromium 147: scroll-driven でも `clip-path` は不可、`transform` は可)
- 複数のクリップ要素を translate で重ねる時は、画面外の要素のクリップが隣に重なってヒットテストを奪う → `pointer-events`
