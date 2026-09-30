# NavigationRail 監査レポート(2026-09-30)

Phase B Tier 3。NavigationBar と同時に監査した(姉妹レポート: `docs/audits/navigation-bar.md`)。3ソースを突き合わせた:

1. **m3.material.io/components/navigation-rail/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   トークンテーブルの全6セット(Nav rail - Common / Collapsed / Expanded、Nav rail item - Common / Vertical /
   Horizontal)を全展開・visibility 表示で取得(下段の Navigation rail (baseline) は site が「no longer recommended」と
   しているので参照のみ)
2. **Compose androidx-main** — `WideNavigationRail.kt`(`WideNavigationRail` / `WideNavigationRailItem` /
   `ModalWideNavigationRail` / Defaults)、`WideNavigationRailState.kt`、`NavigationRail.kt`(classic)、
   `NavigationItem.kt`(`AnimatedNavigationItem`)、`NavigationRailCollapsedTokens` / `NavigationRailExpandedTokens` /
   `NavigationRailBaselineItemTokens` / `NavigationRailVerticalItemTokens` / `NavigationRailHorizontalItemTokens` /
   `NavigationRailColorTokens`、`ScrimTokens`、`MotionScheme` 系。`ComposeMaterial3Flags` の分岐は**なし**
3. **実装** — `src/components/NavigationRail/`(`NavigationRail.tsx`, `NavigationRailItem.tsx`, `useRailMorph.ts`,
   CSS 2本、テスト 9件全通過、ストーリー `Collapsed` / `Expanded` / `Toggle` + `NavigationRailItem` の `Playground` /
   `MorphFrame`)。Storybook(dev)で collapsed / expanded / RTL を実測

item のコードは NavigationBar と**共有していない**が、同じ構造の欠陥が3つある。それらは NavigationBar レポートの
**NB5(state layer)/ NB6(選択中の filled アイコン)/ NB7(バッジの読み上げ)**に1回だけ記録した — Rail も
対象(Rail 固有の実測: state layer 色は既に on-secondary-container で正しい、FocusRing は既に indicator の形、
バッジは `aria-hidden` のアイコン内にあり一切読まれない)。

## 結論サマリ

**一致している(修正不要)**:

- **コンテナ**: collapsed 幅 **96**、expanded 幅 220(最小値 — NR3 参照)、色 **surface**(実測 rgb(253,247,255))、
  形状 0、elevation 0、上の余白 **44**(実測: header 上端 = nav 上端 + 44)、header の下 **40**(`header space minimum`、
  実測 items 上端 = header 下端 + 40)、item 間 collapsed **4** → expanded **0**
- **collapsed item**: 96×**64**(`container height` 64、実測)、上下 6(`container vertical space`)、indicator **56×32**・
  形状 full・左端 20(= (96 − 56)/2、Compose `WNRItemHorizontalPadding` 20)、indicator ↔ label **4**、label は
  label-medium(500 12/16 0.5)・中央揃え・幅 96 で折り返し、item は折り返しに合わせて縦に伸びる(`--_label-h` 計測。
  site a11y の文字サイズ拡大要件と一致)
- **expanded item**: 高さ **56**(`short container height` 56、Compose indicator 56 + min 48)、indicator 高さ **56**・
  左右 **16**・icon ↔ label **8**・左端 20、indicator は内容に合わせて伸びる(実測 Inbox = 16 + 24 + 8 + 35 + 16 = 99)、
  label は label-large(500 14/20 0.1)、ターゲットは rail の全幅(site「target area always spans the full width」、実測
  item 幅 220)
- **色**: indicator secondary-container、選択アイコン on-secondary-container、collapsed の選択ラベル secondary、非選択
  on-surface-variant、state layer は選択・非選択とも **on-secondary-container**(site Common セット)、hover 0.08 /
  pressed 0.10
- **モーション**: collapsed ↔ expanded は1本の spring(dampingRatio **0.8** / stiffness **380** = Compose
  `DefaultSpatial` の expressive 値)で幅・item 間隔・indicator・アイコン・ラベルを同時に補間、途中で反転しても速度を
  引き継ぐ、`prefers-reduced-motion` で即時に切り替え。label style は途中で medium → large に切り替わる(Compose は
  progress 0.5 で切り替え + alpha 4(p − 0.5)²、実装は2枚のラベルのクロスフェード — 軽微欄)
