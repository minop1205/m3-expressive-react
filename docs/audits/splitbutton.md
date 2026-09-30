# SplitButton 監査レポート(2026-09-30)

Phase B。elevated / filled / tonal / outlined の4バリアント × Expressive の5サイズ(xs〜xl)、先頭(アクション)ボタン
+ 末尾(メニュー)ボタン、末尾アイコンの回転、内側の角のモーフ、メニューの開閉・フォーカス管理を3ソースで突き合わせた:

1. **m3.material.io/components/split-button/specs** + **/accessibility** + **/guidelines** — Playwright MCP で上段
   token-viewer の全5セット(Split button - Size - Xsmall〜Xlarge)を visibility 表示のまま全展開(下段の viewer は
   Button の色セットで、本文も「色と state layer は Button と同じ」)。測定図(padding / サイズ、内側の角)と末尾
   ボタンの状態図を `=w1400` で取得して読んだ。本文の状態・測定節(アイコンの光学オフセット)、a11y のターゲット・
   フォーカス順・ラベル、guidelines の回転(standard モーションスキーム)・メニュー配置も抽出
2. **Compose androidx-main** — `SplitButton.kt`(`SplitButtonLayout`、`SplitButtonDefaults` の Leading / Trailing /
   Tonal / Outlined / Elevated の各ボタン、`*ShapesFor`・`*ContentPaddingFor`)、`SplitButton{XSmall,Small,Medium,
   Large,XLarge}Tokens`、`Button.kt`(色・elevation)、`MotionScheme.kt`、`samples/SplitButtonSamples.kt`。
   `ComposeMaterial3Flags` の直接の分岐は**なし**(`ButtonDefaults.MinHeight` 経由で precision-pointer フラグが
   サイズ判定に間接的に効くのみ、既定 false)
3. **実装** — `src/components/SplitButton/SplitButton.tsx`, `SplitButton.module.css`, テスト(8件、全通過)・
   ストーリー(6話)。Storybook(dev)で `data-size` を書き換えて全サイズの寸法・パディング・角・シェブロンの位置、
   4バリアントの色・枠線・幅、hover / 押下 / Tab フォーカス時の角と state layer、disabled の computed 色、`Open`
   話の末尾ボタンの形・回転・ARIA・メニュー位置、キーボード操作(Tab → Enter → 矢印 → Escape → 項目選択)、
   `dir="rtl"`、forced-colors を実測。axe は**メニューを開いた状態**で jsdom(一時テスト)と実ブラウザ(cdnjs の
   axe-core 4.10.2 を注入、`#storybook-root` 対象)の両方で実行 → 違反なし

**共有実装について**: SplitButton は **Button を再利用していない** — 2つのネイティブ `<button>` を自前の CSS
(Button の配色を複製)で描き、共有の `Ripple`(hover 0.08 / 押下 0.10、`--md-ripple-color: var(--_state-layer-color)`
を正しく設定)と `FocusRing` を直接使う。ドロップダウンは共有の **`Menu` を再利用**(末尾ボタンを `trigger` として
`cloneElement` し、`aria-haspopup="menu"` / `aria-expanded`、開いたときのフォーカス移動、矢印・Home / End・
タイプアヘッド、Escape / 項目選択 / Tab で閉じてトリガーへフォーカスを戻す処理、4px のアンカー間隔、上下反転を
Menu が担う)。このため Button の監査ルーリング(B3 の outlined 配色、B4 の disabled、B5 の押下モーフ)が
SplitButton には**反映されていない**(SP4・SP5・SP8)。

## 結論サマリ

**一致している(修正不要)**:

- **バリアント**: elevated / filled / tonal / outlined、既定 filled(site「Color configurations」、Compose は
  `LeadingButton` + `TrailingButton` = filled)。単一コンポーネント + `variant`
