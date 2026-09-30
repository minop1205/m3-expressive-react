# ButtonGroup 監査レポート(2026-09-30)

Phase B。standard / connected の2バリアント × Expressive の5サイズ(xs〜xl)× 横 / 縦、押下時の幅・シェイプの隣接
インタラクション、選択(トグル)時のシェイプ、キーボード・a11y を3ソースで突き合わせた:

1. **m3.material.io/components/button-groups/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   token-viewer の全10セット(Button group standard - Size - Xsmall〜Xlarge、Button group connected - Size -
   Xsmall〜Xlarge)を visibility 表示のまま切り替えて全展開(standard の `Pressed` フォルダも展開)。測定図2枚
   (standard の padding、connected の padding + 角丸)を `=w1400` で取得して読んだ。本文の状態・測定節、a11y の
   キー表・ターゲットサイズ・ラベル、guidelines の使い分け(connected は segmented button の後継)・幅・overflow も抽出
2. **Compose androidx-main** — `ButtonGroup.kt`(`ButtonGroup`、`ButtonGroupDefaults`、`connected*ButtonShapes()`、
   `animateWidth` / `EnlargeOnPressNode`、overflow)、`ToggleButton.kt`、`MotionScheme.kt`、tokens
   (`ButtonGroupSmallTokens`・`ConnectedButtonGroupSmallTokens` — tokens ディレクトリを contents API で列挙したが
   **Small 以外のサイズのファイルは存在しない**)、`samples/ButtonGroupSamples.kt`。`ComposeMaterial3Flags` に
   ButtonGroup の分岐は**なし**。幅アニメーションの spec には `// TODO Load the motionScheme tokens from the
   component tokens file` 付きで `MotionSchemeKeyTokens.FastSpatial`
3. **実装** — `src/components/ButtonGroup/ButtonGroup.tsx`, `ButtonGroup.module.css`, テスト(5件、全通過)・
   ストーリー(4話)。Storybook(dev)で `data-size` / `data-variant` / `dir` を書き換えて全サイズの gap・角丸、
   押下中(reduced motion 下、`page.mouse.down`)の幅・transform・角丸、グループ内外の Button の `transition` を
   実測。一時テストで connected トグル群の axe(違反なし)を確認

**共有実装について**: ButtonGroup は `role="group"` の `<div>` と CSS だけのレイアウトコンテナで、色・Ripple・
FocusRing・トグル状態は子の `Button` / `IconButton` がそのまま持つ(state layer / disabled / 選択色は
`docs/audits/button.md`・`iconbutton.md` の範囲)。グループが触るのは **gap・角丸(connected)・押下時の transform
(standard)** だけ — ただしセレクタ `> button` の詳細度が子の規則に勝つため、子の挙動を上書きしてしまう箇所がある
(BGR2・BGR4)。

## 結論サマリ

**一致している(修正不要)**:

- **バリアント**: standard / connected の2種(site「Standard button group」「Connected button group」。Compose は
  `ButtonGroup` + connected 用シェイプ)。単一コンポーネント + `variant` prop(API 方針どおり)
- **サイズ語彙**: `xs / sm / md / lg / xl`(Phase A A1)。既定 `sm`
- **connected の間隔**: 全サイズ **2dp**(site トークン・図・本文「use 2dp padding」、Compose
  `ConnectedSpaceBetween` 2dp)
- **connected の外側の角**: 完全な丸(site「Fully rounded」、Compose `ShapeDefaults.CornerFull`)。静止時の内側の角は
  S で 8px(site・Compose とも 8dp)
- **standard の S の間隔**: 12dp(site・Compose `ButtonGroupSmallTokens.BetweenSpace`)
- **RTL**: 論理プロパティ(`border-start-end-radius` など)で、`dir="rtl"` で並び・内外の角が正しく反転(実測)
- **コンテナ**: 色を持たない不可視のコンテナ(site「Button groups have no color properties」)。コンテナ自体は
  フォーカスされず、Tab は先頭のボタンへ(site a11y「Initial focus should land on the first button」)
