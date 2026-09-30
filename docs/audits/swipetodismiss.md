# SwipeToDismiss 監査レポート(2026-09-30)

Phase B。`src/components/SwipeToDismiss/` の `SwipeToDismiss`(`onDismiss(direction)`、`background`、`enableStartToEnd` /
`enableEndToStart`、`threshold`(既定 56px))を3ソースで突き合わせた:

1. **m3.material.io** — Playwright MCP で `/components`(索引)、`/foundations/interaction/gestures`、`/components/lists/guidelines`、
   `/components/lists/accessibility` を取得し「swipe / dismiss」を全文検索。**swipe-to-dismiss 専用のコンポーネントページはない**
   (索引に該当なし)。記述があるのは次の3か所だけで、寸法・色・モーション・トークンは**一切ない**:
   - gestures「Swipe: People can navigate horizontally to … Complete actions. Swiping a list item can reveal additional actions」
   - lists/guidelines「On Android, list items can reveal buttons on swipe … A full swipe triggers this action, clearing the list item
     … off-screen. **Swipeable list items should include alternative ways to access hidden actions, such as a more icon.**」
   - lists/accessibility「List items that can be swiped should include alternative ways to access hidden actions … Swipe alternatives
     can be: Single tap / Double tap / Long press / Other single-point interactions」
   → site 由来で判定できるのは「代替手段」だけ。それ以外の行は **site N/A、Compose が一次ソース**
2. **Compose androidx-main** — `material3/SwipeToDismissBox.kt`(`SwipeToDismissBox` / `SwipeToDismissBoxState` / `SwipeToDismissBoxValue` /
   `SwipeToDismissBoxDefaults`)、foundation の `gestures/AnchoredDraggable.kt`(`anchoredDraggable`、`computeTarget`、
   `AnchoredDraggableDefaults`、RTL 反転)、samples の `SwipeToDismissSamples.kt`。コンポーネント用の tokens ファイルは**存在しない**
   (material3 ディレクトリを contents API で列挙して確認)
3. **実装** — `SwipeToDismiss.tsx`, `.module.css`, テスト(6件、全通過)・ストーリー(1話 Default)。Storybook(dev)で
   `page.mouse` のドラッグ(段階移動・高速フリック・往復)と CDP `Input.dispatchTouchEvent` のタッチを実行し、rAF ごとに
   `transform` を採取。ネストしたボタンのクリック、`dir="rtl"`、`reducedMotion` の切り替え、実ブラウザ axe-core 4.10.2 と aria snapshot。
   jsdom の一時テスト(RTL の方向、dismiss 後の再ドラッグ。削除済み)

