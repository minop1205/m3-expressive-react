# IconButton 監査レポート(2026-09-30)

Phase B。standard / filled / tonal / outlined の4バリアント × Expressive の5サイズ(xs〜xl)× 3幅
(narrow / default / wide)× 2シェイプ(round / square)、およびトグル(選択)挙動を3ソースで突き合わせた:

1. **m3.material.io/components/icon-buttons/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   上段 token-viewer の全9セット(Color - Filled / Tonal / Outlined / Standard、Size - Xsmall / Small / Medium /
   Large / Xlarge)を全展開して取得(visibility 表示のまま切り替え、シェイプは `rounded_corner 12dp` /
   `Circular` の文字列で読めた)。下段の baseline viewer は全セット `[Deprecated]` のため対象外。本文の
   カラー表・シェイプモーフ節・角丸表・ターゲットサイズ節、a11y のキー表・ラベル・ツールチップ要件も抽出
2. **Compose androidx-main** — `IconButton.kt`(IconButton / IconToggleButton / FilledIconButton /
   FilledIconToggleButton / FilledTonalIconButton / FilledTonalIconToggleButton / OutlinedIconButton /
   OutlinedIconToggleButton、各 `shape:` / `shapes:` オーバーロード、`shapeForInteraction`)、
   `IconButtonDefaults.kt`(**別ファイル**)、`tokens/IconButtonTokens.kt`(中身は `StandardIconButtonTokens`)・
   `FilledIconButtonTokens` / `FilledTonalIconButtonTokens` / `OutlinedIconButtonTokens` /
   `XSmall`〜`XLargeIconButtonTokens`、`StateTokens`・`ShapeTokens`・`MotionScheme`・`*MotionTokens`・
   `Surface.kt`。`ComposeMaterial3Flags` に IconButton の分岐は**なし**
3. **実装** — `src/components/IconButton/IconButton.tsx`, `IconButton.module.css`, テスト(9件、全通過)・
   ストーリー(6話)。Storybook(dev)で 5サイズ × 3幅 × filled / outlined の `getBoundingClientRect`、
   全バリアント × トグル状態の hover 時 state layer 色・disabled の computed 色、押下中の角丸
   (reduced motion 下)、Tab フォーカス時のリング・state layer を実測。一時テストで4バリアントの
   disabled / 選択 + disabled / selectedAriaLabel の axe(違反なし)、ラベルなしの axe(`button-name` 違反)、
   Tab → Space / Enter でのトグル(2回で元に戻る)を確認

**共有実装について**: state layer は共有 `Ripple`(hover 0.08 の平面レイヤー + 押下 0.10 の波紋。読むのは
`--md-ripple-color` のみ)、フォーカス表示は共有 `FocusRing`(`inset: 0` + `border-radius: inherit`)。
IconButton は `--md-ripple-color: var(--_state-layer-color)` を正しく設定している(Chip CH1 の変数名ずれは
ない — 全状態で実測一致)。Button の監査ルーリング(disabled container 0.10、B5 の押下モーフ)を本監査でも
踏襲した。

## 結論サマリ

**一致している(修正不要)**:

- **サイズ(全15組を実測、filled / tonal / standard)**: 高さ 32 / 40 / 56 / 96 / 136、アイコン 20 / 24 / 24 / 32 / 40、
  左右余白(narrow / default / wide)XS 4/6/10・S 4/8/14・M 12/16/24・L 16/32/48・XL 32/48/72 → 幅 28/32/40・
  32/40/52・48/56/72・64/96/128・104/136/184(site トークン・Compose `*ContainerSize(widthOption)` と完全一致)
- **シェイプ**: round = `calc(height/2)`(Circular)、square 12/12/16/28/28、pressed 8/8/12/16/16(round・square 共通)、
  選択時に round → square(12/12/16/28/28)・square → round(site「selected container shape」/ Compose
  `Selected*Shape*`)、優先順位 pressed > selected > resting(押下中の角丸を実測)
- **outline 幅**: 1 / 1 / 1 / 2 / 3(site トークン。Compose Defaults は 1 固定 — 下記裁定)
- **色(静止・hover、トグル含む)**: filled primary / on-primary、filled 選択 primary / on-primary、tonal
  secondary-container / on-secondary-container、tonal 選択 secondary / on-secondary、outlined の枠線
  **outline-variant**・アイコン on-surface-variant、outlined 選択 inverse-surface / inverse-on-surface(枠線なし)、
  standard on-surface-variant・選択 primary。state layer の色は全状態でアイコン色と一致(site トークンどおり。
  filled 非選択トグルの on-surface-variant も一致)
