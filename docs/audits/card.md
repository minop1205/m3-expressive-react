# Card 監査レポート(2026-09-30)

Phase B。filled / elevated / outlined の3バリアント × 静的(非アクション)/ クリック可能(`onClick`)×
disabled × dragged を3ソースで突き合わせた:

1. **m3.material.io/components/cards/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   token-viewer の全3セット(Card - Elevated / Filled / Outlined。viewer は1つだけ)を全展開して取得
   (visibility 表示のまま切り替え、elevation は `layers 1dp` 等の文字列で読めた)。色ロールが紛らわしい行
   (filled / elevated の disabled container、outlined の container・focus outline)は各行の `info` ボタンで
   `md.sys.color.*` の参照先を確認。本文の状態図キャプション、Measurements 表、a11y のキー表・ロール記述、
   guidelines の Actions / Gestures 節も抽出
2. **Compose androidx-main** — `Card.kt`(`Card` / `ElevatedCard` / `OutlinedCard` の静的・`onClick`
   オーバーロード、`CardDefaults`・`CardElevation`・`CardColors` は**同じファイル**、internal の
   `StyleableCard`)、`tokens/FilledCardTokens` / `ElevatedCardTokens` / `OutlinedCardTokens`、
   `ElevationTokens`・`StateTokens`・`internal/Elevation.kt`(elevation のアニメーション仕様)・`Surface.kt`。
   `ComposeMaterial3Flags` に Card の分岐は**なし**。`StyleableCard` に `TODO(b/554027431)`(elevation の
   状態間アニメーション未実装)があるが internal で既定経路ではない
3. **実装** — `src/components/Card/Card.tsx`, `Card.module.css`, テスト(9件、全通過)・ストーリー(4話)。
   Storybook(dev)の Clickable ストーリーで `data-variant` / `data-dragged` / `data-disabled` を差し替えながら
   3バリアント × rest / hover / pressed / focus / dragged / disabled の computed 色・box-shadow・
   state layer の opacity・`getBoundingClientRect` を実測。一時テストで axe(静的・クリック可能・disabled・
   入れ子ボタン)と、入れ子のボタン / テキスト入力に対するキー操作を確認