- **サイズ**: 高さ 32 / 40 / 56 / 96 / 136、既定 `sm`(site「Small (default)」)
- **間隔**: 全サイズ 2dp(site トークン・本文「The space should always be 2dp」、Compose `Spacing`)
- **XS / S の先頭ボタン**: パディング 12/10・16/12、先頭アイコン 20 / 20 / 24 / 32 / 40(site 図、Compose
  `LeadingIconSize` 20 は S 基準)。XS の末尾ボタン(22px アイコン・13/13・幅 48)
- **外側の角**: 完全な丸 = `calc(height / 2)`(site「Fully rounded」、Compose `OuterCornerSize` = CornerFull)
- **開いたときの末尾ボタン**: 内側の角も丸くなり完全な丸(site「trailing button inner corner selected size 50%」、
  Compose `TrailingCheckedShape` = CircleShape)。シェブロンが 180° 回転(site「rotates inwards 180°」)、
  standard easing(site「standard motion scheme」、Compose サンプルの既定ばねもバウンスなし)。reduced motion で
  遷移なし
- **色(filled / tonal / elevated)**: primary / on-primary、secondary-container / on-secondary-container、
  surface-container-low / primary(elevation 静止 L1・hover L2)、filled / tonal の hover L1。state layer の色は
  ラベル色と一致、不透明度 hover 0.08 / 押下 0.10(Ripple)。開いても色は変わらない(site「color doesn't change
  when selected」)
- **disabled のラベル**: on-surface 38%(Button の裁定どおり)、両ボタンとも `disabled`、Ripple / FocusRing を描かない
- **ARIA**: 末尾ボタンに `aria-haspopup="menu"` + `aria-expanded`(site「trailing は展開 / 折りたたみの状態を伝える」、
  Compose サンプルの stateDescription Expanded / Collapsed に相当)、`trailingAriaLabel`(既定「More options」)
- **フォーカス順・キー**: 先頭 → 末尾の Tab 順(site「leading then trailing」)、Space / Enter で起動、末尾の
  Enter / ArrowDown でメニューを開いて先頭項目へ、ArrowUp で末尾項目へ、Escape と項目選択で閉じて末尾ボタンに
  フォーカスが戻り `aria-expanded="false"`(実測、Menu の APG 実装)
- **メニュー配置**: 末尾ボタンの端に揃え(`menuAlign` 既定 `end`、実測で右端一致)、間隔 4px(site「The menu
  should be 4dp from the split button」)
- **RTL**: 並びが反転し、論理プロパティで内外の角も反転(実測)。site「In right-to-left languages, the component
  layout is mirrored」
- **API**: `open` / `defaultOpen` / `onOpenChange`(Phase A A3 / A4)、`startIcon`(A5)、`ref` とその他の属性は
  先頭ボタンへ