- **header**: menu / FAB は常に上寄せ(site guidelines)・開始端から 20、menu アイコンは展開時に `menu_open` に変わる
  (ストーリー。site「展開時は折りたためることを示すアイコンに変える」)、FAB は `disableElevation`(site「rail 内の FAB は
  level 0」)・`followContainer` で extended FAB に変形(site「FAB は extended FAB に遷移」、Phase A A9)
- **配置**: `arrangement` top / center(site「top か center」)+ bottom(Compose は任意の `Arrangement.Vertical`)
- **バッジの位置(collapsed)**: large は icon 上端 −2・開始端 +12、dot 6dp は icon の右上角(Compose `BadgedBox` と一致、実測)
- **挙動・a11y**: `<nav>` ランドマーク、`aria-current="page"`、Tab で header(menu → FAB)→ item の順(site a11y
  「初期フォーカスは最初のインタラクティブ要素 — menu / FAB / 先頭 item」、一時テストで確認)、Enter/Space で選択、
  expanded 時の可視ラベルは `aria-hidden` で重複せず、アクセシブルネームはラベル1回だけ、controlled / uncontrolled、
  axe 違反なし(collapsed / expanded とも、一時テストで確認)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| NR1 | **expanded の選択ラベル色** | expanded でも secondary(実測 rgb(98,91,113)) | **on-secondary-container**(site 色ロール「Secondary (vertical), **On secondary container (horizontal)**」、Compose `WideNavigationRailItemDefaults` の start-icon 位置 = OnSecondaryContainer)。ラベル色は `--_t` に合わせて切り替える(Compose は DefaultEffects で色を補間) | 低(VRT 差分あり) |
| NR2 | **RTL で item がミラーされない** | item 内の indicator・アイコン・ラベル・focus ring が物理 `left` で配置されている。`dir="rtl"` で rail と header は右端に移るが、item の pill は rail の**左端**から 20、アイコンが左・ラベルが右のまま(実測: nav x=941–1161、pill x=961) | site guidelines「rail は leading edge に置く — RTL では右側」。Compose は layout direction に従って配置(predictive back の pivot も `isRtl` で反転)→ `inset-inline-start` 等の論理プロパティと、`translate` の符号の反転 | 中 |
| NR3 | **expanded 幅が 220 固定** | `width: calc(96px + 124px * var(--_t))`。長いラベルは pill ごと rail の外にはみ出す(ラベル `nowrap`) | site `expanded container width minimum` **220** / `maximum` **360**。Compose: 幅 = max(最も広い item + 20, 220) を 360 で上限 → 内容に合わせて 220–360 で伸ばす | 低 |
| NR4 | **expanded でバッジがラベルの横に来ない** | collapsed と同じくアイコンの右上に重なったまま | site guidelines「compact(collapsed)ではアイコンの右上、**expanded ではラベルの横**」。Compose はバッジを利用側が icon slot に置く作りで、位置の規定はない(矛盾なし) | 低(VRT 差分あり) |
| NR5 | **選択時に indicator が広がらない** | `.shape::before` の不透明度 100ms のフェードだけ | site guidelines Selection「アイコンが塗られ、indicator が**アイコンの中心から広がる**」。Compose `AnimatedNavigationItem`: 幅 = total × progress(DefaultSpatial)+ alpha。NavigationBar は既に `scaleX` で実装済み | 低 |
| NR6 | **modal の expanded rail(と hide-on-collapse)がない** | `variant` は collapsed / expanded の2つだけ。expanded は常に standard(コンテンツの横に並ぶ) | site: Configurations「Expanded layout: Standard (default) / **Modal**」「Expanded behavior: **Hide when collapsed**」、トークン modal container **surface-container**・shape **16dp**・elevation 3dp。guidelines「modal はコンテンツに重なり、menu アイコンから開く」、predictive back は modal だけ。Compose `ModalWideNavigationRail`(`hideOnCollapse`、dialog window + `paneTitle`、scrim **Scrim @ 0.32**、scrim クリック・**Escape**・戻るで閉じる、幅は FastSpatial)。Web では共有の `useModal`(フォーカストラップ・復帰・Escape・スクリム)で実装する | 中(API) |

Issue: NR1 → #176、NR2 → #177、NR3/NR4 → #178(どちらも expanded の幅計測 `--_label-w` と pill の中身を
書き換えるため同梱)、NR5 → #179、NR6 → #180。共通の NB5(#173)/ NB6(#174)/ NB7(#175)は `docs/audits/navigation-bar.md` を参照

**軽微(判断・記録のみ)**:

- **矢印キー**: site a11y は「FAB / menu から Tab で item へ、**Tab または矢印**で item 間を移動」、キー表も
  「Tab / Arrows」。Tab だけで要件を満たしており(「または」)、Web のナビゲーションランドマークでは矢印キーの
  roving tabindex は一般的でない(APG にも nav の矢印キーパターンはない)。Compose も `selectableGroup` の Tab 移動。
  追加するなら ↑↓ で item 間を移動する任意機能として、Tab ストップは減らさない方がよい → 今回は Issue にしない
- **modal の elevation**: site `expanded modal container elevation` 3dp、Compose はトークン `ModalContainerElevation =
  Level2` を**参照していない**(影なし)。modal はコンテンツに重なるので影がある方が自然 → NR6 を実装するときに
  level 2 の影を付ける(下記裁定)
- **ラベルのクロスフェード**: Compose はラベル1枚を progress 0.5 で style 切り替え、alpha = 4(p − 0.5)²(中点で 0)。
  実装は2枚のラベルを別タイミングでフェード(collapsed 側は t ≈ 0–0.15 で消え、expanded 側は t ≈ 0.77–0.95 で左から
  スライドイン — site デモ動画の実測に合わせたもの)。どちらも中間でラベルが消える点は同じで、差は僅か
- **モーションスキーム**: 実装は expressive の DefaultSpatial(0.8/380)固定。Compose は `MaterialTheme` 既定では
  standard(0.9/700)、`MaterialExpressiveTheme` で expressive。ライブラリ全体の既定をどちらにするかは横断的な判断
  (Button B5・TextField と同じ論点)。Expressive ライブラリとして 0.8/380 を維持で問題ない
- **center 配置の基準**: Compose の `Arrangement.Center` は header を無視してコンテナ全体の中央に置く。実装は header の
  下の残り領域の中央。site は「tablet では center」とだけ言う。見た目の差は header の高さの半分で、実装の方が header と
  重ならない利点がある
- **narrow 幅(80dp)**: site / Compose の `NarrowContainerWidth` 80 は classic `NavigationRail` の最小幅でのみ使われる。
  Expressive rail(96)だけ実装していて問題ない
- **コンテナの塗りをなくす**: site guidelines「コンテナの塗りは外してよい(3:1 のコントラストを確保)」、色ロール一覧の
  「Surface container (optional)」— `style` / `className` で上書きできるので API 追加は不要
- **disabled の色**: NavigationBar の軽微欄と同じ(on-surface @38% vs Compose on-surface-variant @0.38)
- **ラベルは要約**: site「1語」「長いラベルは語の間で改行、ハイフネーション」。collapsed は `overflow-wrap: break-word`
  で折り返す ✓
- **項目数**: site「collapsed は 3–7 項目」。実装は制限しない(Compose も制限しない)
- **ストーリーの title**: `Components/NavigationRailItem` は `NavigationRail` と別の title。CLAUDE.md は「1コンポーネント1
  title」だが、`NavigationRailItem` は単独でも使える公開コンポーネントなので現状で問題ない
- **ストーリーのカバレッジ**: disabled item、ラベルなし item(Compose は 56×56 の円 indicator)、center / bottom 配置、
  長いラベルの折り返しのストーリーがない → VRT が撮っていない。修正 PR で足すとよい

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| expanded の選択ラベル色 | Common セットは secondary のみ(layout 別の行なし)、色ロール一覧は「horizontal = On secondary container」 | on-secondary-container(`TODO: Replace with the correct token once it is available`) | site の色ロール一覧と Compose が一致 → **on-secondary-container**(NR1)。Common セットは layout 別の行がまだないと判断 |
| コンテナ色 | トークン Surface、色ロール一覧は「Surface container (optional)」 | Surface(modal だけ SurfaceContainer) | トークン + Compose → **surface**(現実装のまま)。「optional」は塗りを外せるという意味と解釈 |
| modal の elevation | 3dp | トークン Level2 だが未参照(影なし) | site 優先 → **level 2 の影**(NR6 の実装時) |
| modal の形状 | 16dp | CornerLarge(16dp)、collapsed 時は CornerNone | 一致 → 16dp(NR6) |
| 矢印キー | Tab / Arrows | Tab(`selectableGroup`) | Tab で要件充足 → **現状維持**(軽微欄) |
| expanded のバッジ位置 | ラベルの横 | 規定なし(利用側が icon slot に置く) | site 優先 → **ラベルの横**(NR4) |
| item のロール | (記載なし) | `Role.Tab` + `selectableGroup` + `isTraversalGroup` | Web の慣習 → **`<nav>` + `aria-current="page"`**(NavigationBar と同じ裁定) |