- **ラベル**: site「The button group container doesn't need to be labeled」。`aria-label` は任意で、ストーリーは付けている
- **reduced motion**: 押下の transition を `none` に(standard)
- **axe**: jsdom(既存テスト + connected トグルの一時テスト)で違反なし

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| BGR1 | **standard の間隔がサイズと逆向き** | `--_gap` 8 / 12 / 16 / 20 / 24px(xs〜xl) | site トークン・測定図・本文: **XS 18 / S 12 / M 8 / L 8 / XL 8 dp**。a11y「XS / S は 48dp ターゲット確保のため内側の余白を大きく」。Compose は S の 12dp だけ(矛盾なし)。実測: XS アイコンボタン(32px)の中心間隔 40px で 48px ターゲットが 8px 重なる | 中 |
| BGR2 | **connected の内側の角がサイズ・押下・選択で変わらない** | `--md-sys-shape-corner-small`(8px)固定。グループの規則(詳細度 0,4,1)が Button の `:active` / `data-shape-state` に勝つため、押下しても 8px のまま。選択(トグル)では外側だけ square(12px)になり内側は 8px。先頭 / 末尾の押下で外側の角が Button の pressed(8px)になる(すべて実測) | 静止 **8 / 8 / 8 / 16 / 20**(site トークン — XS は下記裁定)、押下 **4 / 4 / 4 / 12 / 16**(site トークン、Compose `connected*PressShape` = 4dp)、選択は**全体が完全な丸**(site「selected inner corner size 50%」、Compose `connectedButtonCheckedShape` = CircleShape)。押下中も外側は完全な丸のまま(Compose `connectedLeadingButtonPressShape` は内側だけ変える) | 中 |
| BGR3 | **standard の押下が「幅 +15%・隣が縮む」でなく一様な拡大** | 押下したボタンに `transform: scale(1.06)`(ラベル・高さも拡大、実測 64 → 68px)。隣は動かない | site: 押下で「そのボタンと隣のボタンの幅が変わる」、トークン pressed width multiplier **15%**、ばね damping **0.9** / stiffness **1400**(全サイズ)。Compose `animateWidth`: 押下側が `min(0.15 × 幅, 隣の圧縮上限)` だけ**幅**を伸ばし、その分を隣から取る(中央は左右半分ずつ、グループ全幅は不変)、spec は FastSpatial | 中 |
| BGR4 | **standard グループが子の transition を消す** | `.group[data-variant='standard'] > button { transition: transform … }`(0,2,1)が Button / IconButton の `transition` 一括指定を上書き。実測: グループ内 `transform 0.2s cubic-bezier(0.34, 1.4, 0.5, 1)`、単独 `box-shadow 0.15s …, border-radius 0.15s …` → グループ内ではトグルのシェイプモーフ(Button B2)・押下モーフ(B5)・elevated の hover 影が瞬時に切り替わる | 子の transition を保ったまま、グループ固有の(幅の)遷移を**追加**する | 低 |
| BGR5 | **connected の XS / S に 48dp の最小幅がない** | XS アイコンボタン 32×32(間隔 2px)で 48px ターゲットが 14px 重なる。S は 40px 幅 | site「Extra small and small connected button groups have 48dp target areas and a minimum width of 48dp」。Compose にサイズ別の connected 既定値はなく矛盾なし | 低 |
| BGR6 | **矢印キーでボタン間を移動できない** | Tab のみ。矢印キーは無反応 | site a11y「Tab でグループへ、矢印キーでグループ内の項目間を移動、Space / Enter で選択」、キー表「Arrow keys = Navigate inside the component」。Compose に Web 固有の記述はなく矛盾なし。1つの Tab ストップ(roving)にするか Tab を残すかは修正時に判断(キー表は Tab も「ボタン間」) | 低 |
| BGR7 | **選択モデル(単一 / 複数 / 選択必須)がない** | グループは選択を管理しない。各 `Button toggle` を利用者が手で配線。単一選択も独立した `aria-pressed` ボタンの集まりとして公開 | site configurations「Single-select, multi-select, selection-required」(Expressive で Available)。guidelines「connected は segmented button を置き換える」「単一 / 複数選択のトグルボタンに使う」。Compose サンプルは単一選択に `Role.RadioButton`、複数選択は ToggleButton の `Role.Checkbox`。SegmentedButton SG1(#210)の裁定 = radiogroup / radio → **API 判断が必要** | 中 |

Issue: BGR1 → #276、BGR2 → #277、BGR3 / BGR4 → #278(同じ `.group[data-variant='standard'] > button` 規則を
書き換えるため同梱)、BGR5 → #279、BGR6 → #280、BGR7 → #281(api-design)

