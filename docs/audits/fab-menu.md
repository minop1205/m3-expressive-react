# FabMenu 監査レポート(2026-09-30)

Phase B。Expressive の FAB menu(`FabMenu` + `FabMenuItem`、color primary / secondary / tertiary、
`open` / `defaultOpen` / `onOpenChange` — Phase A A3)を3ソースで突き合わせた:

1. **m3.material.io** — `/components/fab-menu/specs|accessibility|guidelines`。Playwright MCP で token-viewer の全7セット
   (FAB menu - Common、close button - Color - Primary / Secondary / Tertiary、list items - Color - Primary /
   Secondary / Tertiary)を visibility 表示のまま全展開して取得(シェイプは `rounded_corner Circular`、elevation は
   `layers 6dp` / `0` の文字列で読めた)。本文の Measurements(「items share the medium button specs」「close button
   always 56dp」「On web … inherits its states and specs from the baseline menu component … 4dp」)、a11y の初期
   フォーカス・フォーカス順・ラベル要件、guidelines の RTL・2〜6項目・配色の対応・任意サイズの FAB も抽出
2. **Compose androidx-main** — `FloatingActionButtonMenu.kt`(`FloatingActionButtonMenu` / `FloatingActionButtonMenuScope` /
   `FloatingActionButtonMenuItem` / `ToggleFloatingActionButton` / `ToggleFloatingActionButtonDefaults`)、
   `FloatingActionButtonMenuSamples.kt`(ラベル・traversal・キー操作の配線は**サンプル側**)、`tokens/FabMenuBaselineTokens`、
   `MotionScheme` / `ExpressiveMotionTokens`。`ComposeMaterial3Flags` に分岐なし
3. **実装** — `src/components/FabMenu/FabMenu.tsx`, `FabMenu.module.css`, テスト(6件、全通過。axe は open 状態で
   違反なし)・ストーリー(4話)。Storybook(dev)で open 時の寸法・配色・影・間隔、閉状態 / 開状態の Tab 順、
   Enter で開いた後のフォーカス・矢印キー、項目から Escape したときのフォーカス、RTL(`dir=rtl`)の配置を実測。
   一時テストで閉状態の a11y ツリー(menuitem が露出)、Fragment 渡しのスロット数、閉 / 開の axe を確認

