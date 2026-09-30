# List 監査レポート(2026-09-30)

Phase B。`List`(コンテナ)と `ListItem` の 1 / 2 / 3 行 × leading / trailing スロット(アイコン・アバター・画像・
選択コントロール)× overline / supporting / trailing supporting text × 静的 / クリック可能(`onClick`)× selected ×
disabled を3ソースで突き合わせた:

1. **m3.material.io/components/lists/specs** + **/accessibility** + **/guidelines** — Playwright MCP で token-viewer の
   全2セット(List - Common / List - Expand。ページ上の viewer 2つはどちらも同じ Common セットを表示)を全展開して取得
   (visibility 表示で shape / elevation も読んだ)。色ロールが紛らわしい行(container #FEF7FF、selected disabled
   container、selected hover の icon、unselected trailing icon など)は各行の `info` で `md.sys.color.*` の参照先を確認。
   本文の Variants 表・Measurements 表(baseline)・Shape morphing、a11y のキー表・プラットフォーム別ロール表・図の
   キャプション、guidelines の Selection modes / Anatomy を抽出
2. **Compose androidx-main** — `ListItem.kt`(`ListItem` の静的 / `onClick` / `selected` / `checked` オーバーロード、
   `SegmentedListItem` 4種、`@Deprecated` のレガシー `ListItem(headlineContent, …)`、`InteractiveListItem`・
   measure policy)、`ListItemDefaults.kt`(`colors` / `segmentedColors` / `shapes` / `segmentedShapes` / `elevation` /
   `ContentPadding` / `SegmentedGap` / `verticalAlignment`)、`tokens/ListTokens`(VERSION 29.0.0)・
   `ReorderListTokens`・`ExpandedListTokens`・`RevealListTokens`、`ComposeMaterial3Flags`、`Ripple.kt`、
   `StateTokens`。ディレクトリ一覧で list 系ファイルはこれで全部(`SegmentedListItem` は `ListItem.kt` 内)。
   新しいオーバーロードに `@ExperimentalMaterial3ExpressiveApi` は付いていない(KDoc の `@material3expressive` のみ)
3. **実装** — `src/components/List/List.tsx`, `List.module.css`, テスト(7件、全通過)・ストーリー(3話)。
   Storybook(dev)で 1 / 2 / 3 行・leading / trailing・Interactive の computed 値と `getBoundingClientRect` を実測、
   hover / Tab フォーカスの state layer とフォーカスリング、`data-disabled` の差し替えで selected + disabled、
   `dir="rtl"`、leading スロットへの `<img>` / `<input type=checkbox>` 差し込み(実ブラウザで axe-core 4.10 を実行)。
   一時テストで入れ子の `<button>` / `Switch` / `Checkbox` へのキー・クリック操作、axe(静的・クリック可能・selected・
   disabled・selected + disabled・listbox 化の試行)、矢印キーを確認