**共有実装について**: state layer は共有 `Ripple`(hover 0.08 の平面レイヤー + 押下 0.10 の波紋。読むのは
`--md-ripple-color` のみ)、フォーカス表示は共有 `FocusRing`(`inset: 0` + `border-radius: inherit`)。Card は
`--md-ripple-color: on-surface` / `--md-focus-ring-color: secondary` を正しく設定している(実測一致)。
Button / IconButton の監査ルーリング(disabled の不透明度はトークン値をそのまま半透明で適用、IB4 の枠線加算、
focus state layer 欠落 = #194)を本監査でも踏襲した。

## 結論サマリ

**一致している(修正不要)**:

- **container 色**: filled **surface-container-highest**(#E6E0E9)、elevated **surface-container-low**(#F7F2FA)、
  outlined **surface**(#FEF7FF)+ 枠線 **outline-variant** 1dp(site・Compose トークン・実測とも一致)
- **シェイプ**: 全バリアント corner-medium **12dp**
- **静止時の elevation**: filled 0 / elevated **1dp(Level1)** / outlined 0
- **hover の elevation**: filled **1dp**、elevated **3dp(Level2)**(実測 box-shadow が level1 / level2 に切り替わる)
- **focus の elevation**: filled 0 / elevated 1dp / outlined 0(= 静止時と同じ。実装は focus で変えない)
- **dragged の elevation**: filled **6dp(Level3)**、elevated **8dp(Level4)**、outlined **6dp(Level3)**、
  dragged 時の outlined 枠線は outline-variant のまま
- **disabled の elevation**: filled 0 / elevated **1dp(disabled でも影を残す)** / outlined 0
- **disabled のコンテンツ色**: on-surface @0.38(Compose `contentColor.copy(DisabledAlpha)`)
- **outlined の disabled**: container は surface のまま、枠線 **outline @0.12**(site・Compose トークンとも)
- **state layer**: 色 on-surface、hover 0.08 / pressed 0.10(+ 波紋)
- **フォーカスリング**: secondary(#625B71)3px・offset 2px(site の focus indicator トークン)、角丸追従
- **挙動・a11y(単体)**: 静的カードはロールなし・タブストップなし・リップルなし・hover なし(site「Non-actionable
  cards don't have a hover state / don't ripple」)。`onClick` 指定で `role="button"`・`tabIndex=0`・Enter / Space
  起動・Ripple・FocusRing。disabled は `aria-disabled` + タブ順から除外 + Ripple / FocusRing なし(Compose の
  disabled `Surface(onClick)` と同等)。axe 違反なし(静的・クリック可能・disabled)。`prefers-reduced-motion` で
  影の遷移なし
- **既定値**: variant `filled`(Compose の `Card` = filled)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| CD1 | **クリック可能カードが子孫のキー入力を横取りする** | `handleKeyDown` が `event.target` を見ずに Enter / Space で `preventDefault()` + カードの `click()`。実測: 入れ子の `<button>` で Enter / Space → **カードの onClick が発火し、ボタンの onClick は発火しない**。入れ子の `<input>` で「a b」と入力 → 値は **"ab"**(スペースが消え、カードが発火) | site a11y「すべてのアクション要素はキーボードフォーカスを受け、Space / Enter でアクションを実行」。Compose の `clickable` は自分がフォーカスを持つときだけキーを処理する。**`event.target === event.currentTarget` のときだけ**起動すべき | 高 |
| CD2 | **リンクとしてのカードを表現できない** | `role="button"` の `<div>` 固定(`role` の上書きは可能だが `href` なし。`role="link"` にしても Space で起動してしまう) | site a11y「Directly actionable cards can have the **button or link role**, depending on how they're used」、guidelines「Cards can serve as entry points into deeper levels of detail or navigation」。Compose はロールを付けない(下記裁定)。`href` 指定で `<a>` を描く等の API 判断が必要 | 中 |
| CD3 | **disabled の container 色が旧値の半透明** | filled: surface-container-highest @38%(半透明)、elevated: surface-container-low @38%(実測) | site: filled **on-surface @0.38**(`info` で `md.sys.color.on-surface` を確認)、elevated **surface @0.38**(`md.sys.color.surface`)。Compose トークンは filled SurfaceVariant @0.38(下記裁定)、elevated Surface @0.38 | 中 |
| CD4 | **押下中の elevation が hover のまま** | 押下中も `:hover` の影が残る(実測: filled level1、elevated level2) | site・Compose とも pressed elevation は filled **0**、elevated **1dp(Level1)**、outlined 0。Compose `CardElevation` は最後の Interaction(Press)を優先 | 低 |
| CD5 | **outlined の hover elevation がない** | hover でも影なし(CSS コメント「Outlined interactive stays at Level0 on hover (Compose)」) | site: hover container elevation **1dp**。Compose トークン `OutlinedCardTokens.HoverContainerElevation` = **Level1**(Defaults の `outlinedCardElevation` だけ `hoveredElevation = defaultElevation` — 下記裁定) | 低 |
| CD6 | **outlined の focus 時の枠線色が変わらない** | focus でも outline-variant(実測 #CAC4CF) | site: focused outline color **on-surface**(`md.sys.color.on-surface` を確認)。Compose トークン `FocusOutlineColor` = **OnSurface**(Defaults の `outlinedCardBorder` は enabled / disabled しか持たず未使用 — 下記裁定)。hover / pressed / dragged は outline-variant のまま | 低 |
| CD7 | **dragged の state layer 0.16 がない** | `dragged` は elevation だけ上げ、state layer の opacity は 0(実測) | site: 全3セット dragged state layer **on-surface 0.16**。Compose は `ripple()` が DragInteraction に StateTokens.Dragged **0.16** を描く | 低 |
| CD8 | **focus の state layer 0.10 がない**(ライブラリ共通) | Tab フォーカスで state layer の opacity 0(実測)。FocusRing のみ | site: 全3セット focus state layer **0.1**。Compose `ripple()` は Focus 0.1。IconButton IB5 と同じ共有 `Ripple` の欠落 | 低 |

Issue: CD1 → #216、CD2 → #217、CD3 → #218、CD4 → #219、CD5/CD6 → #220(outlined の状態別ルールを同じ節に
書き足すため同梱)、CD7 → #221、CD8 → #194 にコメント(新規起票せず)

**軽微(判断・記録のみ)**:

- **outlined の枠線がサイズに加算される**(IconButton IB4 と同じ構造): 同じ内容で filled 97px に対し outlined
  **99px**(実測)。`Ripple` / `FocusRing` は padding box 基準で枠線の内側に入り(state layer 幅 298 / 外形 300)、
  リングは外形から 1px 内側。Compose は枠線を shape の内側に描きサイズを変えない。Card は内容で大きさが決まり
  固定寸法の仕様がないため発行しないが、IB4 の修正方針(例: `box-shadow: inset` や疑似要素の枠線)を決めたら
  Card にも同じ手当てを
- **`<div role="button">` とネイティブ `<button>`**: プロジェクト規約は「押下はネイティブ `<button>`」だが、
  `<button>` はフロー要素(見出し・段落・画像ブロック)を含められないため、カード全体を包む用途では
  `div[role=button]` が妥当 → **維持**。付随する差分: Space を keydown で起動(ネイティブは keyup)、Enter の
  長押しで連続起動(ネイティブと同じ)。CD1 の修正時に Space を keyup 起動へ寄せるかは任意
- **アクション要素の入れ子**: site「アクション面の上にアクションを置かない(stacking actionable elements)」。
  クリック可能カードに `<button>` を入れると axe `nested-interactive` 違反(実測)。実装は防がない。JSDoc で
  「クリック可能カードにボタン・リンクを入れない。入れるなら静的カードにする」と案内するか dev 警告を出すか判断。
  guidelines の「primary action area」(カードの一部だけをアクション面にする)は、静的カードの中にクリック可能
  領域を置く組み合わせで表現できる — Card 自体の機能追加は不要
- **静的カードの `disabled`**: JSDoc は「`onClick` があるときだけ意味がある」だが、CSS は静的カードも減光・
  `pointer-events: none` にする(実測 `data-disabled` が付く)。Compose の公開 `Card`(静的)には `enabled` が
  ない(internal の `StyleableCard` は静的でも `semantics { disabled() }` を付ける)。視覚的な disabled 表示として
  有用なので**維持**、JSDoc を実態に合わせるとよい
- **影の遷移**: 実装は box-shadow 150ms standard easing(入・出とも)。Compose `animateElevation` は入り
  **120ms FastOutSlowIn**、出 150ms `cubic-bezier(0.4, 0, 0.6, 1)`(hover からの出だけ 120ms)。体感差は小さく
  発行しない
- **disabled 枠線の合成先**: Compose `outlinedCardBorder(false)` は outline @0.12 を `ElevatedCardTokens.
  ContainerColor`(surface-container-low)に**合成して不透明化**する(outlined の container は surface なので
  上流の取り違えとみられる)。実装は outline @0.12 の半透明を surface 上に描く → 差は1階調未満、現実装のまま
- **パディング**: site Measurements「左右 16dp、カード間 8dp max」。Compose の Card はパディングを持たず
  (`Column(content)`)、利用者がレイアウトする。実装も同じ → 維持(ストーリーは `padding: 16`)
- **アイコントークン**: site / Compose とも icon color primary・24dp の行があるが、Card にアイコンスロットはない
  (中身は自由)→ 対象外。`surface tint layer color` 行は site で warning 付き(非推奨)→ 対象外
- **ストーリーのカバレッジ**: `Clickable` / `Disabled` は `variant="elevated"` を**引数の後に固定**しており、
  Controls の variant が効かず、VRT も elevated しか撮らない(filled / outlined の disabled・dragged は未撮影)。
  CD3 / CD5 / CD6 / CD7 の修正 PR でバリアント横並びのストーリーを足すこと
- **テスト追加候補**: 入れ子ボタン / 入力へのキー操作(CD1)、押下中の elevation(CD4)、disabled の各バリアント

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| filled の disabled container | **on-surface** @0.38(warning なし、`info` で参照先を確認) | トークン `DisabledContainerColor` = **SurfaceVariant** @0.38 を ContainerColor(s-c-highest)に合成(≒ 不透明で通常時とほぼ同色) | site が上位で行は非推奨表示なし → **on-surface @0.38**(CD3)。見た目の変化が大きい値なので、修正 PR で site の値を再確認すること → **2026-09-30 再確認済み**(Card - Filled セット: disabled container color #1D1B20 = on-surface、opacity 0.38、warning なし)。#218 で実装 |
| elevated の disabled container | surface @0.38 | トークン Surface @0.38 を **Surface に合成**(= 不透明の surface) | 色は一致。不透明度は Button B4 と同じく **トークン値をそのまま半透明で適用**(CD3) |
| outlined の hover elevation | **1dp** | トークン Level1、Defaults `outlinedCardElevation` は hover / focus / pressed = default(Level0) | site + トークン → **1dp**(CD5)。現実装のコメント「Compose」は Defaults 由来 |
| outlined の focus 枠線色 | **on-surface** | トークン `FocusOutlineColor` = OnSurface、Defaults の `outlinedCardBorder(enabled)` は状態別の色を持たない | site + トークン → **on-surface**(CD6) |
| outlined の disabled 枠線 | outline @0.12 | トークン同値、Defaults は s-c-low に合成 | **outline @0.12 半透明**(現実装のまま、軽微欄) |
| クリック可能カードのロール | button **または link** | ロールなし(`Surface(onClick)` は Role を付けない) | site → button / link を選べるように(CD2) |
| elevation の状態間アニメーション | 記載なし | `CardElevation` は 120 / 150ms の tween。internal `StyleableCard` は未実装(TODO b/554027431) | 公開 API の `CardElevation` を参照、実装の 150ms で実害なし(軽微欄) |

## 詳細対照表

### elevation(dp。site = Compose トークン)

| 状態 | filled | elevated | outlined |
|---|---|---|---|
| 静止 | 0 ✓ | 1 ✓ | 0 ✓ |
| hover | 1 ✓ | 3 ✓ | **1(実装 0)✗ CD5** |
| focus | 0 ✓ | 1 ✓ | 0 ✓ |
| pressed | **0(実装 1)✗ CD4** | **1(実装 3)✗ CD4** | 0 ✓ |
| dragged | 6 ✓ | 8 ✓ | 6 ✓ |
| disabled | 0 ✓ | 1 ✓ | 0 ✓ |

### カラー(light。site = Compose トークン、食い違いは上表)

| 項目 | filled | elevated | outlined |
|---|---|---|---|
| container | surface-container-highest ✓ | surface-container-low ✓ | surface ✓ |
| 枠線 | — | — | outline-variant 1dp ✓(hover / pressed / dragged も同じ ✓、focus **on-surface ✗ CD6**) |
| コンテンツ | on-surface ✓ | on-surface ✓ | on-surface ✓ |
| disabled container | **on-surface @0.38 ✗ CD3**(実装 s-c-highest @38%) | **surface @0.38 ✗ CD3**(実装 s-c-low @38%) | surface ✓ |
| disabled 枠線 | — | — | outline @0.12 ✓ |
| disabled コンテンツ | on-surface @0.38 ✓ | ✓ | ✓ |

### state layer・フォーカス(全バリアント共通)

| 状態 | site | Compose | 実装 |
|---|---|---|---|
| hover | on-surface 0.08 | 0.08 | 0.08 ✓ |
| focus | 0.1 + focus indicator | 0.1(ripple) | FocusRing のみ **✗ CD8(#194)** |
| pressed | 0.1(ripple) | 0.1 + ripple | 0.10 + 波紋 ✓ |
| dragged | 0.16 | 0.16(ripple の DragInteraction) | 0 **✗ CD7** |
| フォーカスリング | secondary 3dp / offset 2dp | ripple の focus 表示 | secondary 3px / offset 2px ✓ |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 静的カード | ロールなし・タブストップなし・hover / ripple なし | 非クリック `Surface` | ✓ |
| クリック可能カード | タブストップ、Space / Enter で実行、button / link ロール | `Surface(onClick)`(ロールなし、`minimumInteractiveComponentSize`) | `div[role=button]`・Enter / Space ✓、link **✗ CD2** |
| 入れ子の要素 | 各アクション要素がタブストップで Space / Enter が効く | 子の clickable が自分のキーを処理 | 子のキーをカードが横取り **✗ CD1** |
| アクションの入れ子 | 置かない | — | 防がない(axe `nested-interactive`、軽微欄) |
| disabled | — | 入力を受けず、支援技術にも disabled | `aria-disabled`・タブ順除外・Ripple / FocusRing なし ✓ |
| dragged | 持ち上げ時に elevation を上げる、ドラッグには単一ポインタの代替を | DragInteraction で elevation / state layer | `dragged` prop で elevation ✓・state layer **✗ CD7** |
| reduced motion | — | — | 影の遷移なし ✓ |

## 手順メモ(今回わかったこと)

- Cards の site は token-viewer が1つでセット3つ(Card - Elevated / Filled / Outlined)。サイズ系セットはない
- 色の hex だけでは紛らわしい行(#FEF7FF は surface と surface-bright の両方、#1D1B20 の disabled container など)は、
  行の `info` ボタンを `page.evaluate` でクリックすると `.cdk-overlay-container` に `md.sys.color.*` → `md.ref.*` の
  参照チェーンが出る。ロールの確定に使える
- ストーリーが variant を固定していて URL args で切り替えられないときは、`page.evaluate` でルートの
  `data-variant` / `data-disabled` / `data-dragged` を書き換えれば CSS はそのまま効く(属性駆動のスタイル)
- 子孫を持つ `role="button"` コンテナは、入れ子の `<button>` / `<input>` に対するキー操作を必ず一時テストで試すこと
  (keydown のバブリングで横取りされる)