**共有実装・利用箇所について**: ライブラリ内で `SwipeToDismiss` を import しているコンポーネントは**ない**(ストーリーで `List` /
`ListItem` と組み合わせるだけ)。focus state layer(#194)は content が非フォーカスなので該当なし。List の「クリック可能な行が
ネストしたコントロールのキー/クリックを奪う」(#226)とは**別原因**(こちらは pointer capture。SW1)。

**VRT について**: VRT は reduced motion + アニメーション無効で**静止した行**を撮る。以下の finding はすべてジェスチャ・モーション・
a11y ツリーの問題で、**どれも VRT には写らない**(ストーリーを変えない限りベースライン変更なし)。

## 結論サマリ

**一致している(修正不要)**:

- **既定の位置しきい値 56**(Compose `SwipeToDismissBoxDefaults.positionalThreshold` = `56.dp.toPx()`。実装 `threshold = 56`)。
  段階ドラッグ 80px → dismiss、40px → 戻る(実測)
- **両方向を既定で許可**、方向ごとの無効化(Compose `enableDismissFromStartToEnd` / `EndToStart` = true。無効側へは動かない — 実測・既存テスト)
- **dismiss 先 = 行幅ぶん外へ**(Compose のアンカー `StartToEnd at width` / `EndToStart at -width`。実装 `setOffset(±width)`)
- **重ね方**: background が content の背後で `matchParentSize`、content が上(Compose `Box { Row(background) ; Row(content) }`)
- **横方向だけのドラッグ、縦スクロールは奪わない**(Compose `Orientation.Horizontal`)。`touch-action: pan-y` + pointer events。
  タッチ実測: 縦パン → ページが 194px スクロール、`pointercancel` で行は 0 に戻る / 横スワイプ 120px → dismiss
- **マウスは主ボタンのみ**、`setPointerCapture` で行の外に出てもドラッグ継続
- **戻りの時間 300ms**(Compose `AnchoredDraggableDefaults.SnapAnimationSpec = tween()` = 300ms。実装 `duration-medium2` 300ms、
  40px からの戻りが 287ms で 0 に到達 — 実測)。**イージングは SW3b**
- **reduced motion**: 戻り・dismiss とも即時(CSS `transition: none`)。Compose / site とも規定なし → Web 固有の判断として維持
  (ライブラリ全体の方針は docs/audits/progress-indicator.md(PR #275)の reduced-motion 項目に合流)
- **background は `aria-hidden`**(dismiss 専用の装飾。Compose の background も操作対象を持たない想定 — sample は色の Box だけ)
- **マウスドラッグ中に文字選択が起きない**(実測 `getSelection()` 空)
- **axe(jsdom)**: 違反なし(単体 render の場合。List 内は SW7)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| SW1 | **行の中のボタン・クリック可能な ListItem が押せない**(+ 押しただけで行が動く) | `pointerdown` で**即座に** `setPointerCapture`。Chromium 実測: 行に `<button>` を入れてクリック → `click` の target は **content の `<div>`**、ボタンの click ハンドラは**一度も呼ばれない**(無移動クリック・3px ぶれ とも)。React の `onClick`(`ListItem onClick` の `role="button"` 要素を含む)も同じ理由で発火しない。また slop がなく、2px のぶれで `translateX(2px)` 動く | Compose `anchoredDraggable` は `draggable` の **touch slop を超えてから**ドラッグを開始し(`startDragImmediately` は animation 中のみ)、それまで子のクリックを妨げない。→ slop(例 8–10px の横移動)を超えるまで capture もオフセット更新もしない。超えた後のクリックだけ抑止する | 高 |
| SW2 | **RTL で方向が逆** | `dx > 0` を常に `startToEnd`、`enableStartToEnd` も物理的な右方向を制御(JSDoc「left→right」)。jsdom 実測: `dir="rtl"` で右へ 80 → `onDismiss('startToEnd')` | Compose `SwipeToDismissBoxValue.StartToEnd` =「swiping in the **reading direction**」、`anchoredDraggable` は `reverseDirection = null` のとき **RTL の横ドラッグを反転**。→ RTL では右 = `endToStart`、`enable*` も論理方向で判定 | 中 |
| SW3a | **dismiss 判定が距離だけ(速度・動きの向きを見ない)** | 離した時点の `|dx| > threshold` だけ。実測: 45px の**高速フリック → 戻る**。110px まで引いて 70px へ**戻しながら離す → dismiss** | Compose `computeTarget`: ① 速度 ≥ **125dp/s**(`AnchoredDraggableMinFlingVelocity`)→ フリック方向の次のアンカーへ(短いフリックでも dismiss)、② それ未満で動いている → **動いている向き**で 56dp の位置しきい値を判定(戻しながら離せば戻る)、③ 静止 → **最も近いアンカー**(= 幅の 50%)。→ pointermove の速度を追跡し同じ3分岐にする | 中 |
| SW3b | **settle のイージング** | `--md-sys-motion-easing-emphasized` = `cubic-bezier(0.2, 0, 0, 1)` | Compose `SnapAnimationSpec = tween()` = 300ms **FastOutSlowInEasing** = `cubic-bezier(0.4, 0, 0.2, 1)`(= 既存トークン `--md-sys-motion-easing-legacy`)。高速フリックも同じ tween で次のアンカーへ(現行の `flingBehavior` は `NoOpDecayAnimationSpec` —「We never decay in AnchoredDraggable's fling」。`exponentialDecay` は非推奨コンストラクタの経路だけ) | 低 |
| SW4 | **`onDismiss` が離した瞬間に呼ばれ、退場アニメーションが見えない** | `endDrag` で `setOffset(width)` と**同時に** `onDismiss`。ストーリーは `onDismiss` で項目を削除するため、実測で離してから **5ms 以内に行が DOM から消え**、外へ滑るアニメーションは1フレームも描かれない | Compose: `LaunchedEffect(state.settledValue)` — **dismiss アンカーに settle した後**に `onDismiss(direction)`(sample も `onDismiss` 内で `isVisible = false`)。→ `transitionend`(reduced motion では即時)後に `onDismiss` | 中 |
| SW5 | **dismiss 後の状態を戻せない / 再ドラッグできてしまう(confirm・cancel と代替操作が作れない)** | 状態は内部 `offset` だけで API なし。onDismiss 後も行は `translateX(width)` のまま**画面外に残り**、戻す手段は remount だけ。さらにジェスチャは有効なままで、次の `pointerdown` で行が**指の位置(−10px)へ瞬間移動**し、もう一度 `onDismiss` が発火する(jsdom 実測 2回) | Compose: `SwipeToDismissBoxState.reset()`(sample: StartToEnd は `scope.launch { dismissState.reset() }` で**キャンセル**)と `dismiss(direction)`(アニメーション付きのプログラム dismiss)、ジェスチャは `enabled = gesturesEnabled && settledValue == Settled`(dismiss 後は無効)。site lists/a11y「swipe には single tap 等の**代替手段**を用意する」— 代替ボタンから同じ退場アニメーションを出すにはプログラム dismiss が要る。→ 制御 API(例 `dismissed` / `onDismissedChange` の controlled+uncontrolled、または ref の `reset()` / `dismiss(direction)`)を設計し、dismiss 中・後はジェスチャ無効。ストーリーに代替手段(例 more / delete ボタン — SW1 の修正が前提)を示す | 中 |
| SW6 | **background を方向ごとに変えられない** | `background` は静的な `ReactNode`。ドラッグ方向・進行度を知る手段がなく、ストーリーは両端に同じ「Delete」を並べてごまかしている | Compose KDoc: background は「You can/should use the **state** to have different backgrounds on each side」(`dismissDirection` / `targetValue` / `progress`)。sample は `targetValue` で Settled/StartToEnd/EndToStart の色を切り替える。→ `background` に関数形 `(direction, progress) => ReactNode` を許すか、root に `data-direction` / CSS 変数を出す | 中 |
| SW7 | **List の中に置くと list 構造が壊れる** | root が `<div>`。ストーリーの `<List><SwipeToDismiss><ListItem/></SwipeToDismiss></List>` は `ul > div > div > li` になり、実ブラウザ axe で **`list`(1)・`listitem`(3)違反**(jsdom の単体テストは List を使わないので検出されない) | site の swipe は**リスト項目**のジェスチャ(lists/guidelines)。WCAG 1.3.1 — `ul` の子は `li` のみ。→ root を `li` にする選択肢(例 `component="li"` と ListItem 側の非 li 化)、または「`<li>` の中に置く」使い方を API/ドキュメントで決める | 中 |

Issue: SW1 → #290、SW2 → #291、SW3a + SW3b → #292(どちらも `endDrag` の settle 先と settle アニメーション)、SW4 + SW5 → #293(どちらも dismiss 後の状態遷移 = `endDrag` 以降のライフサイクルを書き換える)、SW6 → #294、SW7 → #295

**軽微(判断・記録のみ)**:

- **`gesturesEnabled` 相当がない**: `enableStartToEnd={false} enableEndToStart={false}` で同じ効果になる。SW5 の状態設計で必要なら足す
- **`threshold` の単位は CSS px**: Compose は dp(`56.dp.toPx()`)。Web では CSS px = dp 相当なので同値。関数形(`(totalDistance) => number`、
  Compose の `positionalThreshold` の型)にするかは SW3a の実装時に判断
- **content の背景 `surface` 固定**: background を隠すために content に `--md-sys-color-surface` を塗っている。Compose の content は
  背景を持たず、利用側(sample は `OutlinedCard`)が塗る。surface-container 系のリストに置くと行だけ色が違って見える。
  `--_container-color` 等で上書き可能にするとよい(site / Compose とも値の規定なし)
- **focus の行き先**: dismiss された行の中に focus があった場合(代替ボタンで削除など)、行が消えると focus は `body` に落ちる。
  Compose / site とも規定なし、削除は利用側の責務。SW5 のストーリーで「次の行へ focus を移す」例を示す程度
- **background 内のボタン**: `aria-hidden` なので、site lists/guidelines の「swipe でボタンを露出する」パターン(reveal actions)には
  使えない。Compose の `SwipeToDismissBox` も dismiss 専用で reveal パターンは持たない → 範囲外として記録のみ
- **ドラッグ中の state layer / elevation**: Compose `SwipeToDismissBox` は何も描かない(dragged 0.16 も使わない)→ 実装どおりなし
- **dismiss を超えた引っ張り**: 実装は行幅を超えても `dx` をそのまま追う。Compose はアンカー範囲(±width)で clamp。見た目上の差は小さい。SW3a で揃う
- **Firefox / WebKit**: SW1 の click 再ターゲットは Chromium で実測。Pointer Events 3 の「capture 中の click は capture 先へ」は
  他エンジンも実装済みとされるが未実測

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| コンポーネントの存在 | 専用ページなし(lists / gestures の記述のみ) | `SwipeToDismissBox` あり | site 沈黙 → **Compose を一次ソース**。site の値の行は N/A |
| swipe の代替手段 | 「should include alternative ways … single tap / double tap / long press」 | コンポーネントに semantics / custom action なし。`dismiss()` / `reset()` で利用側が実装できる | 矛盾ではない(site は利用側の要件、Compose はそれを可能にする API)→ **プログラム dismiss / reset を提供**(SW5) |
| full swipe の意味 | 「reveal buttons … A full swipe triggers the primary action」 | 位置しきい値 56dp / 速度 125dp/s で dismiss(full swipe 不要) | site は reveal-actions パターンの記述で、Compose の dismiss とは別パターン → **Compose の判定を採る**(SW3a)。reveal パターンは範囲外(軽微) |
| settle のモーション | 規定なし | tween 300ms FastOutSlowIn(fling も decay せず同じ tween) | Compose を採る(SW3b) |
| reduced motion | 規定なし | 規定なし | Web 固有の判断で即時(実装どおり、PR #275 の方針に合流) |

## 詳細対照表

### 判定・しきい値

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 位置しきい値 | — | 56dp(動いている向きで判定) | 56px(向きを見ない)**✗ SW3a** |
| 速度しきい値 | — | 125dp/s → フリック方向の次アンカー | なし **✗ SW3a**(45px の高速フリックで戻る) |
| 静止して離す | — | 最も近いアンカー(50%) | 56px で dismiss **✗ SW3a** |
| アンカー | — | 0 / ±width | 0 / ±width ✓ |
| 方向の有効化 | — | 両方向 true | 両方向 true ✓ |
| RTL | — | 横ドラッグを反転(start = reading direction) | 物理方向 **✗ SW2** |
| ドラッグ開始 | — | touch slop 超過後 | 即時(2px で動く)**✗ SW1** |

### モーション

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 戻り / dismiss の時間 | — | tween 300ms | 300ms ✓(実測 287ms で到達) |
| イージング | — | FastOutSlowIn (0.4, 0, 0.2, 1) | emphasized (0.2, 0, 0, 1) **✗ SW3b** |
| 高速フリック | — | 同じ tween で次アンカー(decay なし) | なし(SW3a) |
| onDismiss のタイミング | — | settle 後 | 離した瞬間 **✗ SW4** |
| reduced motion | — | — | 即時(維持) |
| VRT | — | — | 静止状態のみ — 上記はすべて写らない |

### 振る舞い・a11y

| 項目 | site / Compose | 実装 |
|---|---|---|
| 縦スクロール | 奪わない | `pan-y`、タッチ実測で 194px スクロール ✓ |
| タッチで dismiss | 可 | 可 ✓(CDP タッチ実測) |
| 行内のボタン / クリック可能な行 | 押せる | **押せない ✗ SW1** |
| dismiss 後のジェスチャ | 無効(settled ≠ Settled) | 有効、再 dismiss **✗ SW5** |
| キャンセル(reset) | `reset()` | なし **✗ SW5** |
| プログラム dismiss / 代替手段 | `dismiss(direction)` / site「alternative ways」 | なし **✗ SW5** |
| 方向別 background | state で切り替え | 静的 **✗ SW6** |
| List 内の構造 | — | `ul > div > li`、axe list/listitem 違反 **✗ SW7** |
| background の a11y | 装飾 | `aria-hidden` ✓ |
| キーボード | Compose の component 自体は操作を持たない | 同じ(content は非フォーカス)— 代替は SW5 |
| axe | — | jsdom 違反なし / 実ブラウザ(List 内)SW7 |

## 手順メモ(今回わかったこと)

- Playwright MCP のブラウザは **`prefers-reduced-motion: reduce` が既定で true**。モーションを測るときは最初に
  `page.emulateMedia({ reducedMotion: 'no-preference' })` を呼ばないと、transition が `none` で「アニメーションなし」と誤認する
- pointerdown で `setPointerCapture` するコンポーネントは、子の `<button>` に click リスナーを付けてクリックし、**click の target** を
  確認する(Chromium は capture 先へ click を再ターゲットする。jsdom では再現しない)
- タッチの縦スクロール分離は CDP `Input.dispatchTouchEvent`(`page.context().newCDPSession(page)`)で確かめられる。body を
  3000px にしてから縦に動かし、`scrollY` と `pointercancel` を見る
- 「リスト項目を包む」ラッパー部品は、単体の jsdom axe では通っても**実際のリストに入れた状態**で axe を実ブラウザで回す(SW7)
- Compose の判定ロジックは material3 ではなく **foundation の `AnchoredDraggable.kt`**(`computeTarget`、RTL 反転、既定 spec)にある