**共有実装について**: state layer は共有 `Ripple`(hover 0.08 の平面レイヤー + 押下 0.10 の波紋。読むのは
`--md-ripple-color` のみ)、フォーカス表示は共有 `FocusRing`(`inset: 0`、`--md-focus-ring-offset` 既定 2px)。
List は `--md-ripple-color`(通常 on-surface / selected on-secondary-container)と `--md-focus-ring-color: secondary` を
設定している(実測一致)。Card の監査ルーリング(CD1 の入れ子キー横取り、focus state layer 欠落 = #194)を本監査でも踏襲。

**前提 — baseline と Expressive**: m3.material.io は Lists を **Expressive(推奨)** と **baseline(「Not recommended.
Use expressive lists instead.」)** に分け、token セット(List - Common)は両者を1つにまとめている。Compose も
baseline 相当のオーバーロードを `@Deprecated` にし、現行の `ListItem` / `SegmentedListItem` は Expressive の値
(padding 10dp・間隔 12dp・4dp / 16dp のシェイプ)で描く。実装は baseline(レガシー Compose の定数)に一致しており、
以下の多くは「baseline としては正しいが現行仕様では古い」という性質の指摘になる。

## 結論サマリ

**一致している(修正不要)**:

- **最小高さ**: 1行 **56dp** / 2行 **72dp** / 3行 **88dp**(site・Compose トークンとも。実測 56 / 72 / 88)
- **行数の判定(テキストの有無)**: overline + supporting = 3行、どちらか一方 = 2行、headline のみ = 1行
  (Compose `ListItemType` と同じ。折り返しの扱いは LS2)
- **左右の padding**: **16dp / 16dp**(site `leading space` / `trailing space` 16、Compose `ContentPadding` start / end 16。
  baseline Measurements 表の「trailing right padding 24dp」は旧値 — 下記裁定)。RTL で左右が正しく反転(実測)
- **タイポグラフィ**: headline **BodyLarge**(16/24/400)、supporting **BodyMedium**(14/20/400)、overline
  **LabelSmall**(11/16/500)、trailing supporting text **LabelSmall**(site・Compose とも)
- **色(enabled)**: headline **on-surface**、supporting / overline / leading / trailing icon / trailing text
  **on-surface-variant**(site `info` と Compose トークン一致、実測 #1D1B20 / #49454E)
- **色(selected)**: container **secondary-container**(#E8DEF8)、テキスト・アイコンすべて **on-secondary-container**
  (#4A4458)(site・Compose Defaults とも、実測一致)
- **色(disabled)**: headline / supporting / overline / leading / trailing すべて **on-surface @0.38**(実測)。
  disabled の container は変えない(Compose Defaults の disabledContainer = 通常の container)
- **state layer(hover / pressed)**: hover **0.08**・押下 **0.10** + 波紋(実測 0.08)。静的アイテムは Ripple なし
  (Compose の静的オーバーロードも ripple なし)
- **フォーカスリングの色・太さ**: **secondary**(#625B71)**3px**(site focus indicator。offset は LS9)
- **container elevation**: 0(site・Compose `ItemContainerElevation` Level0)
- **ターゲットサイズ**: 行全体がターゲットで最小 56dp ≥ 48dp(site「Targets 48dp」、Compose は `onClick` 付きのみ
  `minimumInteractiveComponentSize`)
- **構造**: `<ul>` + `<li>`(list / listitem ロール)。クリック可能行は `<li>` を listitem のまま残し、内側の `<div>` に
  `role="button"`・`tabIndex=0`・Enter / Space 起動・Ripple・FocusRing(Compose `onClick` オーバーロードはロールなしの
  clickable = 実質ボタン)。disabled は `aria-disabled` + タブ順から除外 + Ripple / FocusRing なし(Compose
  `combinedClickable(enabled = false)` と同等)。axe 違反なし(静的・クリック可能・selected・disabled・selected + disabled)
- **テキストの折り返し**: headline / supporting とも折り返す(site「wrap or be truncated」、Compose は `maxLines` を
  付けない)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| LS1 | **上下 padding と leading / trailing ↔ テキストの間隔が baseline の旧値** | 上下 **8px**(3行は **12px**)、`gap` **16px**(実測) | site Common セット: top / bottom space **10dp**、between space **12dp**。Compose `ListItemDefaults.ContentPadding` = 16 / 16 / **10** / **10**、leading / trailing の decorator は `ItemBetweenSpace` **12dp**。8 / 12 / 16 は `@Deprecated` のレガシー `ListItem` の定数(`// TODO … until replaced with tokens`)| 中 |
| LS2 | **supporting text の折り返しで3行扱いにならない** | 行数は props の有無だけで決まる。supporting が2行に折り返した2行アイテムは `data-lines=2` のまま: 高さ **80px**(8 + 64 + 8)・**中央揃え**(実測、WithLeadingAndTrailing の1行目) | Compose `ListItemType`: supporting が複数行(`FirstBaseline != LastBaseline`)なら **ThreeLine** = 最小 **88dp**、Expressive の `verticalAlignment()` は内容の高さが 60dp 以上で **Top**。site baseline 表「88dp 以上では label / leading / trailing を Top 揃え」、guidelines の3行の例は「supporting text that wraps to two lines」 | 低 |
| LS3 | **Expressive のシェイプと segmented スタイルがない** | 角丸 0 固定(selected も 0、実測)、segmented スタイルなし、container 透明 | site: 「Use the expressive list variant」、Shape: item **4dp**、hovered **12dp**、focused / pressed / dragged / selected **16dp**(Shape morphing「unselected 4dp inner / 16dp outer、selected 16dp」)、segmented の container **surface**・**gap 2dp**・外側の角 16dp。Compose `ListItemDefaults.shapes()`(4 / 16 / 16 / 16 / 12 / 16、`FastSpatial` spring でモーフ)、`SegmentedListItem` + `segmentedShapes(index, count)` + `SegmentedGap` 2dp。List に `variant`(standard / segmented)を足す API 判断が必要 | 中 |
| LS4 | **選択状態が支援技術に伝わらず、選択リストのロールも作れない** | `selected` は見た目(`data-selected`)だけで `aria-selected` / `aria-checked` / `aria-pressed` なし(実測)。`role` prop は内側の `<div>` に付くが `aria-*` は `<li>` に落ちる → `role="option" aria-selected` を渡すと axe **aria-allowed-attr**(実測)。`<ul role="listbox">` にしても子は `<li>`(listitem)| site a11y: web の single / multi-select は container **listbox**(ラベルで選択の種類を説明)+ item **option**、状態 **selected / not selected**。「色だけで選択を示さない」。Compose: `ListItem(selected, onClick)` = **Role.RadioButton** + `selected`、`ListItem(checked, onCheckedChange)` = **Role.Checkbox** + `toggleableState`。選択モード(single / multi)を表す API の判断が必要 | 高 |
| LS5 | **クリック可能行が子孫のキー入力とクリックを横取りする**(Card CD1 と同じ構造) | `handleKeyDown` が `event.target` を見ない。実測: trailing の `<button>` で Enter / Space → **行の onClick が発火し、ボタンは発火しない**。trailing の `Switch` で Space → **スイッチは切り替わらず行が発火**。入れ子のボタン / チェックボックスをクリックすると **行の onClick も発火**(二重実行)。axe **nested-interactive** | site a11y「multi-action リストは各アクションにフォーカスし Space / Enter で起動」、guidelines「multi-action は trailing に補助アクション」。Compose の clickable は自分がフォーカスを持つときだけキーを処理し、子の clickable はクリックを消費する。**`event.target === event.currentTarget` のときだけ**起動し、子のクリックは行に伝えない(または multi-action 構造を別に用意する) | 高 |
| LS6 | **leading スロットが常に `aria-hidden`** | `<span class="leading" aria-hidden="true">` 固定。leading の `<input type=checkbox>` は Tab で到達できるのに読み上げ対象外 — 実ブラウザの axe で **aria-hidden-focus**。leading のアバター / 画像の `alt` も読まれない(一時テストで checkbox / img のロール 0 件)| site Anatomy / slots: leading には avatar・icon・image・video に加え **checkbox / radio / switch** を置ける、a11y の構成例「With leading checkbox」「With leading radio button」。装飾アイコン以外を隠してはならない。trailing スロットは隠していない(非対称)| 高 |
| LS7 | **スロット内の `svg` / `img` が 24×24 に固定される** | `.leading :where(svg, img)` / `.trailing :where(svg, img)` が `width / height: 24px`(詳細度 0,1,0)。実測: `<img width=40 height=40>`(アバター想定)→ **24×24**。インライン style なら 56×56 になるが、利用者の同詳細度クラスは読み込み順次第 | site: avatar **40dp**(円)、image **56×56**、video **100×56 / 114×64**、icon 24dp。Compose は leading / trailing の中身を制約しない。アイコン(svg)だけに 24dp を当て、`img` は利用者の寸法を尊重すべき | 中 |
| LS8 | **矢印キーでのリスト内移動がない** | クリック可能行はすべて Tab ストップ。ArrowDown でフォーカスは動かない(実測) | site a11y: Tab で**最初の項目(選択中の項目があればそれ)**にフォーカス、**Down / Right で次・Up / Left で前(端で折り返し)**、Space / Enter で起動。multi-action は行内のアクションも矢印で巡回。listbox(LS4)も APG で矢印キーが必須。Compose(タッチ / D-pad 前提)に相当する記述はなく矛盾しない | 中 |
| LS9 | **フォーカスリングが外側に出て隣の行に隠れる** | `FocusRing` 既定の offset **+2px**(外側)。行は隙間なく並ぶため、リングの下辺が次の行(selected の塗り)の下に隠れる(スクリーンショットで確認)。スクロール領域では上下が切れる | site: focus indicator offset **−3dp**(内側)、thickness 3dp、color secondary。`--md-focus-ring-offset: -3px` で内側に描くべき | 低 |
| LS10 | **selected + disabled の container が secondary-container のまま** | `data-selected` の container 色が残る(実測 #E8DEF8、テキストは on-surface @0.38) | site: selected disabled container **on-surface @0.38**(`info` で `md.sys.color.on-surface` を確認、warning なし)。Compose トークン `ItemSelectedDisabledContainerColor` = OnSurface / Opacity 0.38(Defaults は disabled を優先して surface — 下記裁定) | 低 |
| LS11 | **focus の state layer 0.10 がない**(ライブラリ共通) | Tab フォーカスで state layer の opacity 0(実測)。FocusRing のみ | site: focus / selected focus state layer **on-surface 0.1**。Compose `ripple()` は Focus 0.1。IconButton IB5 / Card CD8 と同じ共有 `Ripple` の欠落 | 低 |

Issue: LS1/LS2 → #223(同じ `.item` / `[data-lines]` の padding・揃えを書き換えるため同梱)、LS3 → #224、LS4 → #225、
LS5 → #226、LS6 → #227、LS7 → #228、LS8 → #229、LS9 → #230、LS10 → #231、LS11 → #194 にコメント(新規起票せず)

**軽微(判断・記録のみ)**:

- **container が透明**: site・Compose とも container は **surface**(Compose は不透明に塗る)。実装は透明で、
  BottomSheet / SideSheet / SearchBar のストーリーのように surface-container 系の上に置いたとき背景に馴染む。
  standard スタイルでは見た目の差が出にくいので単独では発行しない。LS3 で segmented を足すときは segmented の
  container(site `segmented container color` = surface)を必ず塗ること
- **selected の state layer 色と selected × 操作中の icon 色**: site は selected の hover / focus / pressed / dragged の
  state layer を **on-surface**、leading / trailing icon を **on-surface** とする。実装は on-secondary-container
  (実測 hover レイヤー #4A4458)。Compose は ripple = content color(on-secondary-container)、操作中の icon 色トークン
  (OnSurface)は Defaults で未使用。8〜10% のレイヤーでは差が1階調未満のため発行しない。LS3 / LS10 の修正時に
  site の値へ寄せるとよい(下記裁定)
- **dragged 状態**: site の dragged(elevation 8dp、state layer 0.16)と Compose の reorder 配色(tertiary-container)は、
  ライブラリに並べ替え API がないため対象外
- **Expand / collapse と swipe**: site の List - Expand セット(expanded trailing icon container surface-container、
  circular)は Compose にもコンポーザブルがない(トークンのみ)。swipe は site で「Android Views のみ」。
  `SwipeToDismiss` との組み合わせはストーリーで確認済み → 対象外
- **静的アイテムの `selected`**: guidelines「Non-interactive lists … can't be selected」「single-action は持続的な
  selected 状態にならない」。実装は静的アイテムにも `selected` を許す。LS4 の選択モード設計で扱う
- **静的アイテムの `disabled`**: Compose の静的 `ListItem(enabled = false)` は `disabled()` セマンティクスを付けるが、
  実装の静的アイテムは見た目だけ(`aria-disabled` なし)。静的要素に `aria-disabled` は付けにくいので維持
- **長い単語のはみ出し**: `.body` に `min-width: 0` はあるが `overflow-wrap` がなく、URL などの切れ目のない文字列は
  はみ出しうる。site は「wrap or be truncated」とだけ言う → 利用者側の対応で可
- **List コンテナの上下 8px**: site / Compose ともコンテナの padding トークンはない(Compose は LazyColumn に任せる)。
  baseline の MD2/3 由来の値として維持
- **trailing icon 色の2行**: site に `trailing icon color`(on-surface-variant)と `unselected trailing icon color`
  (on-surface)の2行がある。Compose は後者を未使用で on-surface-variant を使う → 実装(on-surface-variant)維持
- **アイコンサイズ**: site / Compose トークンに Expressive の leading / trailing icon **20dp** があるが、Compose は
  スロットの中身を制約せず Defaults でも使わない。LS7 で 24dp 固定を外す際に既定を 24 のままにするか判断
- **ストーリーのカバレッジ**: selected + disabled、leading のアバター / 画像 / チェックボックス、trailing の
  Switch / IconButton、3行 + leading / trailing、RTL がストーリーにない。LS2 / LS4 / LS6 / LS7 / LS10 の修正 PR で足すこと
- **テスト追加候補**: 入れ子コントロールへのキー / クリック(LS5)、leading のフォーカス可能要素の axe(LS6)、
  selected の ARIA(LS4)、矢印キー(LS8)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| 上下 padding・間隔 | Common セット top / bottom **10dp**、between **12dp** | 現行 `ContentPadding` 10 / 10、`ItemBetweenSpace` 12(レガシー `@Deprecated` 経路は 8 / 12 と 16) | 両者の現行値 **10 / 12**(LS1)。precision pointer 時の 12dp は既定オフのフラグなので対象外 |
| trailing の右 padding | baseline Measurements 表 **24dp**、Common セット trailing space **16dp** | 16dp(トークン・レガシー定数とも) | **16dp**(トークン + Compose。表は baseline の旧値)→ 実装どおり |
| selected + disabled の container | **on-surface @0.38** | トークン OnSurface @0.38、Defaults は `!enabled` 優先で **surface**(selected-disabled トークンを全て未使用) | site + トークン → **on-surface @0.38**(LS10) |
| selected の state layer 色 | **on-surface**(hover / focus / pressed / dragged) | ripple = content color = **on-secondary-container** | site が上位 → on-surface。ただし差が知覚できないため軽微欄 |
| selected × 操作中の icon 色 | **on-surface** | トークン OnSurface、Defaults は on-secondary-container のまま | 同上(軽微欄) |
| 選択リストのロール | web: listbox + option(selected) | RadioButton(selected)/ Checkbox(toggleable)を項目全体に | web の記述が明示的 → **listbox / option + `aria-selected`**(LS4)。Compose の radio / checkbox 相当を選ぶ余地は API 判断で |
| キーボード | Tab で最初 / 選択中の項目、矢印で移動(折り返し) | 記述なし(D-pad のフォーカス移動に任せる) | site → 矢印キー(LS8) |
| フォーカスリングの offset | **−3dp**(内側) | `ripple(focusRingShape = shape)` で shape に沿う(inset 詳細は未追跡) | site → −3dp(LS9) |
| 行数と揃え | baseline 表: 88dp 以上で Top | Expressive: 内容 60dp 以上で Top(`verticalAlignment()`)、`isSupportingMultiline` で ThreeLine | 両者とも「実際の高さ」で決める → LS2 |
| dragged の配色 | Common セット「Dragged (baseline only)」: on-surface 系 + elevation 8dp | Defaults は ReorderListTokens(tertiary-container) | 並べ替え API がないため対象外(軽微欄) |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose(現行) | 実装 |
|---|---|---|---|
| 最小高さ 1 / 2 / 3行 | 56 / 72 / 88 | 56 / 72 / 88(`isExpressiveListItemHeightBasedOnTextLinesFixEnabled` = true) | 56 / 72 / 88 ✓ |
| 左右 padding | 16 / 16 | 16 / 16 | 16 / 16 ✓(RTL ✓) |
| 上下 padding | 10 / 10 | 10 / 10 | **8(3行 12)✗ LS1** |
| leading / trailing ↔ テキスト | 12 | 12 | **16 ✗ LS1** |
| 折り返した supporting | 3行扱い(88、Top) | ThreeLine(88、Top) | **80・中央 ✗ LS2** |
| shape(通常 / hover / focus・pressed / selected) | 4 / 12 / 16 / 16 | 4 / 12 / 16 / 16(FastSpatial spring) | **0 固定 ✗ LS3** |
| segmented gap / 外側の角 | 2 / 16 | `SegmentedGap` 2 / `segmentedShapes` 16 | **なし ✗ LS3** |
| leading icon / trailing icon | 24(Expressive 20) | 制約なし | 24 ✓(img も 24 に固定 **✗ LS7**) |
| avatar / image / video | 40 / 56×56 / 100×56・114×64 | 制約なし | **24×24 に潰れる ✗ LS7** |
| フォーカスリング | secondary 3 / offset −3 | focusRingShape | secondary 3 ✓ / offset **+2 ✗ LS9** |
| List コンテナ上下 | — | — | 8(軽微欄) |

### カラー(light)

| 項目 | enabled | selected | disabled | selected + disabled |
|---|---|---|---|---|
| container | surface(実装は透明、軽微欄) | secondary-container ✓ | 変化なし ✓ | **on-surface @0.38(実装 secondary-container)✗ LS10** |
| headline | on-surface ✓ | on-secondary-container ✓ | on-surface @0.38 ✓ | on-surface @0.38 ✓ |
| supporting / overline | on-surface-variant ✓ | on-secondary-container ✓ | on-surface @0.38 ✓ | on-surface @0.38 ✓ |
| trailing supporting text | on-surface-variant ✓ | on-secondary-container ✓ | on-surface @0.38 ✓ | on-surface @0.38 ✓ |
| leading / trailing icon | on-surface-variant ✓ | on-secondary-container ✓ | on-surface @0.38 ✓ | on-surface @0.38 ✓ |

### state layer・フォーカス

| 状態 | site | Compose | 実装 |
|---|---|---|---|
| hover | on-surface 0.08(selected も on-surface) | content color 0.08 | 0.08 ✓(selected は on-secondary-container、軽微欄) |
| focus | 0.1 + focus indicator | 0.1(ripple) | FocusRing のみ **✗ LS11(#194)** |
| pressed | 0.1(ripple) | 0.1 + ripple | 0.10 + 波紋 ✓ |
| dragged | 0.16 + elevation 8 | 0.16 + elevation 8 | 対象外(軽微欄) |
| disabled | state layer 0.1(トークンのみ) | なし | Ripple なし ✓ |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 非インタラクティブ | ロールなしで読み上げ、選択不可 | `semantics(mergeDescendants)`、ロールなし | `<li>` ✓(`selected` を許す — 軽微欄) |
| single-action | 行全体が1アクション、Space / Enter | `ListItem(onClick)` = clickable | `div[role=button]` ✓ |
| single / multi-select | web: listbox / option + selected | RadioButton / Checkbox(項目全体) | 表現できない **✗ LS4** |
| multi-action | 各アクションがフォーカス可、Space / Enter | 子の clickable が自分のキー・クリックを処理 | 子のキー・クリックを行が横取り **✗ LS5** |
| leading の選択コントロール・画像 | 置ける(checkbox / radio / avatar / image) | 制約なし | 常に `aria-hidden` **✗ LS6** |
| キーボード移動 | Tab → 最初 / 選択項目、矢印で移動(折り返し) | — | 全行が Tab ストップ、矢印なし **✗ LS8** |
| 選択の視覚 | 色だけに頼らない(チェック等と併用) | — | 利用者側(LS4 で案内) |
| disabled | 入力を受けない | `enabled = false` | `aria-disabled`・タブ順除外 ✓ |
| RTL | — | — | 論理プロパティで反転 ✓ |
| reduced motion | — | — | 遷移なし(LS3 のモーフ追加時に要対応) |

## 手順メモ(今回わかったこと)

- Lists の site は「Expressive」と「baseline」の2節に同じ token-viewer(List - Common)を2回置いている。セットは
  Common と Expand の2つだけで、Common に baseline と Expressive の値が混在する(`… expressive shape` / `… expressive size`
  の行)。行名に warning が付くのは Color フォルダ内の divider と高さの行で、同じ高さは Size フォルダでは warning なし
- `ListItem` のような「汎用スロット」は、スロットに**フォーカス可能要素**(checkbox)と **`<img>`** を差し込んで
  実ブラウザの axe-core(cdnjs から `page.addScriptTag`)と `getBoundingClientRect` で確認すること。jsdom の axe は
  `aria-hidden-focus` を検出しなかった
- `role` を上書きできる prop は、`aria-*` がどの要素に落ちるか(`...rest` の行き先)を必ず確認する
  (role と aria 属性が別要素に分かれると axe `aria-allowed-attr`)