- **axe**: jsdom・実ブラウザともメニューを開いた状態で違反なし(disabled・outlined も jsdom で違反なし)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| SP1 | **サイズ別の寸法(M〜XL の先頭パディング、XS のアイコン間隔、末尾アイコン・パディング、光学オフセット、先頭の最小幅)** | 先頭の end パディング M 16 / L 32 / XL 48、XS のアイコンとラベルの間隔 8、末尾アイコン M 24 / L 32 / XL 40、末尾パディング S 14 / M 20 / L 36 / XL 52(→ 末尾の幅 50 / 64 / 104 / 144)、シェブロンは常に中央、先頭の `min-width: 64px`(すべて実測) | site トークン・図 = Compose `SplitButtonDefaults`: 先頭 end **24 / 48 / 64**、XS の間隔 **4**(site 図、Button B1 と同じ)、末尾アイコン **26 / 38 / 50**、末尾パディング(開いたとき・中央)**13 / 13 / 15 / 29 / 43** → 幅 **48 / 48 / 56 / 96 / 136**、閉じているときはシェブロンを中央から **−1 / −1 / −2 / −3 / −6 dp**(site 本文・図 XS 12/14 … XL 37/49、Compose `horizontalCenterOptically`)、先頭の最小幅 **48**(Compose `LeadingButtonMinWidth`、site はアイコンのみの先頭ボタンを許容) | 中 |
| SP2 | **内側の角がサイズ・状態で変わらない** | `--md-sys-shape-corner-small`(8px)固定。hover・押下でも 8px(実測) | 静止 **4 / 4 / 4 / 8 / 12**(site トークン・本文、Compose `InnerCornerSize`)。hover・focus・押下で **8 / 12 / 12 / 20 / 20**(site 本文「inner corners change shape for hovered, focused, and pressed states」+ hovered / pressed トークン。Compose は押下のみ — 下記裁定) | 中 |
| SP3 | **開いた末尾ボタンに選択時の state layer がない** | `Open` 話で state layer の opacity 0(フォーカスはメニューへ移り hover もない) | site「color doesn't change when selected — only a state layer is applied」、状態図の Selected も色が薄い。Compose `TrailingButton(checked)` はチェック時の形を contentColor × `TrailingButtonStateLayerAlpha`(= PressedStateLayerOpacity **0.1**)で塗る | 低 |
| SP4 | **outlined の配色が旧値(primary)** | ラベル・アイコン・シェブロン・state layer とも primary(実測 rgb(101, 85, 143)) | **on-surface-variant**(site「Button と同じ色」→ Button B3、既に Button は修正済み。Compose `Outlined*Button` は `outlinedButtonColors()` = OnSurfaceVariant) | 中 |
| SP5 | **disabled の container 12% と outlined の disabled 枠線** | container on-surface **12%**、outlined 枠線 on-surface **12%**(実測) | Button B4a / B4b と同じ: container **on-surface 10%**、枠線 **outline-variant @10%** | 低 |
| SP6 | **XS / S に 48dp のタッチターゲットがない** | `.leading` / `.trailing` に `::before` がない(実測 `content: none`)。XS 32px・S 40px の高さのまま | site a11y「各ボタンに最低 48×48dp。XS / S は周囲のターゲットを 48dp 以上の高さに」。Compose `SplitButtonLayout` は `minimumInteractiveComponentSize()` | 中 |
| SP7 | **outlined の枠線が幅を増やす** | S の末尾ボタン outlined 52px、他バリアント 50px(実測)。内容幅の先頭ボタンも +2px。Ripple / FocusRing は枠線の内側 | site の寸法はバリアント共通。Compose は枠線を shape の内側に描き container サイズを変えない(IconButton IB4 と同じ) | 低 |
| SP8 | **内側の角のモーフがオーバーシュートする** | `medium1` + `cubic-bezier(0.34, 1.4, 0.5, 1)` | Compose `SplitButtonDefaults` は全シェイプ変化が `DefaultEffects`(1.0 / 1600、バウンスなし)、site「standard motion scheme を使う」→ Button B5 と同じ **short3(150ms)+ standard easing** | 低 |

Issue: SP1 / SP2 → #282(同じサイズ別ブロックと角の規則を書き換えるため同梱)、SP3 → #283、SP4 → #284、
SP5 → #285、SP6 → #286、SP7 → #287、SP8 → #288

**軽微(判断・記録のみ)**:

- **focus の state layer 0.10**: Tab フォーカスで state layer の opacity 0(実測)。共有 `Ripple` の欠落 → #194 に
  コメントで合流(起票しない)
- **outlined の枠線幅**: 実装は全サイズ 1px。Button は site に従い 1 / 1 / 1 / 2 / 3。SplitButton の site トークンに
  枠線幅はなく「Button と同じ」とだけあり、Compose は `outlinedButtonBorder` の 1dp 固定 → 判断が割れるため起票せず、
  SP7 の修正時に Button と揃えるか決める
- **末尾ボタンの既定ラベル**: 既定「More options」。site「主ボタンのアクションに関連づけたラベルに(例: Watch later
  → More watch options)」。`trailingAriaLabel` で満たせる → JSDoc で案内するとよい
- **アイコンのみの先頭ボタン**: `startIcon` だけで `children` も `aria-label` もないと `button-name` 違反(一時テストで
  確認)。`aria-label` は `...rest` 経由で先頭ボタンに渡せる → 利用者責任、JSDoc で案内