**軽微(判断・記録のみ)**:

- **focus の state layer 0.10**: ButtonGroup 固有ではなく子の Button / IconButton の共有 `Ripple` の欠落 → #194 に集約
  (本監査では起票しない)
- **SegmentedButton との関係**: site guidelines は「connected groups should replace the baseline segmented button」、
  specs 表も M3 の connected を「Available as segmented button」と記載。Compose は SegmentedButton を非推奨にしていない
  (`@Deprecated(HIDDEN)` はバイナリ互換の2オーバーロードのみ)。本ライブラリでは `ButtonGroup variant="connected"`
  + `Button toggle` がその役割を担うが、**選択モデル(BGR7)と矢印キー(BGR6)がない現状では SegmentedButton の
  代替にならない**。SegmentedButton の存廃は BGR7 の API 判断後に決める(segmentedbutton.md の軽微欄と同じ立場)
- **connected の幅**: site guidelines「connected は置かれた面の幅いっぱいに広がり、中のボタン幅を増やす(大画面では
  最大幅を検討)」。実装は `inline-flex` で内容幅(実測 64 / 65 / 95px の不揃い)。「should」かつ利用者が `style` で
  満たせる → BGR7 の API 設計時に `fullWidth` 相当を検討
- **overflow メニュー**: site「末尾のボタンを小さいブレークポイントで overflow メニューに畳める(カスタマイズ可能)」、
  Compose `ButtonGroup(overflowIndicator = …)` は収まらない項目を `DropdownMenu` に移す。実装なし。site は任意機能の
  扱い → 現状維持(需要が出たら Menu + ResizeObserver で)
- **縦向き(`orientation="vertical"`)**: site に縦の仕様はなく「button groups don't interact vertically」。Compose は
  サンプル(`Column` + `spacedBy(-6.dp)`)のみ。connected の縦方向の角の反転は論理的に正しい → 維持
- **`role` の上書き不可**: `role="group"` が `{...rest}` の後にあるため `role="toolbar"` などを渡しても無視される。
  BGR7 で `radiogroup` を出すなら同時に整理
- **forced-colors**: 子の Button 側に枠線がなく、塗りのボタンの境界が消える(Button と共通のライブラリ全体の話)。
  ButtonGroup では起票しない
- **ストーリーのカバレッジ**: 全話が `sm`・非トグル。サイズ別、connected のトグル(単一 / 複数)、disabled を含む
  群がなく、BGR1 / BGR2 / BGR5 の大半は VRT に映らない。修正 PR で足すこと
- **テスト追加候補**: サイズ別の gap、connected の押下 / 選択時の角(computed style は jsdom で読めないため Storybook
  / VRT 側)、矢印キー移動(BGR6)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| connected XS の静止時の内側の角 | トークン **8dp**、本文・測定図 **4dp**(site 内部で矛盾) | Small のトークンしかない(8dp) | トークンを採用 → **8dp**。トークンは S〜XL で本文・図と一致し、pressed(4dp)< rest の関係も保つ。本文・図の XS=4 は pressed 値の転記と推定(BGR2)。修正時に site を再確認 |