- **state layer の不透明度**: hover 0.08 / pressed 0.10(トークン参照)
- **disabled(非トグル)**: アイコン on-surface 38%、standard / outlined の container なし、Ripple / FocusRing を
  描かない、ネイティブ `disabled` で Tab 対象外
- **タッチターゲット**: `::before` で 48×48 以上(XS / S の全幅で 48×48 を実測)。site「XS と S は 48×48 必須」
- **フォーカスリング**: secondary 3px・offset 2px・角丸は container に追従(filled / tonal / standard)
- **既定値**: size `sm`(site「Small (default)」)、shape `round`(site「Round (default)」)、variant `filled`
  (site「Filled (default)」— プロジェクト決定とも一致。Compose の `IconButton` は standard)
- **挙動・a11y**: ネイティブ `<button>` で Tab フォーカス・Space / Enter 起動(site キー表)、トグルは
  `aria-pressed`、controlled / uncontrolled(`selected` / `defaultSelected`)、`onChange(event, selected)`(Phase A
  A2)、`selectedIcon` で選択時に塗りアイコンへ差し替え(site guidelines「未選択 outlined / 選択 filled」)、
  アイコンは `aria-hidden`、`prefers-reduced-motion` で遷移なし(実測 0s)、axe 違反なし(選択・disabled 含む)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| IB1 | **filled トグル(未選択)の配色が旧 MD3 値** | container **surface-container-highest**・アイコン **primary**(実測) | site: container **surface-container**(#F3EDF7)・アイコン **on-surface-variant**(#49454F)、本文のカラー表も同じ。Compose `FilledIconButtonTokens.UnselectedContainerColor` = SurfaceContainer / `UnselectedColor` = OnSurfaceVariant、`filledIconToggleButtonColors()` も同値(隣の `TODO(b/228455081)` のコメント「token は Primary」は古い)。state layer(on-surface-variant)は既に正しい | 中 |
| IB2 | **disabled のトグルでアイコンが disabled 色にならない** | `.iconButton:disabled`(詳細度 0,2,0)の `--_icon-color` が、トグル状態のルール(0,3,0)に負ける。実測: filled 未選択 = primary、tonal 選択 = on-secondary(白)、outlined 選択 = inverse-on-surface、standard 選択 = primary | site・Compose とも disabled は選択状態にかかわらず **on-surface @0.38**(Compose `IconToggleButtonColors` は `!enabled` を最優先) | 中 |
| IB3 | **disabled の container 不透明度と outlined の disabled 枠線** | container on-surface **12%**(filled / tonal / outlined 選択)。outlined の枠線 on-surface **12%** | container on-surface **10%**(site 0.1、Compose `DisabledContainerOpacity` 0.1、outlined `SelectedDisabledContainerOpacity` 0.1 — Button B4a と同じ)。枠線は **outline-variant @0.38**(site の disabled outline color = outline-variant、不透明度の行なし。Compose `outlinedIconButtonVibrantBorder(enabled=false)` = OutlineColor × `DisabledOpacity` 0.38 — 下記裁定) | 低 |
| IB4 | **outlined の枠線が幅を増やし、state layer / フォーカスリングが枠線の内側に入る** | 幅 = icon + 2×padding + **2×枠線**(`width` 未指定のため border-box が効かない)。実測 outlined: XS 30/34/42、S 34/42/54、M 50/58/74、L 68/100/132、XL 110/142/190(仕様 +2 / +2 / +2 / +4 / +6)。`Ripple` と `FocusRing` は `inset: 0` で padding box に配置され、XL では hover レイヤー 136×130 が 142×136 の内側、リングの外周は外形より **1px 内側**(offset 2 − 枠線 3)で枠線に重なる | site の寸法表・トークンはバリアント共通(outlined も filled と同じ container サイズ)。Compose は `Surface(border=…)` で枠線を**shape の内側に描き**、container サイズは `*ContainerSize(widthOption)` のまま、ripple / フォーカスは container 全体 | 中 |
| IB5 | **focus の state layer 0.10 がない** | Tab フォーカスで state layer の opacity 0(実測)。FocusRing のみ | site の全カラーセット「focused state layer opacity **0.1**」、本文の状態図「Focused (10% state layer)」。Compose は `ripple()` が StateTokens.Focus 0.1 を描く。Radio R2 / Chip CH2 と同じ扱い(FocusRing に**加えて** 0.10) | 低 |
| IB6 | **シェイプモーフのばねが強すぎる** | 押下・選択とも `cubic-bezier(0.34, 1.4, 0.5, 1)` 250ms(明確なオーバーシュート) | site トークン: 全サイズ damping **0.9** / stiffness **1400**(≒ 約150ms・ごく僅か)。Compose `shapeForInteraction` は押下・選択とも **DefaultEffects 1.0 / 1600**(「バウンスを防ぐため意図的」とコメント)。IconButton は Button と違いトグルも FastSpatial を使わない → 押下・選択とも Button B5 と同じ `short3` + standard easing | 低 |

Issue: IB1 → #191、IB2/IB3 → #192(同じ `.iconButton:disabled` まわりの Disabled 節を書き換えるため同梱)、
IB4 → #193、IB5 → #194、IB6 → #195

**対応状況**: IB5 は PR #302(Ripple の focus 0.10)で解消。IB1・IB2・IB3・IB4・IB6 は `fix/iconbutton-audit` で解消 —
disabled のルールを 0,3,0 以上にしてトグル状態のルールより後に置き(`IconButton.css.test.ts` がカスケードを検査)、
outlined の枠線は `::after`(`inset: 0`・`border-radius: inherit`)で container の内側に描く(幅は filled と同一、
Ripple / FocusRing は外形基準)、モーフは押下・選択とも `short3` + standard easing。ストーリー `ToggleVariants` /
`DisabledToggles` / `Shapes` / `OutlinedSizes` を追加(軽微欄のカバレッジ不足を解消)

**軽微(判断・記録のみ)**:

- **`selectedAriaLabel` と `aria-pressed` の併用**: 実装は選択時にラベルを差し替え**つつ** `aria-pressed="true"` も
  出す(「Remove from favorites, pressed」と読まれる)。WAI-ARIA APG はトグルボタンのラベルを状態で変えないよう
  求める。site は「ラベルは実行するアクションを表す」とだけ述べ、Compose はラベルを利用者任せ(Role.Checkbox +
  状態)で、spec ソース同士の矛盾ではない → 発行せず。JSDoc で「`aria-pressed` を使うならラベルは固定、差し替える
  なら非トグル」と案内するか、`selectedAriaLabel` 指定時は `aria-pressed` を出さないかを、次に IconButton の API を
  触るときに判断
- **アクセシブルネームの強制**: `aria-label` は型上任意で、未指定でも警告なし(axe は `button-name` で検出)。
  site「アイコンボタンのラベルはアクションを表す」。`aria-label` / `aria-labelledby` のどちらかを型で必須にする
  (破壊的)か dev 警告にするかは API 判断 — 現状維持
- **ツールチップ**: site a11y「Web ではホバーでアクセシビリティラベルのツールチップを表示すべき」、guidelines も
  同様。本ライブラリは `Tooltip` と組み合わせる設計(Tooltip のストーリーが IconButton を包む)で、Compose も
  IconButton 自体はツールチップを持たない → **組み合わせで満たす**。JSDoc で案内するとよい
- **トグルのロール**: Compose は `Role.Checkbox` + toggleable、実装は `<button aria-pressed>`。Chip と同じ理由で
  **維持**(ネイティブのトグルボタン表現、axe 通過)
- **色の遷移**: 実装は background / color を 150ms で遷移、Compose は即時(`animateColorAsState` なし)。
  害がないので維持
- **サイズ別のタッチターゲット**: `::before` の `100%` は padding box 基準のため outlined M 以上では 54 / 92 / 130
  程度になるが、いずれも container 以上・48 以上で実害なし(IB4 の修正で自然に揃う)
- **選択時に塗りアイコンがない場合**: site「semibold / bold にする」。`selectedIcon` で利用者が満たす — 実装の範囲外
- **Button との横並び**: Button 監査では focus state layer を見ていない。Button も同じ `Ripple` 構成なので
  IB5 と同じ欠落がある可能性が高い(Button 側で要確認)
- **ストーリーのカバレッジ**: filled 以外のトグル、disabled のトグル、square シェイプ、outlined の各サイズがなく
  VRT が撮っていない。IB1 / IB2 / IB4 の修正 PR でストーリーを足すこと
- **テスト追加候補**: disabled トグルのアイコン色(IB2)、Space / Enter でのトグル、controlled 固定(クリックしても
  変わらない)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| filled トグル未選択の配色 | surface-container / on-surface-variant | トークン・Defaults とも同値(`TODO(b/228455081)` のコメントだけ古い「Primary」)。material-web は旧値 surface-container-highest / primary | site + Compose → **surface-container / on-surface-variant**(IB1) |
| outlined の枠線色 | outline-variant | トークン `OutlineColor` = OutlineVariant。ただし既定の `outlinedIconButtonBorder` は **LocalContentColor**、`*Vibrant*` と `shapes:` 版トグルだけ OutlineVariant | site + トークン → **outline-variant**(現実装のまま) |
| outline 幅 L / XL | 2 / 3 dp | トークンは 1/1/1/2/3 だが Defaults の border は常に `SmallIconButtonTokens.OutlinedOutlineWidth`(1dp) | site + トークン → **1/1/1/2/3**(現実装のまま) |
| outlined の disabled 枠線 | outline-variant(不透明度の行なし) | `outlinedIconButtonVibrantBorder(false)` = OutlineVariant × **0.38**(非 vibrant は LocalContentColor × 0.38)。`DisabledOutlineOpacity` トークンは存在しない | 色は両者一致、不透明度は Compose のみ → **outline-variant @0.38**(IB3)。Button B4b(outline-variant @0.1)とは Compose 側の値が違うため揃えない |
| outlined 選択 + disabled | container on-surface 0.1(枠線なし) | トークン `SelectedDisabledContainerColor/Opacity` = OnSurface 0.1 だが Defaults は未使用(disabled + checked は通常の disabled 色 = transparent) | site + トークン → **on-surface 10%**(IB3) |
| シェイプモーフのばね | 0.9 / 1400(全サイズ) | 押下・選択とも DefaultEffects 1.0 / 1600(バウンス抑止を明記)。Standard / Expressive スキームで同値 | どちらも実質バウンスなし → Button B5 と同じ **short3(150ms)+ standard easing**(IB6) |
| トグルのロール | (Web のロール記載なし) | `Role.Checkbox` + toggleable | `aria-pressed` のトグルボタンを維持(軽微欄) |
| 既定のバリアント | Filled (default) | `IconButton` = standard(バリアントは別コンポーザブル) | site + プロジェクト決定 → **filled**(現実装のまま) |
| outlined トグルの配色キャッシュ | — | `defaultOutlinedIconToggleButtonColors` が standard トグルのキャッシュを読む(IconButtonDefaults.kt:701、上流バグ) | 意図された InverseSurface / InverseOnSurface を採用(現実装のまま) |

## 詳細対照表

### サイズ × 幅(container 幅 × 高さ。site = Compose = filled / tonal / standard の実測)

| | narrow | default | wide | アイコン | outlined の実測(narrow / default / wide) |
|---|---|---|---|---|---|
| XS | 28×32 ✓ | 32×32 ✓ | 40×32 ✓ | 20 ✓ | **30 / 34 / 42 ✗ IB4** |
| S | 32×40 ✓ | 40×40 ✓ | 52×40 ✓ | 24 ✓ | **34 / 42 / 54 ✗ IB4** |
| M | 48×56 ✓ | 56×56 ✓ | 72×56 ✓ | 24 ✓ | **50 / 58 / 74 ✗ IB4** |
| L | 64×96 ✓ | 96×96 ✓ | 128×96 ✓ | 32 ✓ | **68 / 100 / 132 ✗ IB4** |
| XL | 104×136 ✓ | 136×136 ✓ | 184×136 ✓ | 40 ✓ | **110 / 142 / 190 ✗ IB4** |

左右余白(leading = trailing): XS 4/6/10、S 4/8/14、M 12/16/24、L 16/32/48、XL 32/48/72 ✓(Compose の Large
トークンだけ中央列の名前が `Uniform*`、値は同じ)

### シェイプ・枠線(site = Compose トークン)

| | XS | S | M | L | XL |
|---|---|---|---|---|---|
| round | full ✓ | full ✓ | full ✓ | full ✓ | full ✓ |
| square | 12 ✓ | 12 ✓ | 16 ✓ | 28 ✓ | 28 ✓ |
| pressed(round / square 共通) | 8 ✓ | 8 ✓ | 12 ✓ | 16 ✓ | 16 ✓ |
| 選択時(round 始まり) | 12 ✓ | 12 ✓ | 16 ✓ | 28 ✓ | 28 ✓ |
| 選択時(square 始まり) | full ✓ | full ✓ | full ✓ | full ✓ | full ✓ |
| outline 幅 | 1 ✓ | 1 ✓ | 1 ✓ | 2 ✓ | 3 ✓(幅への加算は IB4) |
| モーフのばね | 0.9 / 1400(site)・1.0 / 1600(Compose)→ 実装 250ms オーバーシュート **✗ IB6** |||||

### カラー(light。site = Compose トークン)

| 状態 | filled | tonal | outlined | standard |
|---|---|---|---|---|
| 既定 container / icon | primary / on-primary ✓ | secondary-container / on-secondary-container ✓ | 枠線 outline-variant ・icon on-surface-variant ✓ | — / on-surface-variant ✓ |
| トグル未選択 | **surface-container / on-surface-variant ✗ IB1**(実装 s-c-highest / primary) | secondary-container / on-secondary-container ✓ | 既定と同じ ✓ | on-surface-variant ✓ |
| トグル選択 | primary / on-primary ✓ | secondary / on-secondary ✓ | inverse-surface / inverse-on-surface・枠線なし ✓ | primary ✓ |
| state layer 色 | アイコン色と同じ(on-primary / 未選択 on-surface-variant)✓ | アイコン色 ✓ | アイコン色 ✓ | アイコン色 ✓ |
| disabled container | on-surface **10%**(実装 12% ✗ IB3) | on-surface **10%**(✗ IB3) | 枠線 **outline-variant @0.38**(実装 on-surface 12% ✗ IB3)/ 選択は container on-surface **10%**(✗ IB3) | — |
| disabled icon | on-surface 38% ✓(トグル未選択は **✗ IB2**) | 38% ✓(選択は **✗ IB2**) | 38% ✓(選択は **✗ IB2**) | 38% ✓(選択は **✗ IB2**) |

### 状態・挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| hover | 0.08 | 0.08 | 0.08 ✓ |
| focus | 0.10 + フォーカス表示 | 0.10(ripple) | FocusRing のみ **✗ IB5** |
| pressed | 0.10 | 0.10 + ripple | 0.10 + ripple ✓ |
| フォーカスリング | — | ripple の focusRingShape | secondary 3px offset 2 ✓(outlined は枠線に重なる **✗ IB4**) |
| キー操作 | Tab / Space / Enter | clickable / toggleable | ネイティブ button ✓ |
| タッチターゲット | XS / S は 48×48 必須、入れ子でも 48 | `minimumInteractiveComponentSize` | `::before` 48×48 ✓ |
| トグル状態の公開 | — | Role.Checkbox + state | `aria-pressed` ✓(軽微欄) |
| ラベル | アクションを表す | 利用者任せ | `aria-label`(任意)+ `selectedAriaLabel`(軽微欄) |
| ホバーのツールチップ | Web では表示すべき | なし | `Tooltip` と組み合わせ(軽微欄) |
| reduced motion | — | — | 遷移なし ✓ |

## 手順メモ(今回わかったこと)

- IconButton の site は上段 token-viewer に Color 4 + Size 5 の9セット。Size セットはヘッダ列が「Standard」で、
  ばね(damping / stiffness)と selected shape の行もここにある。visibility 表示のままなら角丸は
  `rounded_corner 12dp`・round は `Circular` の文字列で読める
- Compose の `IconButtonDefaults` は `IconButton.kt` ではなく `IconButtonDefaults.kt`、standard のトークンは
  `tokens/IconButtonTokens.kt`(オブジェクト名 `StandardIconButtonTokens`)。ファイル名で推測すると外れる
- 枠線を `border` で描き `width` を固定しないコンポーネントは、border-box でも**幅に枠線が加算される**。outlined の
  寸法は filled と並べて `getBoundingClientRect` で比較すること。`inset: 0` の子(Ripple / FocusRing)は
  padding box 基準なので枠線の内側に入る
- disabled の上書きが「状態の組み合わせ」ルールより詳細度が低いと、disabled × 選択でだけ色が漏れる。disabled は
  トグル状態との全組み合わせを computed style で確認すること