- **ツールチップ**: Compose サンプルは末尾ボタンを `TooltipBox` で包む。site に要件なし → 組み合わせで満たす
- **メニューの位置決め**: 下に収まらないと上に反転(Menu の実装)。左右の端合わせの自動切り替え(site「収まらなければ
  片側に揃える」)は共有のポップアップ位置決めヘルパー(Tooltip #259 / Menu #54)の範囲
- **メニューのラベル**: `role="menu"` にラベルがない(site「メニューは menu の a11y ガイダンスに従ってラベル付け」)。
  Menu コンポーネント側の話 → Menu の監査範囲
- **Button を再利用していない**: 配色・disabled・モーションの修正が Button に追従しない構造的な原因。SP4 / SP5 / SP8 の
  修正時に Button の CSS 変数やクラスを共有する形への寄せを検討(API は変わらない)
- **forced-colors**: 塗りのボタンに枠線がなく境界が消える(Button と共通のライブラリ全体の話)。起票しない
- **ストーリーのカバレッジ**: `Sizes` は xs / sm / md のみで L / XL がない。outlined / tonal の disabled、開いた状態の
  各サイズもない。SP1 / SP2 の修正 PR で足すこと
- **テスト追加候補**: Escape でトリガーにフォーカスが戻ること、項目選択で閉じること、開いた状態の axe

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| hover / focus 時の内側の角 | 変わる(hovered トークン 8 / 12 / 12 / 20 / 20、本文は hovered・focused・pressed) | 押下のみ(`InnerHoveredCornerCornerSize` トークンは未使用) | site 優先 → **hover・focus・押下で変える**(SP2) |
| 開いた末尾ボタンの形 | 内側の角 50% | `TrailingCheckedShape` = CircleShape(`TrailingInnerSelectedCornerCornerSizePercent` 50 は未使用) | 結果は同じ → 完全な丸(現実装のまま) |
| シェイプモーフのばね | 「standard motion scheme(expressive ではない)」— 回転についての記述 | 全シェイプ変化が `DefaultEffects`(1.0 / 1600)。ToggleButton / ButtonGroup の FastSpatial とは違う | どちらもバウンスなし → **short3 + standard easing**(SP8、Button B5 と同じ) |
| シェブロンの回転 | standard スキームで 180° | ライブラリには回転なし、サンプルのみ(`animateFloatAsState` 既定 `spring()` = バウンスなし) | site → 現実装(medium1 + standard easing)のまま |
| 先頭ボタンの最小幅 | 記載なし | `LeadingButtonMinWidth` 48dp(private ハードコード) | Compose → **48**(SP1) |
| 末尾ボタンのロール | 展開状態を伝える | `Role.Button` + サンプルで stateDescription Expanded / Collapsed | Web の menu button パターン(`aria-haspopup` + `aria-expanded`)で同等 → 現実装のまま |
| tonal の disabled container | 0.1 | 旧 `FilledTonalButtonTokens` 経由で 0.12 | Button 監査の裁定どおり **0.10**(SP5) |
| disabled のラベル色 | on-surface @0.38 | filled / elevated は OnSurfaceVariant @0.38 | Button 監査の裁定どおり **on-surface**(現実装のまま) |
| outlined の枠線幅 | Button に委譲(Button は 1 / 1 / 1 / 2 / 3) | 1dp 固定 | 軽微欄 — SP7 の修正時に判断 |
| サイズ判定 | サイズは明示 | 高さから推定(形は中点、パディングは `<`、アイコンは `MinHeight` 基準と不統一) | Web は `size` prop で明示するため該当なし |

## 詳細対照表

### サイズ(dp。site トークン = 図 = Compose Defaults、括弧内は実装の実測値)

| | XS | S | M | L | XL |
|---|---|---|---|---|---|
| 高さ | 32 ✓ | 40 ✓ | 56 ✓ | 96 ✓ | 136 ✓ |
| 間隔 | 2 ✓ | 2 ✓ | 2 ✓ | 2 ✓ | 2 ✓ |
| 先頭 start / end | 12 / 10 ✓ | 16 / 12 ✓ | 24 / **24**(16)✗ | 48 / **48**(32)✗ | 64 / **64**(48)✗ |
| 先頭アイコン / 間隔 | 20 / **4**(8)✗ | 20 / 8 ✓ | 24 / 8 ✓ | 32 / 12 ✓ | 40 / 16 ✓ |
| 末尾アイコン | 22 ✓ | 22 ✓ | **26**(24)✗ | **38**(32)✗ | **50**(40)✗ |
| 末尾 start / end(開・中央) | 13 / 13 ✓ | **13 / 13**(14)✗ | **15 / 15**(20)✗ | **29 / 29**(36)✗ | **43 / 43**(52)✗ |
| 末尾 start / end(閉・光学) | 12 / 14 | 12 / 14 | 13 / 17 | 26 / 32 | 37 / 49 |
| シェブロンのオフセット(閉) | −1(0)✗ | −1(0)✗ | −2(0)✗ | −3(0)✗ | −6(0)✗ |
| 末尾の幅 | 48 ✓ | **48**(50)✗ | **56**(64)✗ | **96**(104)✗ | **136**(144)✗ |
| outlined の末尾の幅 | — | 実測 52(他バリアントは 50)**✗ SP7** — 全サイズで +2(枠線 1px × 2) | | | |

### 角(dp)

| | XS | S | M | L | XL | 実装 |
|---|---|---|---|---|---|---|
| 外側 | full | full | full | full | full | `calc(height/2)` ✓ |
| 内側・静止 | 4 | 4 | 4 | 8 | 12 | 8 固定 **✗ SP2** |
| 内側・hover / focus / 押下 | 8 | 12 | 12 | 20 | 20 | 8 のまま **✗ SP2** |
| 末尾・開いたとき | 50% | 50% | 50% | 50% | 50% | 完全な丸 ✓ |
| モーフ | — | — | — | — | — | オーバーシュート **✗ SP8** |

### 色・状態

| | 実装 | site / Compose |
|---|---|---|
| filled | primary / on-primary、hover L1 ✓ | 同じ |
| tonal | secondary-container / on-secondary-container、hover L1 ✓ | 同じ |
| elevated | surface-container-low / primary、L1 → hover L2 ✓ | 同じ |
| outlined | 透明 / **primary**、枠線 outline-variant 1px | 透明 / **on-surface-variant** **✗ SP4** |
| state layer | hover 0.08 / 押下 0.10 ✓、focus 0 | focus 0.10(#194) |
| 開いた末尾ボタン | state layer なし | 0.10 の塗り **✗ SP3** |
| disabled | container on-surface 12%、ラベル 38% | container **10%**、ラベル on-surface 38% **✗ SP5** |
| outlined の disabled 枠線 | on-surface 12% | **outline-variant @10%** **✗ SP5** |

### 挙動・a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| タッチターゲット | 各ボタン 48×48 | `minimumInteractiveComponentSize()` | なし **✗ SP6** |
| フォーカス順 | 先頭 → 末尾(RTL で反転) | — | ✓ |
| 末尾の ARIA | 展開状態・「more options」系ラベル | stateDescription | `aria-haspopup` / `aria-expanded` / `aria-label` ✓ |
| メニューを開く | — | `DropdownMenu(expanded = checked)` | Enter / Space / ArrowDown → 先頭項目、ArrowUp → 末尾項目 ✓ |
| 閉じる / フォーカス | Menu のガイダンス | `onDismissRequest` | Escape・項目選択・Tab・外側クリック。トリガーへ戻す ✓ |
| 回転 | 180°、standard スキーム | サンプルのみ | 180°、medium1 + standard ✓、reduced motion で無効 ✓ |
| メニュー位置 | 末尾ボタンに揃え、4dp | — | `end` 揃え、4px ✓ |
| RTL | 反転 | — | ✓ |
| axe(メニューを開いた状態) | — | — | jsdom・実ブラウザとも違反なし ✓ |