| standard の間隔のサイズ依存 | 18 / 12 / 8 / 8 / 8 | `HorizontalArrangement` は常に 12dp(Small トークンのみ) | site → **サイズ別**(BGR1)。Compose は S 以外の値を持たず矛盾ではない |
| 押下時の幅アニメーションのばね | 0.9 / 1400(全サイズ) | `FastSpatial` — Standard スキーム 0.9 / 1400、Expressive スキーム 0.6 / 800 | site = Compose の Standard スキーム → **約150ms・オーバーシュートほぼなし**(BGR3)。Button B5 と同じ扱い |
| connected の選択時の形 | 内側の角 50%(外側は元から full) | `connectedButtonCheckedShape` = CircleShape(トークン `SelectedInnerCornerCornerSizePercent` 50 は未使用) | 結果は同じ → **全体が完全な丸**(BGR2) |
| connected の中央ボタンの静止形 | 内側 8dp | `ShapeDefaults.Small`(8dp、トークンではなく Shapes から) | 同値 → 8dp |
| 単一選択のロール | Web のロール記載なし(a11y は「選択されていることを識別できる」) | サンプルで `Role.RadioButton`、`selectableGroup` は未使用 | SegmentedButton SG1 と揃えて **radiogroup / radio**(BGR7 の判断材料) |
| SegmentedButton の位置づけ | connected で置き換える(推奨されない) | 非推奨なし | 軽微欄 — BGR7 の後に判断 |

## 詳細対照表

### 間隔(gap)

| | XS | S | M | L | XL |
|---|---|---|---|---|---|
| standard(site トークン = 図 = 本文) | 18 | 12 | 8 | 8 | 8 |
| standard(Compose) | — | 12 | — | — | — |
| standard(実装・実測) | **8 ✗** | 12 ✓ | **16 ✗** | **20 ✗** | **24 ✗** |
| connected(site = Compose) | 2 | 2 | 2 | 2 | 2 |
| connected(実装・実測) | 2 ✓ | 2 ✓ | 2 ✓ | 2 ✓ | 2 ✓ |

### connected の角(dp)

| | XS | S | M | L | XL | 実装 |
|---|---|---|---|---|---|---|
| 外側 | full | full | full | full | full | full ✓(押下中の先頭 / 末尾は 8px ✗) |
| 内側・静止(トークン) | 8(本文・図は 4) | 8 | 8 | 16 | 20 | 8 固定 — L / XL **✗ BGR2** |
| 内側・押下 | 4 | 4 | 4 | 12 | 16 | 8 のまま **✗ BGR2** |
| 選択 | 50%(完全な丸) | ← | ← | ← | ← | 外側 12px・内側 8px **✗ BGR2** |
| 最小幅 | 48 | 48 | — | — | — | なし **✗ BGR5** |

### standard の押下・選択

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 押下したボタン | 幅とシェイプが変わる | 幅 +`min(15%, 隣の上限)`、シェイプは子の Button | `scale(1.06)`(拡大)**✗ BGR3**、シェイプは Button の `:active` ✓ |
| 隣のボタン | 一時的に幅が縮む | 同じだけ縮む(全幅不変) | 不変 **✗ BGR3** |
| ばね | 0.9 / 1400 | FastSpatial | `cubic-bezier(0.34, 1.4, 0.5, 1)` 200ms **✗ BGR3** |
| 子の transition | — | — | 上書きで消える **✗ BGR4** |
| 選択(トグル) | round ⇔ square | ToggleButton の既定シェイプ | Button B2 に委譲 ✓(ただし BGR4 で瞬時) |
| reduced motion | — | — | transition なし ✓ |

### キーボード・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| コンテナのロール / ラベル | ラベル不要 | — | `role="group"`、`aria-label` 任意 ✓ |
| 初期フォーカス | 先頭のボタン(コンテナではない) | — | 先頭のボタン ✓ |
| Tab | ボタン間 | — | ボタン間 ✓ |
| 矢印キー | グループ内を移動 | — | 無反応 **✗ BGR6** |
| Space / Enter | 起動 / 選択 | — | ネイティブ `<button>` ✓ |
| 選択モデル | 単一 / 複数 / 選択必須 | サンプルで RadioButton / Checkbox | なし **✗ BGR7** |
| タッチターゲット | 各ボタン 48×48 | — | 子の `::before` 48px ✓(ただし XS の間隔 BGR1・connected の最小幅 BGR5 で重なる) |
| RTL | — | — | 並び・角とも反転 ✓ |