**Fab との関係**: FabMenu は `Fab` を**再利用していない**(独自の 56dp `.fab` ボタンと `.item` を持つ)。共有部品は
`Ripple` / `FocusRing` のみで、`--md-ripple-color` はトグル(閉: on-*-container、開: on-*)・項目(on-*-container)とも
正しく設定されている。**focus state layer 0.10 の欠落は Fab と共通 → `docs/audits/fab.md` FB4(#200)に一本化**
した(本レポートでは再掲しない)。

## 結論サマリ

**一致している(修正不要)**:

- **項目(menu item)**: 高さ 56・完全な丸(Circular)・leading / trailing 24・icon–label 8・アイコン 24・ラベル
  title-medium(16/24 500)(site Common セット = Compose `FloatingActionButtonMenuItem`。site「items share the medium
  button specs」)、container / label・icon は選んだ色セットの `*-container` / `on-*-container`(site list items 3セット
  = Compose 既定 primaryContainer + `contentColorFor`)、state layer 色 = ラベル色
- **トグル(close button)**: 開いた状態 56×56・完全な丸・container primary / secondary / tertiary + icon on-*(site close
  button 3セット、Compose `ToggleFloatingActionButtonDefaults.containerColor` primaryContainer → primary)、閉じた状態は
  regular FAB(56・角 16・`*-container`)。角丸 16 → full のモーフは跳ねるばね(Compose のトグルは Expressive
  **FastSpatial** 0.6 / 800 で進捗を駆動 — CLAUDE.md の「bouncy spring の箇所のみ springy easing」に合致)
- **トグルの elevation**: 静止 level3(6dp)・hover level4(8dp)(site close button セット。Compose は 6dp 固定 —
  下記裁定)
- **ARIA / 開閉**: トグルは `aria-haspopup="menu"` + `aria-expanded`、開いても**フォーカスはトグルに留まる**(site
  「initial focus remains on the close button」を実測)、項目の活性化・Escape・外側クリックで閉じる、controlled /
  uncontrolled + `onOpenChange`(A3)、項目は `role="menuitem"` のネイティブ button(Space / Enter)
- **タッチターゲット**: 全要素 56 以上(site「FAB menu elements meet the minimum target size of 48dp」)
- **スクリム**: なし(site・Compose ともなし)
- **フォーカスリング**: secondary 3px・offset 2px
- **reduced motion**: 項目の出入り・トグルの遷移とも `transition: none`
- **axe**: 開 / 閉とも違反なし(ただし FM1 は axe で検出されない種類の問題)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| FM1 | **閉じた状態でも項目がフォーカス可能・支援技術に露出** | `opacity: 0` + `pointer-events: none` のみ。閉状態の Tab が不可視の New note → Reminder → Image → Voice → FAB の順に進む(実測)。`getAllByRole('menuitem')` も閉状態で項目を返す(一時テスト) | Compose は非表示項目のセマンティクスを除去(`shouldClearDescendantSemantics = !visible()`)。site のフォーカス順は開いた後の項目のみ。閉状態では `inert` 等で Tab 順・a11y ツリーから外す | 高 |
| FM2 | **フォーカス順と menu のキー操作** | DOM 順が「項目 → トグル」。開いた状態でトグルから Tab するとコンポーネント外へ抜け、Shift+Tab で項目を**下から**辿る(実測)。`role="menu"` なのに矢印 / Home / End・roving tabindex なし(ArrowDown はトグルに留まる、実測) | site a11y「focus remains on the close button … then moves from the **top** menu item to the bottom」(close → 1st → 2nd → 3rd)、web は「FAB と menu の a11y ガイドラインに従う」。Compose はトグルで Tab / ↓ → 項目列へ(FloatingActionButtonMenu.kt:137-153)、サンプルは先頭項目で ↑ / Shift+Tab → トグル | 中 |
| FM3 | **閉じたときにフォーカスがトグルへ戻らない** | 項目にフォーカスして Escape → 閉じるがフォーカスは不可視の項目に残る(実測)。項目の活性化でも同じ | APG menu button: Escape で閉じてボタンへ戻す。Compose サンプルも項目 onClick で閉じてトグルへ | 中 |
| FM4 | **トグルの名前が開閉で入れ替わる** | 開くと `aria-label` が `closeAriaLabel`(「Close menu」)に変わり、`aria-expanded` も併用 | site a11y: Android は「Label: Toggle menu / Role: Button / State: Expanded or collapsed」、web は「FAB のラベルは開くメニューを表す」。Compose サンプルは固定 `contentDescription = "Toggle menu"` + `stateDescription`。名前は固定し状態は `aria-expanded` で伝える(`closeAriaLabel` の扱いは API 判断) | 低 |
| FM5 | **トグルのアイコン・間隔・項目の影が仕様外** | トグル(開)のアイコン **24**(実測)、項目間 **8**(CSS)、最下項目とトグルの間 **12**、項目の影 **level1** | site Common: close button icon **20**、list item between space **4**、close button between space **8**、menu item container elevation **0**。Compose: `CloseButtonIconSize` 20(24 → 20 を進捗で補間)、`ListItemBetweenSpace` 4、`FabMenuPaddingBottom` 8、項目に影なし | 中(視覚差分) |
| FM6 | **Fragment で渡した項目が1スロットに潰れる** | `Children.toArray` は Fragment を展開しないため `<>…</>` 内の全項目が1つの `itemSlot` に入る。4ストーリーすべてが Fragment 渡しで、Open story は項目間 **0**・**左揃え**(全項目の x が同じ)・stagger 1段(実測。一時テストで直接渡し 2 スロット / Fragment 1 スロット) | 各項目が個別スロットで **trailing 揃え**(Compose `horizontalAlignment = End`、site「aligned to the trailing edge」) | 中(VRT の基準画像自体が崩れた配置) |
| FM7 | **RTL で項目列が物理的な右端に固定** | `.list { right: 0 }`。`dir=rtl` でも項目は FAB の右端から左へ伸びる(実測)— RTL で FAB を左端に置くと画面外へはみ出す | site guidelines「RTL では FAB と FAB menu を左端に揃え、要素を鏡映」、Compose の `Alignment.End` はレイアウト方向に従う → `inset-inline-end: 0` | 中 |
| FM8 | **項目の出入りモーションと stagger の順序** | 各項目が 12px 上昇 + scale 0.9 → 1(跳ねる 250ms)、固定 30ms 間隔。閉じるときも同じ遅延で**トグルに近い項目から**消える | Compose: 各項目は trailing 端から**幅 0 → 1 で開く(FastSpatial)+ 透明度(FastEffects)**、SlowEffects のばねで可視数を数える。開くときは下(トグル側)から、**閉じるときは上から**消える。site「enter / exit transition、FAB の上端 trailing の角から」(矛盾なし) | 低 |
| FM9 | **medium / large FAB から開けない** | トグルは 56 固定・閉状態は tonal 配色固定 | site「FAB menu can open from any sized FAB」「medium / large FAB では close button をその FAB の上端に揃える」、配色は primary **または** primary-container の FAB と対応。Compose `containerSizeMedium()` 80 → 56 / `containerSizeLarge()` 96 → 56、角 20 / 28 → 28、アイコン 28 / 36 → 20、トグルは元の footprint の top-end に固定 | 低(API 判断が必要) |

Issue: FM1 → #201、FM2/FM3 → #202(同じキー / フォーカス処理を書き換えるため同梱)、FM4 → #203、FM5 → #204、
FM6 → #205、FM7 → #206、FM8 → #207、FM9 → #208、focus state layer → #200(fab.md FB4)

**対応(2026-09-30)**: FM4〜FM9 を修正(FM1〜FM3 は #304 で対応済み)。FM4 / FM9 は Phase B **B24** のとおり —
`closeAriaLabel` は deprecated(無視 + 1回だけ dev 警告)、`size`(`regular` / `medium` / `large`)と `tonal` を追加。
FM8 の stagger は Compose の SlowEffects(臨界減衰)の項目数ばねを逆算した遅延で近似し(開: 下から、閉: 上から)、
各項目は trailing 端からの `clip-path` の幅リビール(FastSpatial)+ 透明度(FastEffects)。reduced motion は
透明度のフェードのみ(B3)。

**軽微(判断・記録のみ)**:

- **web 向けの別レイアウト**: site specs「On web, the FAB menu opens from the FAB, and inherits its states and specs from
  the **baseline menu** component. The gap … 4dp is recommended」、guidelines「On web, the FAB menu uses a menu component」。
  一方で site のトークン・Measurements 本文と Compose は Expressive のピル型項目。本ライブラリは Expressive 実装が目的
  なので**ピル型の見た目を維持**し、web の要求は「menu のキー操作・セマンティクス」(FM2)として取り込む。baseline
  menu 風の見た目を別途提供するかは将来の API 判断
- **項目の hover / focus / pressed elevation**: site の list item セットは enabled 0・hovered **8dp**・focused / pressed
  **6dp**。Compose の項目は影なし(トークン `ListItemContainerElevation` L3 も不使用)。0 → 8dp の浮き上がりは FAB
  セットからの複写と見られ、本文・図にも項目の影はない → **全状態 0**(FM5)とし、hover elevation は付けない
- **トグルのアイコン切り替え**: 実装は開閉と同時に即座に差し替え。Compose サンプルは進捗 0.5 で Add → Close を
  切り替え、アイコンの回転はない(実装も回転なし ✓)。FM5(24 → 20 の補間)と一緒に進捗の中間で切り替えると
  よりなめらか — 単独では発行しない
- **トグルの色遷移**: 実装は 250ms standard easing、Compose は FastSpatial の進捗で色も補間(オーバーシュート込み)。
  知覚差は小さく維持
- **トグルの hover elevation**: site close button「hovered 8dp」、Compose は 6dp 固定 → site 優先で level4 を維持
- **項目数**: site「2〜6 items」。実装は JSDoc に「up to six」とだけ書き、強制しない — dev 警告を出すかは任意
- **項目のアイコン**: site「items should always have label text … only remove the icon if necessary」。`icon` 任意・
  `children` 必須でない型 — JSDoc で案内する程度
- **スクロール**: site / Compose とも、高さが足りないとき項目がトグルの背後へスクロール(Compose は `verticalScroll`)。
  実装は `position: absolute` で上へ伸びるだけ。横向きの短い画面でのみ問題 — 将来の拡張
- **トグルのツールチップ**: Compose サンプルは `TooltipBox`(閉: 上、開: start)。`Tooltip` との組み合わせで満たせる
- **ストーリーのカバレッジ**: RTL、項目の hover / focus、Fragment を使わない項目渡しがない。FM6 / FM7 の修正 PR で追加
- **テスト追加候補**: 閉状態で menuitem が Tab 順・a11y ツリーにないこと(FM1)、フォーカス順と矢印キー(FM2)、
  Escape でトグルへ戻ること(FM3)、外側クリックで閉じること、Fragment 渡し(FM6)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| web での見た目 | web は baseline menu を継承・FAB との間 4dp | Expressive のピル型(web の区別なし) | site のトークン・本文も Expressive ピル型 → **ピル型を維持**、web 要件は menu のキー操作として採用(FM2・軽微欄) |
| 項目の elevation | enabled 0 / hovered 8 / focused・pressed 6 | 影なし(L3 トークンは不使用) | enabled 0 は両者一致、hover 以降の行は FAB セットの複写と判断 → **全状態 0**(FM5) |
| トグルの elevation | 静止 6 / hover 8 / focus・pressed 6 | 6dp 固定 | site 優先 → **hover level4**(現実装のまま) |
| トグルのアイコン | 20dp | `CloseButtonIconSize` 20(閉状態 24 から補間) | 一致 → **20**(FM5) |
| 最下項目とトグルの間 | close button between space 8dp(web 用は FAB と menu の間 4dp) | `FabMenuPaddingBottom` 8 | Expressive 側の値で一致 → **8**(FM5) |
| トグルの名前 | Android「Toggle menu」+ 展開状態、web「開くメニューを表す」 | サンプル: 固定「Toggle menu」+ stateDescription | どちらも固定名 + 状態 → **名前を固定**(FM4) |
| フォーカス順 | close → 上の項目 → 下の項目 | Tab / ↓ でトグル → 項目列、サンプルは ↑ / Shift+Tab で戻る | 一致 → FM2 |
| 閉じる操作 | (web は menu に従う) | 組み込みの外側クリック / Escape なし(サンプルは BackHandler・項目 onClick) | web の menu 慣習 → **Escape・外側クリック・項目選択で閉じる**(現実装のまま)+ フォーカス復帰(FM3) |
| 項目のタッチターゲット | 48dp 以上 | `LocalMinimumInteractiveComponentSize` を 0 に(展開アニメーションのため)。項目自体が 56 | 56 で両者を満たす(現実装のまま) |
| 項目のモーション | enter / exit transition、FAB の上端 trailing 角から | 幅 0 → 1(FastSpatial)+ 透明度(FastEffects)、閉じは上から | 矛盾なし → **Compose の動き**(FM8) |

## 詳細対照表

### 寸法(site Common = Compose Defaults)

| | 仕様 | 実装(実測) |
|---|---|---|
| トグル(開) | 56×56・Circular | 56×56・full ✓ |
| トグル(閉) | FAB と同じ(56・角 16。medium / large は 80 / 96) | 56・角 16 ✓(medium / large なし **✗ FM9**) |
| トグルのアイコン(開) | 20 | **24 ✗ FM5** |
| 項目 | 高さ 56・Circular・24 / 8 / 24・icon 24・title-medium | 56・full・24 / 8 / 24・24・16/24 500 ✓ |
| 項目間 | 4 | **8(CSS)/ 0(Fragment 渡し)✗ FM5 / FM6** |
| 最下項目とトグルの間 | 8 | **12 ✗ FM5** |
| 項目の揃え | trailing 端 | 直接渡しは ✓ / Fragment 渡しは左揃え **✗ FM6** / RTL は物理右 **✗ FM7** |
| マージン | 16dp(大画面 24dp) | 呼び出し側の責務(JSDoc 記載) ✓ |

### カラー(light。site 6セット = Compose 既定 primary)

| 色セット | トグル 閉 | トグル 開 | 項目 container / content |
|---|---|---|---|
| primary | primary-container / on-primary-container ✓ | primary / on-primary ✓ | primary-container / on-primary-container ✓ |
| secondary | secondary-container / on-secondary-container ✓ | secondary / on-secondary ✓ | secondary-container / on-secondary-container ✓ |
| tertiary | tertiary-container / on-tertiary-container ✓ | tertiary / on-tertiary ✓ | tertiary-container / on-tertiary-container ✓ |
| state layer | content 色 ✓ | on-* ✓ | on-*-container ✓ |

### 状態・挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| hover / pressed | 0.08 / 0.10 | 0.08 / 0.10 | 0.08 / 0.10 ✓ |
| focus | 0.10 | 0.10 | FocusRing のみ **✗(fab.md FB4)** |
| elevation(トグル) | 6 / hover 8 | 6 固定 | level3 / hover level4 ✓ |
| elevation(項目) | 0 | 0 | **level1 ✗ FM5** |
| 開いた直後のフォーカス | トグルに留まる | — | トグル ✓ |
| フォーカス順 | トグル → 上 → 下 | Tab / ↓ で項目へ | 項目(上 → 下)→ トグル、トグルから Tab で外へ **✗ FM2** |
| 矢印キー | menu に従う(web) | ↓ で項目へ | なし **✗ FM2** |
| Escape | menu に従う | —(サンプルは Back) | 閉じるがフォーカスは項目に残る **✗ FM3** |
| 閉状態の項目 | 非表示 | セマンティクス除去 | Tab 可能・a11y ツリーに露出 **✗ FM1** |
| トグルの名前 | 固定(Toggle menu / メニューを表す)+ 状態 | 固定 + stateDescription | 開閉で入れ替え **✗ FM4** |
| 項目のロール | Android: Button、web: menu に従う | clickable Surface(ロール指定なし) | `menuitem`(FM2 の menu パターンと整合) |
| RTL | 左揃え・鏡映 | `Alignment.End`(方向依存) | 物理右 **✗ FM7** |
| モーション | enter / exit、上端 trailing 角から | 幅 + 透明度、閉じは上から | 上昇 + 拡大、閉じは下から **✗ FM8** |
| reduced motion | — | — | 遷移なし ✓ |

## 手順メモ(今回わかったこと)

- FAB menu の site は上段 viewer 1つに7セット(Common + close button 3 + list items 3)。Common の「close button between
  space」「list item between space」が間隔の正本。本文 Measurements に web 専用の段落(baseline menu・4dp)がある
- Compose の FAB menu は、ラベル・traversal・↑ / Shift+Tab・閉じる操作の多くを**サンプル**(`FloatingActionButtonMenuSamples.kt`)
  で配線している。コンポーネント本体だけ読むと a11y 要件を取りこぼす
- `Children.toArray` で子を個別ラッパーに包むコンポーネントは、ストーリーが Fragment で子を渡していると VRT の基準画像
  ごと崩れていても気づけない。スロット数を DOM で数えること
- 不可視(`opacity: 0`)の要素が Tab 順・a11y ツリーに残っていても axe は検出しない。開閉するコンポーネントは閉状態で
  Tab を実際に押して順序を記録すること
