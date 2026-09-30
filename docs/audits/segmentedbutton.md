# SegmentedButton 監査レポート(2026-09-30)

Phase B。単一選択 / 複数選択 × ラベルのみ・アイコン + ラベル・アイコンのみ × 選択 / 非選択 / disabled(グループ全体・
セグメント単位)を3ソースで突き合わせた(Phase A で `SegmentedButtons` から改名、deprecated エイリアスは
A7 の決定どおり1リリース維持 — 対象外):

1. **m3.material.io/components/segmented-buttons/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   上段 token-viewer の**唯一のセット**「Segmented button - Outlined」を全展開して取得(visibility 表示で
   シェイプ `Circular`・寸法を文字列で読めた。警告アイコン付きの行はなし)。本文の寸法表・Density 節、
   a11y のキー表・ロール・初期フォーカス・ラベル要件、guidelines の Behavior(チェックマークへの置換)も抽出。
   **全ページ冒頭に「Segmented buttons are no longer recommended in the Material 3 expressive update … use the
   connected button group instead」の注記がある**(スコープへの影響は下記)
2. **Compose androidx-main** — `SegmentedButton.kt`(`SingleChoiceSegmentedButtonRow` /
   `MultiChoiceSegmentedButtonRow` / 両 `SegmentedButton` / `SegmentedButtonContent` / `SegmentedButtonDefaults`
   を同一ファイルに収録)、`tokens/OutlinedSegmentedButtonTokens.kt`(v0_162、SegmentedButton 用の唯一の
   トークン)、`StateTokens`・`ShapeTokens`・`Shapes.kt`(`start()` / `end()`)・`Button.kt`(`MinWidth` /
   `MinHeight` / `ContentPadding`)・`Surface.kt`・`StandardMotionTokens` / `ExpressiveMotionTokens`。
   `ComposeMaterial3Flags` の分岐・TODO による色の上書きは**なし**(motion の TODO のみ)。`@Deprecated` も**なし**
3. **実装** — `src/components/SegmentedButton/SegmentedButton.tsx`, `SegmentedButton.module.css`, テスト(8件、全通過)・
   ストーリー(3話)。Storybook(dev)で寸法・computed 色・角丸・hover / Tab フォーカス時の state layer・
   フォーカスリング・キー操作・選択時の幅変化・RTL(`dir="rtl"`)・disabled を実測。一時テストで選択 +
   disabled / セグメント単位 disabled / 複数選択 / アイコンのみ / アイコン + ラベルの axe とチェックマーク置換を確認

**スコープ**: site は Expressive で connected button group(本ライブラリでは `ButtonGroup variant="connected"`)を
推奨するが、Compose は SegmentedButton を非推奨にしておらず、site も token-viewer・寸法表を現行値として掲載
している。よって本監査は「現行の Outlined segmented button 仕様」との照合とし、コンポーネントの存廃は扱わない
(軽微欄に記録)。

