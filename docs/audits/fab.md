# Fab 監査レポート(2026-09-30)

Phase B。FAB の4サイズ(small 40 / regular 56 / medium 80 / large 96)× 6配色(`color` primary / secondary /
tertiary × `tonal`、Phase A A6 #17 / #92)、Extended FAB(`label`)、`expanded` によるモーフと `followContainer`
(A9 #119)、`disableElevation`・`disabled` を3ソースで突き合わせた:

1. **m3.material.io** — `/components/floating-action-button/specs|accessibility|guidelines` と
   `/components/extended-fab/specs|accessibility|guidelines`。Playwright MCP で上段 token-viewer の全セット
   (FAB: Size - Regular / Medium / Large、Color - Tonal primary / Tonal secondary / Tonal tertiary / Primary /
   Secondary / Tertiary の9セット。Extended FAB: Size - Small / Medium / Large + 同じ Color 6セットの9セット)を
   visibility 表示のまま全展開して取得(シェイプ `rounded_corner 16dp`、elevation `layers 6dp`、タイポは
   `font_download … format_size 16pt` の文字列で読めた)。下段の baseline viewer は FAB が「Color - Surface」
   のみ(非推奨の surface FAB)、Extended FAB は baseline(旧)仕様のため参照のみ。各 Color セット末尾の
   `[Deprecated]` 行(lowered elevation・focus indicator・旧 label-large など)は警告アイコン付きで失効扱い
2. **Compose androidx-main** — `FloatingActionButton.kt`(FloatingActionButton / Small / Medium / Large、
   Small / Medium / Large `ExtendedFloatingActionButton`(content 版と `expanded` 版)、旧
   `ExtendedFloatingActionButton`、`FloatingActionButtonDefaults`・`FloatingActionButtonElevation` は**同じ
   ファイル内**)、`internal/Elevation.kt`、`Surface.kt`、`Ripple.kt`、`MotionScheme.kt`、tokens(`FabSmall` /
   `FabBaseline` / `FabMedium` / `FabLarge` / `ExtendedFabSmall` / `Medium` / `Large` / `ExtendedFabPrimary` /
   `FabPrimaryContainer` / `FabSecondaryContainer` / `Elevation` / `State` / `Shape` / `TypeScale` /
   `ExpressiveMotion` / `StandardMotion`)。`ComposeMaterial3Flags` に FAB の分岐は**なし**。tertiary-container や
   solid(primary / secondary / tertiary)の FAB トークンファイルは存在せず、色は `containerColor` +
   `contentColorFor` で決まる
3. **実装** — `src/components/Fab/Fab.tsx`, `useFabMorph.ts`, `Fab.module.css`, テスト(15件、全通過)・
   ストーリー(7話)。Storybook(dev)で4サイズの `getBoundingClientRect` / 角丸 / 影、Extended の
   4サイズ × static / morph(`args=label:Create;size:…;expanded:!true`)の寸法とタイポ、hover / 押下 / Tab
   フォーカス時の影・state layer・リング、small の当たり判定(`elementFromPoint`)、disabled × tonal /
   solid / morph / disableElevation の computed 色、RTL(`dir=rtl`)の Extended(static / morph)を実測

**共有実装について**: state layer は共有 `Ripple`(hover 0.08 の平面レイヤー + 押下 0.10 の波紋、`--md-ripple-color`
を読む)、フォーカス表示は共有 `FocusRing`。Fab は `--md-ripple-color: var(--_state-layer-color)` を正しく設定し
ている(全配色で content 色と一致を実測)。**FabMenu は Fab を再利用していない**(独自の `.fab` / `.item` CSS と
button を持つ)ため、FabMenu 固有の所見は `docs/audits/fab-menu.md`(FM)に分けた。両方に効く共有の所見
(focus state layer)はこのレポートの FB4 に一度だけ記録し、fab-menu.md から参照する。Button / IconButton の
監査ルーリング(state layer 0.08/0.10/0.10、B5 の押下モーフ、IB5 の focus state layer 欠落)を踏襲した。

## 結論サマリ

**一致している(修正不要)**:

- **FAB サイズ(実測)**: small 40×40・regular 56×56・medium 80×80・large 96×96、アイコン 24 / 24 / 28 / 36
  (site トークン。Compose Defaults も 36 — `FabLargeTokens.IconSize` 32 は TODO 付きで不使用)、
  左右余白 8 / 16 / 26 / 30(= (高さ − アイコン)/ 2)
- **シェイプ(静止)**: 12 / 16 / 20 / 28(small は Compose `smallShape` = CornerMedium、他は site トークン =
  Compose Defaults。medium の 20 は Compose も `ShapeDefaults.LargeIncreased` を TODO 付きで直書き)
- **配色**: 既定 primary-container / on-primary-container(site「Primary container (default)」、Compose
  `FloatingActionButtonDefaults.containerColor`)、tonal secondary / tertiary の container 系、`tonal={false}` の
  primary / secondary / tertiary + on-* — site の6カラーセットと完全一致(A6 の API 形は決定済み)。state layer 色 =
  アイコン色(site「state layer color is the same as the icon color」)を全配色で実測一致
- **elevation**: 静止 level3(6dp)・hover level4(8dp)・focus level3・pressed level3(site 全 Color セット =
  Compose `elevation()` 6/8/6/6)。`disableElevation` で影なし(Compose `bottomAppBarFabElevation()` 0 相当)
- **state layer の不透明度**: hover 0.08 / pressed 0.10(トークン参照)
- **フォーカスリング**: secondary 3px・offset 2px・角丸追従(site の旧 focus indicator 行と同値)
- **Extended FAB の構造**: アイコン先頭 + ラベル、container はラベル幅に追従、ラベルは 1 行(`nowrap`)、
  アイコンなし Extended も可(site「extended FABs don't require an icon」)、RTL でアイコンがラベルの右へ鏡映
  (static / morph とも実測。site「Extended FABs should mirror their elements in RTL」)
- **Extended のモーフ(`expanded`)**: 折りたたみ時は各サイズの正方形 FAB(regular 56×56・large 96×96 を実測)、
  ラベルはクリップ + フェード、アイコンは先頭固定、ばねは Compose の値(拡張 FastSpatial 0.6/800・フェード
  DefaultEffects / FastEffects。下記「軽微」参照)、`prefers-reduced-motion` で即時。`followContainer` は A9 どおり
- **アクセシブルネーム**: アイコンは `aria-hidden`、Extended は可視ラベルが名前になる(折りたたみ中もラベル
  テキストが DOM に残るため名前は保たれる — テスト済み)。site「a11y label must include the same first word as
  the visible label」「label and icon treated as one focusable element」「tooltip not required」と整合
- **挙動**: ネイティブ `<button type="button">` で Tab フォーカス・Space / Enter 起動(site キー表)、MUI 流の
  `onClick`、axe 違反なし(icon-only + `aria-label`、Extended)
- **disabled(ライブラリ独自の拡張)**: 全配色・tonal・morph・`disableElevation` の組み合わせで container
  on-surface 12%・content on-surface 38%・影なし・Ripple / FocusRing なしを実測(詳細度の漏れなし — 下記「軽微」)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| FB1 | **Extended FAB が旧 baseline の寸法・タイポのまま** | 全サイズ共通で label **label-large**(14/20)・padding **16 / 20**・icon–label gap **12**(morph はラベル行に 12 + 末尾 4)・`min-width: auto`。実測: `size="large"` + label = 高さ 96 に 14px ラベル・16/20 余白 | site「baseline extended FAB は非推奨 … small extended FAB を使う。タイプは label large → title medium、内側余白を縮小」。サイズ別(site トークン = Compose Defaults): **small ext** 56・title-medium・icon 24・16 / 8 / 16・角 16 / **medium ext** 80・title-large・28・26 / 12 / 26・角 20 / **large ext** 96・headline-small・36・28 / 16 / 28・角 28。折りたたみ幅 = 高さ(Compose `minWidth`)。40dp の Extended は仕様に存在しない | 中(Expressive の主要差分・視覚差分大) |
| FB2 | **small FAB(40dp)に 48dp のタッチターゲットがない** | `::before` なし。端から 3px 外の `elementFromPoint` は親要素(実測) | Compose は全 FAB を clickable `Surface` で描き `minimumInteractiveComponentSize()`(48dp)が掛かる。プロジェクト規約「48dp minimum via `::before`」 | 低 |
| FB3 | **押下時の角丸モーフは仕様にない** | `:active` で 12→8 / 16→12 / 20→16 / 28→16(small 押下中 8px を実測)、`cubic-bezier(0.34, 1.4, 0.5, 1)` 250ms | site の FAB / Extended FAB トークンは container shape のみ(pressed shape 行なし)、states 図にもシェイプ変化なし。Compose の FAB は固定 `shape` 1つ(Button / IconButton の `shapes` / `shapeForInteraction` がない)→ **押下モーフなし** | 低 |
| FB4 | **focus の state layer 0.10 がない**(共有 `Ripple`。FabMenu のトグル・項目も同じ) | Tab フォーカスで state layer opacity 0(実測)。FocusRing のみ | site の全 Color セット(FAB・Extended FAB・FAB menu)「focused state layer opacity 0.1」、states 図「Focused (10% state layer)」。Compose ripple は StateTokens.Focus 0.1。IconButton IB5(#194)と同じ扱い | 低 |

Issue: FB1 → #197、FB2 → #198、FB3 → #199、FB4 → #200(FabMenu 分も同じ Issue。IconButton #194 と同じ `Ripple` 修正で
まとめて解決できる)

**対応(2026-09-30)**: FB1〜FB3 を修正。FB1 の `size="small"` + `label` は **56dp の small extended FAB に
フォールバック**(dev 警告なし、JSDoc に記載)。モーフは Compose のサイズ別 Extended と同じく、アイコンを leading
space に固定したまま幅を lerp(折りたたみ幅 = 高さ)し、ばねは往復とも FastSpatial / FastEffects(motion-scheme
トークン `--md-sys-motion-spring-fast-*` から読む — B2)。ストーリーの meta `aria-label` を削除し Extended のサイズ別
ストーリーを追加。

**軽微(判断・記録のみ)**:

- **disabled を持つこと自体**: site a11y「Don't disable the FAB. If the action is unavailable, the FAB shouldn't
  appear」、Compose の FAB には `enabled` 引数がない。ネイティブ `disabled` はそのまま残してよい(HTML 属性の自然な
  受け皿)が、JSDoc で「FAB は無効化せず非表示にする」を案内するとよい。値は Button B4a に合わせるなら container
  on-surface **10%**(現 12%)— どのソースにも FAB の disabled 値がないため発行しない
- **Extended モーフのばね**: 実装は旧 `ExtendedFloatingActionButton(expanded)` の組(拡張 FastSpatial・縮小
  **DefaultSpatial**、フェードイン **DefaultEffects**・アウト FastEffects)。Expressive のサイズ別
  `Small/Medium/LargeExtendedFloatingActionButton(expanded)` は幅・フェードとも往復で **FastSpatial / FastEffects**。
  FB1 でサイズ別仕様に移る際に新しい組へ揃えると一貫する(どちらも Compose 由来なので単独では発行しない)
- **既定サイズ**: 実装 `regular`(56)、site guidelines「Medium FAB (most recommended)」、Compose の
  `FloatingActionButton` は 56。既定値の変更は破壊的な見た目変更なので現状維持(JSDoc で medium を推奨)
- **small FAB**: site「no longer recommended — use a larger size」だが「still available」。維持(JSDoc で非推奨を案内)
- **ツールチップ**: site「hover / focus で FAB のラベルをツールチップ表示(web)」。IconButton と同じく `Tooltip` との
  組み合わせで満たす設計。Extended はツールチップ不要(site)
- **elevation の遷移**: 実装は box-shadow 150ms standard、Compose は入り 120ms FastOutSlowIn / 戻り 150ms(press・focus)
  / 120ms(hover)。差は知覚できず維持
- **ストーリーのラベル不一致**: meta の既定 args `aria-label: 'Edit'` が Extended / Disabled / DisableElevation の
  Extended にも渡り、可視ラベル「Create」「Navigate」「Compose」と名前が食い違う(WCAG 2.5.3 Label in Name。site
  「a11y label must include the same first word as the visible label」)。コンポーネントではなくストーリーの問題 —
  FB1 の修正 PR で Extended の story から `aria-label` を外すこと
- **ストーリーのカバレッジ**: Extended の medium / large、`tonal={false}` の Extended、RTL がなく VRT が撮っていない。
  FB1 の修正 PR で追加すること
- **テスト追加候補**: Space / Enter 起動、small の 48dp ターゲット(FB2)、reduced motion 下の morph 即時反映

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| large FAB のアイコン | 36dp | トークン 32、Defaults `LargeIconSize` = 36(TODO「token is incorrect」) | site + Defaults → **36**(現実装のまま) |
| medium / large Extended の icon–label gap | 12 / 16 | トークン 16 / 20、Defaults 12 / 16(TODO「token is incorrect」) | site + Defaults → **12 / 16**(FB1) |
| medium FAB / medium Extended の角丸 | 20dp | トークンはコメントアウト、Defaults `ShapeDefaults.LargeIncreased` 20(TODO) | 両者一致 → **20**(現実装のまま) |
| Extended の最小幅 | baseline 行「80dp min」(旧仕様)。新サイズ別は記載なし | 旧 `ExtendedFloatingActionButton` 80、新サイズ別は高さ(56/80/96) | 新サイズ別に従う → **高さと同じ**(FB1) |
| Extended のアクセシブルネーム | 可視ラベルと同じ語で始める。ラベル + アイコンで1つのフォーカス対象 | ラベル行を `clearAndSetSemantics {}` し、名前はアイコンの contentDescription から | Web は可視ラベルを名前にする方が WCAG 2.5.3 に適う → **可視ラベル**(現実装のまま) |
| focus 時の elevation | 6dp(= 静止) | `elevation().focusedElevation` 6dp | 一致 → level3(現実装のまま) |
| lowered elevation(1 / 3 / 1 / 1) | `[Deprecated]` 行 | `loweredElevation()` は現存 | 失効行 → **採用しない**(`disableElevation` の 0 のみ) |
| disabled | 「FAB を disabled にしない」 | `enabled` 引数なし | 仕様外の拡張として維持(軽微欄) |
| 押下シェイプ | pressed shape 行なし | 固定 shape | 一致 → **モーフなし**(FB3) |
| titleMedium の字間 | 0.15pt | TypeScaleTokens 0.2.sp | typescale 全体の問題で FAB 固有ではない — 対象外(`typescale.css` の値に従う) |

## 詳細対照表

### FAB サイズ(site = Compose Defaults = 実測)

| | small | regular | medium | large |
|---|---|---|---|---|
| container | 40×40 ✓ | 56×56 ✓ | 80×80 ✓ | 96×96 ✓ |
| アイコン | 24 ✓ | 24 ✓ | 28 ✓ | 36 ✓ |
| 角丸(静止) | 12 ✓ | 16 ✓ | 20 ✓ | 28 ✓ |
| 押下時の角丸 | **なし(実装 8 ✗ FB3)** | **なし(実装 12 ✗)** | **なし(実装 16 ✗)** | **なし(実装 16 ✗)** |
| タッチターゲット | **48(実装 40 ✗ FB2)** | 56 ✓ | 80 ✓ | 96 ✓ |

### Extended FAB(site トークン = Compose Defaults)

| FAB `size` → 仕様 | 高さ | label | アイコン | leading / gap / trailing | 角丸 | 実装(static / morph) |
|---|---|---|---|---|---|---|
| small(40) | — 仕様なし | — | — | — | — | 40 高・label-large・16/12/20 **✗ FB1** |
| regular → small ext | 56 | title-medium | 24 | 16 / 8 / 16 | 16 | label-large・16/12/20(morph 16/12+4/16)**✗ FB1** |
| medium → medium ext | 80 | title-large | 28 | 26 / 12 / 26 | 20 | label-large・16/12/20(morph 26/12+4/26)**✗ FB1** |
| large → large ext | 96 | headline-small | 36 | 28 / 16 / 28 | 28 | label-large・16/12/20(morph 30/12+4/30)**✗ FB1** |
| 折りたたみ(morph) | 高さと同じ正方形 | — | — | — | — | 56×56 / 96×96 ✓ |

### カラー(light。site 6セット、Compose は `containerColor` + `contentColorFor`)

| 配色 | container | icon / label / state layer | 実測 |
|---|---|---|---|
| primary(tonal、既定) | primary-container | on-primary-container | ✓ |
| secondary(tonal) | secondary-container | on-secondary-container | ✓ |
| tertiary(tonal) | tertiary-container | on-tertiary-container | ✓ |
| primary(`tonal={false}`) | primary | on-primary | ✓ |
| secondary(`tonal={false}`) | secondary | on-secondary | ✓ |
| tertiary(`tonal={false}`) | tertiary | on-tertiary | ✓ |
| disabled(仕様外) | on-surface 12% | on-surface 38% | 全配色で一貫(軽微欄) |

### 状態・挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| elevation 静止 / hover / focus / pressed | 6 / 8 / 6 / 6 dp | 6 / 8 / 6 / 6 dp | level3 / level4 / level3 / level3 ✓ |
| hover | 0.08 | 0.08 | 0.08 ✓ |
| focus | 0.10 + フォーカス表示 | 0.10 | FocusRing のみ **✗ FB4** |
| pressed | 0.10 | 0.10 + ripple | 0.10 + ripple ✓ |
| フォーカスリング | secondary 3dp offset 2dp(旧行) | — | secondary 3px offset 2px ✓ |
| キー操作 | Tab / Space / Enter | Role.Button | ネイティブ button ✓ |
| ラベル | アクションを表す(icon-only)/ 可視ラベルと同じ語(Extended) | icon の contentDescription | `aria-label` / 可視ラベル ✓ |
| RTL | Extended はアイコンとラベルを鏡映 | — | ✓(実測) |
| Extended モーフ | シェイプ変化・アイコン移動・ラベルフェードイン | FastSpatial 幅 + FastEffects 透明度(新)/ 旧は DefaultSpatial・DefaultEffects を併用 | 旧の組(軽微欄)、reduced motion 即時 ✓ |
| タッチターゲット | — | 48dp(Surface) | small のみ **✗ FB2** |

## 手順メモ(今回わかったこと)

- FAB と Extended FAB は site 上で**別ページ**(`/components/floating-action-button/*` と `/components/extended-fab/*`)。
  Extended の Expressive サイズ別トークン(Small / Medium / Large)は後者の上段 viewer にあり、FAB ページの
  Size セットには Extended の値がない
- FAB の上段 viewer には small FAB の Size セットがない(small は「not recommended」)。small の寸法は Compose
  (`FabSmallTokens` / `smallShape`)から取る
- Compose の `FloatingActionButtonDefaults` は `FloatingActionButton.kt` の中にある(IconButton と違い別ファイル
  ではない)。tertiary-container / solid 配色の FAB トークンファイルは存在しない — 色は `contentColorFor` で決まる
- Storybook の URL args(`&args=label:Create;size:large;expanded:!true`)で、ストーリーにない組み合わせ
  (Extended × サイズ、disabled × tonal など)を再ビルドなしで実測できる
- `document.activeElement` の `textContent` をそのまま返すと、フォーカスが body に抜けたとき Storybook の
  テンプレート全文が出力される — 名前は `slice()` で切ること