## 詳細対照表

### 寸法(site トークン / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| collapsed 幅 | 96 | 96 | 96 ✓ |
| expanded 幅 | 220–360 | max(最大 item + 20, 220) ≤ 360 | **220 固定 ✗(NR3)** |
| 上の余白 | 44 | 44 | 44 ✓ |
| header の下 | 40(min) | 40(Top 配置のみ) | 40 ✓ |
| item 間 | collapsed 4 / expanded 0 | 4 → 0(DefaultSpatial) | 4 → 0 ✓ |
| collapsed item 高さ | 64 | min 64 | 64(折り返しで伸びる)✓ |
| expanded item 高さ | 56 | min 48、indicator 56 | 56 ✓ |
| indicator(collapsed) | 56×32 | 56×32 | 56×32 ✓ |
| indicator(expanded) | 高さ 56・左右 16・icon ↔ label 8 | 同 | 同 ✓ |
| indicator の左端 | — | 20(`WNRItemHorizontalPadding`) | 20 ✓(RTL は ✗ NR2) |
| collapsed の icon ↔ label | 4 | 4 | 4 ✓ |
| ラベルなしの indicator | — | 56×56 の円 | 56×32 のまま(軽微 — ストーリーなし) |
| アイコン | 24 | 24 | 24 ✓ |
| modal 形状 | 16 | 16 | **modal なし(NR6)** |

### カラー(light)

| 要素 | site | Compose | 実装 |
|---|---|---|---|
| コンテナ | surface | Surface | ✓ |
| modal コンテナ / scrim | surface-container / — | SurfaceContainer / Scrim @0.32 | **なし(NR6)** |
| active indicator | secondary-container | SecondaryContainer | ✓ |
| 選択アイコン | on-secondary-container | OnSecondaryContainer | ✓ |
| 選択ラベル(collapsed) | secondary | Secondary | ✓ |
| 選択ラベル(expanded) | on-secondary-container | OnSecondaryContainer | **secondary ✗(NR1)** |
| 非選択アイコン・ラベル | on-surface-variant | OnSurfaceVariant | ✓ |
| state layer(選択・非選択) | on-secondary-container | ripple 既定色 | ✓ |

### 状態・モーション

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| hover / focus / pressed | 0.08 / 0.10 / 0.10 + ripple | ripple(indicator にクリップ) | 0.08 / **なし** / 0.10 フェードのみ(**NB5**) |
| focus 表示の形 | — | indicator の形 | indicator の形 ✓ |
| selection | 中心から広がる | 幅 × progress(DefaultSpatial) | **フェードのみ ✗(NR5)** |
| collapse ↔ expand | — | DefaultSpatial(expressive 0.8/380) | 0.8/380 の spring ✓ |
| reduced motion | — | — | 即時 ✓ |

### 挙動・a11y

| 要件 | 実装 |
|---|---|
| ランドマーク / 現在地 | `<nav>` + `aria-current="page"` ✓ |
| 初期フォーカス = 最初のインタラクティブ要素 | DOM 順(menu → FAB → item)✓ |
| Tab で item 間を移動 / Space・Enter で選択 | ✓(矢印は軽微欄) |
| ターゲットは rail の全幅 | ✓ |
| 選択中は filled アイコン | **✗(NB6)** |
| バッジの読み上げ | **✗(NB7 — Rail では一切読まれない)** |
| 文字サイズ拡大で item が縦に伸びる | collapsed ✓(expanded は `nowrap` + NR3) |
| RTL で leading edge に置く | **item が未対応 ✗(NR2)** |
| modal: フォーカストラップ・Escape・スクリム | **modal なし(NR6)** |
| axe(collapsed / expanded) | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- 実測で RTL を確かめるには、ストーリーを開いたあと `document.documentElement.dir = 'rtl'` を `page.evaluate` で
  設定して `getBoundingClientRect` を取り直すだけでよい。物理 `left` で絶対配置しているコンポーネント(今回の rail item)は
  この一手で見つかる
- memory にあった rail デモ動画(`2026-07-04_10h47_41.mp4`)は既に削除済みで、実測値(menu アイコンの回転・ラベルの
  出入りのタイミング)は実装とストーリーのコメントに残っている。今回は動画を使わず、Compose の式(alpha 4(p − 0.5)²)と
  比較した