**共有実装について**: state layer は共有 `Ripple`(hover 0.08 の平面レイヤー + 押下 0.10 の波紋、`--md-ripple-color`
を読む)、フォーカス表示は共有 `FocusRing`(`inset: 0` + `border-radius: inherit`)。SegmentedButton は
非選択 `on-surface` / 選択 `on-secondary-container` を `--md-ripple-color` に設定しており、実測で一致した。
Ripple は focus を扱わない(IconButton IB5 #194 / Fab #200 と同じライブラリ共通の欠落 — SG6)。

## 結論サマリ

**一致している(修正不要)**:

- **寸法**: 高さ 40(実測 40)、左右余白 12、アイコン ↔ ラベル 8(`gap`)、アイコン 18×18、セグメント最小幅 58
  (Compose `ButtonDefaults.MinWidth`)、ラベルは折り返さない(`nowrap`。site「Don't allow segments to wrap」)
- **シェイプ**: 外側 = full(20 = 40/2)、中間セグメント 0、先頭は start 側・末尾は end 側だけ丸める(Compose
  `itemShape` = `baseShape.start()` / `RectangleShape` / `baseShape.end()`)。**RTL** でも論理プロパティで
  自動的に反転(実測: RTL で「Day」が右端・右側 20px、「Month」が左端・左側 20px)
- **枠線**: **outline**(#79747E)1dp — site・Compose トークン・Defaults の3者一致(ライブラリ一般の
  「outlined は outline-variant」は本コンポーネントには当てはまらない)。隣接セグメントは 1dp 重ねて二重線に
  しない(Compose `Arrangement.spacedBy(-1dp)` と同等の `margin-inline-start: -1px`)、選択セグメントを前面へ
- **色(静止・hover)**: 非選択 container 透明 / ラベル・アイコン on-surface、選択 container secondary-container /
  ラベル・アイコン on-secondary-container、state layer 色は各内容色(site トークン)。hover 0.08・pressed 0.10
- **disabled**: ラベル・アイコン on-surface 38%、枠線 on-surface 12%(site)、選択 + disabled の container は
  secondary-container のまま(Compose `disabledActiveContainerColor`)、Ripple / FocusRing を描かない、ネイティブ
  `disabled` で Tab 対象外。disabled × 選択の詳細度漏れなし(`.segment:disabled` が `[data-selected]` より後で
  同詳細度 — 選択 + disabled の文字色 38% を実測)
- **タイポ**: Label Large(500 14/20 0.1)
- **フォーカスリング**: secondary 3px・offset 2px・角丸はセグメントに追従、フォーカス中は `z-index: 2` で前面
- **チェックマーク**: 選択時に 18dp のチェック(site anatomy「Selected icon」、Compose `ActiveIcon`)、
  アイコン + ラベルではアイコンをチェックに置き換え(site Behavior)、`showSelectedCheck` で抑止可
- **API**: 単一 / 複数を `multiSelect` で切り替える1コンポーネント、controlled / uncontrolled(`value` /
  `defaultValue`)、`onChange(event, value)`(Phase A A2 / A4)、セグメント単位の `disabled`、ref はルート
- **axe**: ラベル付きの全状態(選択 + disabled、セグメント単位 disabled、複数選択、アイコン + ラベル)で違反なし

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| SG1 | **単一選択がラジオグループとして公開されず、矢印キーで移動できない** | `role="group"` + 全セグメント `<button aria-pressed>`。Tab で1セグメントずつ移動、矢印キーは無反応(実測: Tab → Day → Tab → Week、ArrowRight で移動せず) | site a11y「Single-select segmented buttons behave like radio buttons … The label is Radiogroup」、キー表「Tab = ボタン間、Arrow keys = コンポーネント内、Space / Enter = 起動」、「Tab navigates to the button, and arrow keys navigate between the individual segments」。Compose 単一選択は `selectable` + `Role.RadioButton`、行に `selectableGroup()`。→ `role="radiogroup"` + `role="radio"` / `aria-checked`、グループで1つの Tab ストップ(roving tabindex)、矢印キーで移動(disabled をスキップ、RTL で左右反転)。初期フォーカスは site「選択状態にかかわらず先頭セグメント」(下記裁定) | 中 |
| SG2 | **セグメント幅が等分されない** | 内容幅(実測 Day 58 / Week 86.8 / Month 66.9) | site 寸法表「Segment width = Container width / total segments」。Compose 各セグメント `weight(1f)` + 行 `width(IntrinsicSize.Min)`(= 最も広いセグメントに全セグメントを揃える) | 中 |
| SG3 | **48dp のタッチターゲットがない** | セグメント高さ 40 のみ、`::before` なし(上下 3px の点はグループ外 = ヒットしない) | site「Target size 48dp」。Compose `Surface` の `minimumInteractiveComponentSize()` | 低 |
| SG4 | **アイコンのみのセグメントにアクセシブルネームがなく、選択時にアイコン自体がチェックに置き換わる** | `SegmentedButtonOption` に `aria-label` 相当がない → axe `button-name` 違反(一時テストで確認)。選択するとアイコンが消えチェックだけになる(一時テストで確認) | site a11y「icons without label text → accessibility label describes the action (e.g. Inexpensive)」。site Behavior「**アイコンとラベルの両方がある場合に**アイコンをチェックへ置き換える」— アイコンのみは置換の対象外。Compose はチェックを icon スロット、表示アイコンを label スロットに置くためアイコンは失われない | 中 |
| SG5 | **チェックマークの出現が即時で、選択のたびにレイアウトが跳ぶ** | チェック挿入で選択セグメントが +26px、行全体の幅と位置が変わる(実測: Day 選択で Day 58→75.7、Week 86.8→60.8、行の x も移動)。アニメーションなし | Compose `SegmentedButtonContent`: アイコンスロット幅(max(18, icon) + 8)を**常に確保**し、アイコンがない時はラベルを −13dp オフセットして中央寄せ → 幅は変わらない。チェックは `scaleIn(0 → 1, 原点 bottom-start, FastSpatial)` + `fadeIn(DefaultEffects)`、消える時は即時、ラベルのオフセットは FastSpatial でスライド。site guidelines も動画で同じ挙動。`prefers-reduced-motion` では遷移なし | 低 |
| SG6 | **focus の state layer 0.10 がない** | Tab フォーカスで state layer の opacity 0(実測)。FocusRing のみ | site「focus state layer opacity **0.1**」(非選択 on-surface / 選択 on-secondary-container)。Compose `ripple()` = StateTokens.Focus 0.1。IconButton IB5 と同じ共有 `Ripple` の欠落 | 低 |

Issue: SG1 → #210、SG2 → #211、SG3 → #212、SG4 → #213、SG5 → #214、SG6 → #194 に合流(共有 `Ripple` の
`:focus-visible` 対応で一括修正する方針のため重複起票せず、#194 にコメントで追記)

**軽微(判断・記録のみ)**:

- **Expressive での位置づけ**: site は「Expressive では推奨されない、connected button group を使う」と明記。Compose は
  非推奨にしておらず Expressive トークンもない(motion scheme のみ追従)。本ライブラリは `ButtonGroup
  variant="connected"` を別途持つ → 当面は両方を維持し、SegmentedButton の JSDoc / Storybook に
  「Expressive では connected ButtonGroup を推奨」と一文添えるとよい。廃止判断は API 決定事項(今回は起票しない)
- **複数選択のロールとキー操作**: site は「checkbox のように振る舞う」「role は Checkbox」、Compose は
  `toggleable`(Role 指定なし)・行に `selectableGroup` なし。実装の `aria-pressed` トグルボタンは状態を正しく
  伝え axe も通過する(Chip / IconButton と同じ判断)→ **維持**。矢印キー移動は site の本文(Arrow keys)と
  図のキャプション(「Use Tab to navigate through segments」)が矛盾 → SG1 の修正時に複数選択も矢印 +
  単一 Tab ストップ(APG Toolbar パターン)へ揃えるかを判断
- **Density**: site「密度を1段下げるごとに高さ −4dp」、Compose `ButtonDefaults.MinHeight` は精密ポインタ環境で 36dp。
  ライブラリに密度の仕組みがなく、既定 40dp は一致 → 対象外
- **外側の角丸**: `20px` 固定。CLAUDE.md の規約は `calc(var(--_height) / 2)`。見た目は同じ(高さ 40 固定)なので
  SG2 の修正時に併せて直す程度
- **disabled の区切り線**: 半透明の枠線(on-surface 12%)を 1px 重ねるため、区切り線だけ濃くなる(約 23%)。
  Compose も `spacedBy(-1dp)` で同じ重ね方 → 維持
- **z-index**: Compose は押下・フォーカス中と選択(係数 5)で前面化、実装は選択 1 / `:focus-visible` 2。押下時の
  前面化はないが枠線は全状態で同色のため見た目の差なし → 維持
- **単一選択の解除**: 選択中セグメントのクリックは同じ値で `onChange` を再発火(解除不可)。site guidelines は
  単一選択を「選択必須」と読める一方、a11y は「select or unselect」と書く。Compose は利用者任せ → 維持。
  同値での再発火を抑止するかは SG1 の修正時に判断
- **グループのラベル**: `role="group"`(SG1 後は `radiogroup`)に `aria-label` を必須にしていない。ストーリー・JSDoc
  で `aria-label` の指定を案内するとよい
- **2〜5 セグメント**: site の推奨。実装は制限なし(利用者の責務)→ 維持
- **大画面での最大余白**: site Placement「全幅に広げない」。SG2 で等分にしても行は `inline-flex` のまま → 維持
- **ストーリーのカバレッジ**: アイコン付き・アイコンのみ・セグメント単位 disabled・RTL のストーリーがなく VRT が
  撮っていない。SG2 / SG4 / SG5 の修正 PR でストーリーを足すこと
- **テスト追加候補**: 矢印キー移動(SG1)、アイコンのみの axe(SG4)、選択前後で幅が変わらないこと(SG5)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| Expressive での扱い | 「no longer recommended … use connected button group」 | 非推奨なし、Expressive トークンなし | 現行 Outlined 仕様で監査し、コンポーネントは維持(軽微欄) |
| disabled の枠線色 | on-surface @0.12 | トークン `DisabledOutlineColor` = OnSurface @0.12。ただし Defaults は **Outline** @0.12(`DisabledOutlineColor` を import すらしていない) | site + トークン → **on-surface 12%**(現実装のまま) |
| 選択 + disabled の container | 行なし | Defaults `disabledActiveContainerColor` = SecondaryContainer(不透明度なし) | 矛盾なし → **secondary-container**(現実装のまま) |
| state layer の色・不透明度 | 非選択 on-surface / 選択 on-secondary-container、0.08 / 0.1 / 0.1 | トークンファイルに state layer 行なし(`ripple()` が内容色 × StateTokens) | 矛盾なし → site の値(focus は SG6) |
| 単一選択のロール | Radiogroup(ラジオボタンのように振る舞う) | `Role.RadioButton` + `selectableGroup()` | 一致 → **radiogroup / radio**(SG1) |
| 初期フォーカス | 「選択状態にかかわらず先頭セグメント」(LTR は左端、RTL は右端) | 記載なし(Compose のフォーカス順は先頭から) | APG ラジオグループ(選択中の項目へ)とは異なるが、優先順位どおり **site** を採用(SG1) |
| 複数選択のロール | Checkbox | `toggleable`(Role なし) | `aria-pressed` のトグルボタンを維持(軽微欄) |
| 複数選択のキー操作 | 本文は矢印キー、図のキャプションは Tab | 行に `selectableGroup` なし | site 内部で矛盾 → SG1 の修正時に判断(軽微欄) |
| セグメント幅 | container 幅 / セグメント数 | `weight(1f)` + `IntrinsicSize.Min`(最も広いセグメントに揃える) | 両者同義 → **等分**、行の幅は最大セグメント × 数(SG2) |
| チェックマークの置換 | アイコン + ラベルのときアイコンをチェックに置換 | icon スロット既定 = チェックのみ(アイコンを置く場所は呼び出し側が選ぶ) | site → アイコンのみのセグメントではアイコンを残す(SG4) |
| 最小高さ | 40dp(密度で −4dp / 段) | 40dp、精密ポインタ環境で 36dp | 既定 **40dp**(現実装のまま、密度は対象外) |
| 枠線色 | outline | トークン・Defaults とも Outline | 一致 → **outline**(現実装のまま) |

## 詳細対照表

### 寸法・シェイプ(site = Compose)

| 項目 | site | Compose | 実装(実測) |
|---|---|---|---|
| 高さ | 40 | `ContainerHeight` 40 / `MinHeight` 40 | 40 ✓ |
| セグメント幅 | container / 数 | `weight(1f)` + `IntrinsicSize.Min` | 内容幅 58 / 86.8 / 66.9 **✗ SG2** |
| 最小幅 | — | `ButtonDefaults.MinWidth` 58 | 58 ✓ |
| 左右余白 | 最小 12 | 12(上下 8) | 12 ✓ |
| アイコン ↔ ラベル | 8 | `IconSpacing` 8 | 8 ✓ |
| アイコン | 18 | `IconSize` 18 | 18 ✓ |
| アイコンスロット | — | 常に確保(ない時はラベルを −13 オフセット) | 選択時だけ挿入 **✗ SG5** |
| 枠線 | 1 | 1(`BorderWidth`)、`spacedBy(-1dp)` で重ねる | 1、`-1px` で重ねる ✓ |
| 外側の角丸 | Circular | `CornerFull`(先頭 `start()` / 末尾 `end()`) | 20px ✓(規約上は `calc`、軽微欄) |
| 中間の角丸 | — | `RectangleShape`(0) | 0 ✓ |
| RTL | — | 論理コーナー(topStart / topEnd) | 論理プロパティで反転 ✓(実測) |
| タッチターゲット | 48 | `minimumInteractiveComponentSize()` | 40 **✗ SG3** |

### カラー(light。site = Compose トークン)

| 状態 | 非選択 | 選択 |
|---|---|---|
| container | 透明 ✓ | secondary-container ✓ |
| ラベル・アイコン | on-surface ✓ | on-secondary-container ✓ |
| 枠線 | outline ✓ | outline ✓ |
| state layer 色 | on-surface ✓ | on-secondary-container ✓ |
| hover / focus / pressed | 0.08 ✓ / **0 ✗ SG6** / 0.10 ✓ | 0.08 ✓ / **0 ✗ SG6** / 0.10 ✓ |
| disabled container | 透明 ✓ | secondary-container ✓(Compose Defaults) |
| disabled ラベル・アイコン | on-surface 38% ✓ | on-surface 38% ✓ |
| disabled 枠線 | on-surface 12% ✓(site。Compose Defaults は outline 12%) | 同左 ✓ |

### モーション

| 項目 | Compose(standard スキーム) | 実装 |
|---|---|---|
| チェック出現 | `scaleIn(0→1, 原点 bottom-start)` FastSpatial 0.9 / 1400 + `fadeIn` DefaultEffects 1.0 / 1600 | 即時 **✗ SG5** |
| チェック消去 | `ExitTransition.None`(即時) | 即時 ✓ |
| ラベルのスライド | オフセット −13 ↔ 0 を FastSpatial で | なし(幅ごと変わる)**✗ SG5** |
| アイコン ↔ チェック(アイコンあり) | `Crossfade` DefaultEffects | 即時(SG5 で併せて) |
| 色の遷移 | なし | なし ✓ |
| reduced motion | — | アニメーションなし(SG5 の修正時に必須) |

Expressive スキームでは FastSpatial が 0.6 / 800(オーバーシュートあり)。本ライブラリは standard 相当の
イージングで揃える(Button B5 と同じ扱い)。

### 状態・挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 単一選択のロール | Radiogroup | `Role.RadioButton` + `selectableGroup` | `group` + `aria-pressed` **✗ SG1** |
| 複数選択のロール | Checkbox | `toggleable` | `aria-pressed`(軽微欄) |
| Tab | コンポーネントへ移動 | — | セグメントごと **✗ SG1** |
| 矢印キー | コンポーネント内を移動 | — | 無反応 **✗ SG1** |
| Space / Enter | 選択 / 解除 | selectable / toggleable | ネイティブ button ✓ |
| 初期フォーカス | 先頭セグメント(LTR 左 / RTL 右) | — | 先頭(Tab 順)✓ — SG1 後も維持すること |
| アイコンのみのラベル | アクションを表すラベル | 呼び出し側の contentDescription | 指定手段なし **✗ SG4** |
| 選択の表現 | チェック + 色(色だけに頼らない) | `ActiveIcon` | チェック + 色 ✓(アイコンのみは **✗ SG4**) |
| フォーカスリング | secondary 3 / offset 2 | ripple の focusRingShape | ✓ |
| disabled | Tab 対象外 | `enabled = false` | ネイティブ `disabled` ✓ |
| axe | — | — | ラベルありは全状態で違反なし ✓、アイコンのみは `button-name` **✗ SG4** |

## 手順メモ(今回わかったこと)

- Segmented buttons の site は token-viewer が**1つ・1セットのみ**(「Segmented button - Outlined」)。
  メニューを開いても `check\nSegmented button - Outlined` の1項目だけで、切り替えは不要
- site の a11y ページは本文と図のキャプションでキー操作が食い違うことがある(本文 = 矢印、キャプション = Tab)。
  キャプションも抽出して突き合わせること
- Compose の `SegmentedButtonDefaults` は `SegmentedButton.kt` と同じファイル。色の Defaults がトークン
  (`DisabledOutlineColor`)を使わず別の役割(Outline)を当てているケースがあり、import 行で確認できる
- 「選択でアイコンが増える」コンポーネントは、選択前後の `getBoundingClientRect` を並べて幅・位置の跳びを
  確認すること(inline-flex の行は中央寄せで行全体がずれる)
