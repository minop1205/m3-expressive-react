# Tabs 監査レポート(2026-09-30)

Phase B Tier 2。3ソースを突き合わせた:

1. **m3.material.io/components/tabs/specs** + **/accessibility** — Playwright MCP でトークンテーブル2セット
   (Tabs - Primary navigation / Secondary navigation)を全展開して取得、寸法表・本文・a11y(キーボード表)を抽出
2. **Compose androidx-main** — `Tab.kt` / `TabRow.kt`(`TabRowDefaults`・`TabIndicatorOffsetNode`・
   `ScrollableTabData`)/ `PrimaryNavigationTabTokens`・`SecondaryNavigationTabTokens`(v0_162)/ `DividerTokens` /
   `StateTokens` / `MotionScheme`・`StandardMotionTokens`・`ExpressiveMotionTokens` / `Badge.kt`
3. **実装** — `src/components/Tabs/Tabs.tsx`, `Tabs.module.css`, テスト(9件、全通過)・ストーリー。
   寸法は Storybook(`components-tabs--primary/secondary/with-icons`)で `getBoundingClientRect` を実測

## 結論サマリ

**一致している(修正不要)**:

- **寸法**: ラベルのみの高さ 48、アイコン 24、左右パディング 16(Compose `HorizontalTextPadding`)、
  divider 1、primary indicator の高さ 3、scrollable の最小タブ幅 90(Compose `ScrollableTabRowMinTabWidth`)
- **シェイプ**: primary indicator の上角のみ 3(3/3/0/0 — site の表どおり。下記裁定)、secondary indicator は角なし
- **タイポグラフィ**: ラベル = title-small(両バリアント)
- **色(enabled)**: コンテナ surface、divider **outline-variant**(下記裁定)、indicator primary(両バリアント)、
  primary の active ラベル/アイコン = primary、secondary の active = on-surface、inactive = on-surface-variant(両バリアント)、
  secondary の state layer = on-surface、primary の active state layer = primary、focus ring の色 = secondary・太さ 3
- **state layer 不透明度**: hover 0.08 / pressed 0.10(Ripple 経由、`tokens.css` の値)、bounded ripple
- **構造・a11y**: `role="tablist"` / `role="tab"`、`aria-selected`、roving tabindex(選択中タブだけ `tabindex=0` =
  APG の「タブリストに入るとアクティブなタブにフォーカス」)、ネイティブ `<button>` による Enter/Space、
  48dp の最小高さ、Ripple/FocusRing プリミティブの使用、controlled/uncontrolled 両対応、`...rest` 経由で
  `aria-controls` を渡せる

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| TB1 | **アイコン+ラベルのタブの高さ** | 72px | **64dp**(site 寸法表・トークン `IconAndLabelTextContainerHeight` とも 64。Compose Defaults の 72 は下記裁定) | 中(VRT 差分あり) |
| TB2 | **固定タブの幅が均等でない** | `flex: 1 1 auto` → ラベル長で幅が変わる(実測 142 / 131 / 146)。固定時にも `min-width: 90px` | **均等割り**(site「Tabs are divided into equal sections」、Compose `TabRowImpl` は `rowWidth / tabCount`)。90 の最小幅は scrollable のみ | 中(VRT 差分あり) |
| TB3 | **primary indicator の幅がタブ幅 − 32** | `inset-inline: 16px` → 固定タブでは幅の大半(実測: ラベル 43 に対し 110) | **ラベル(コンテンツ)幅、最小 24dp、中央寄せ**(Compose `matchContentSize = true` → `contentWidth = max(min(intrinsic, tabWidth) − 32, 24)`。site「minimum length of 24dp」) | 中(VRT 差分あり) |
| TB4 | **secondary indicator の高さ** | 3px | **2dp**(site トークン `active indicator height` 2dp・寸法表「Secondary active indicator height 2dp」。Compose は 3dp — 下記裁定) | 低(VRT 差分あり) |
| TB5 | **indicator が移動しない** | タブごとの indicator を opacity 0/1 で切り替えるだけ | 選択変更で indicator が**新しい位置・幅へスライド**(site a11y「indicator shifts into position」、Compose `TabIndicatorOffsetNode` が left と width を `DefaultSpatial` spring 0.9/700 でアニメーション)。`prefers-reduced-motion` で無効化 | 中 |
| TB6a | **inactive タブの hover/focus/pressed でラベル・アイコン色が変わらない** | on-surface-variant のまま | **on-surface**(site: 両バリアントの `inactive hover/focus/pressed` = #1D1B20、Compose トークン `Inactive{Hover,Focus,Pressed}LabelTextColor/IconColor` = OnSurface) | 低 |
| TB6b | **primary の inactive タブの hover/focus state layer の色** | primary(`--md-ripple-color` を primary 固定) | hover/focus = **on-surface**、pressed = primary(site トークン。Compose は全状態 primary — 下記裁定) | 低 |
| TB6c | **選択時の色変化にトランジションがない** | 即時切り替え | Compose `TabTransition`: 選択されるとき `DefaultEffects`(spring 1.0/1600)、外れるとき `FastEffects`(1.0/3800)で色をフェード。CSS では短い(~100–150ms)`color` トランジションで近似 | 低 |
| TB7 | **focus ring が外側に出る** | FocusRing 既定の offset +2px(隣のタブに重なり、scrollable では `overflow` で切れる) | site `focus indicator offset` **−3dp**(内側)。Menu と同じく `--md-focus-ring-offset: -3px` | 低(a11y) |
| TB8a | **scrollable の端の余白がない** | 0 | **52dp**(Compose `ScrollableTabRowEdgeStartPadding`。レイアウト幅 = `padding × 2 + Σ tabWidth` なので両端)。site に記載なし=矛盾なし | 低(VRT 差分あり) |
| TB8b | **scrollable で選択タブが見える位置へスクロールしない** | キーボード移動時の `focus()` による最小限のスクロールのみ。クリックや初期表示・外部からの `value` 変更では何もしない | 選択変更時(初回レイアウト含む)に**選択タブを中央へ**アニメーションスクロール(Compose `ScrollableTabData`、`DefaultSpatial`)。site a11y「off screen tab を選べる」。reduced-motion では即時 | 中 |
| TB9a | **矢印キーで即座に選択(自動アクティベーション)** | `ArrowLeft/Right` で `next.focus(); next.click()` | 矢印は**フォーカス移動のみ**、Space/Enter で選択(site a11y のキー表「Arrow: focus lands on the next destination / Space・Enter: activates」。Compose もフォーカス移動では選択しない)= APG の手動アクティベーション | 中(a11y) |
| TB9b | **Home/End がない** | 未対応 | Home = 最初、End = 最後のタブへフォーカス(WAI-ARIA APG Tabs) | 低(a11y) |

Issue: TB1/TB2 → #136、TB3/TB4/TB5 → #137(indicator を1本のスライド要素に作り直すため同梱)、
TB6a/TB6b/TB6c → #138、TB7 → #139、TB8a/TB8b → #140、TB9a/TB9b → #141

**軽微(判断・記録のみ)**:

- **focus の state layer(0.10)が出ない**: Ripple プリミティブは hover/pressed のみで、focus は FocusRing が担う。
  ライブラリ全体の設計(Button も同じ)なので Tabs 固有の問題としては扱わない
- **primary indicator の「inset 2dp on each side」**: site の本文にあるが、何に対する 2dp かが曖昧(ラベル幅から
  さらに 2dp ずつ縮める? タブ端から?)。Compose はラベル幅そのもの。TB3 はコンテンツ幅で直し、2dp は保留
- **disabled タブ**: site にも Compose にも disabled の色がない(Compose は KDoc で「見た目も disabled」と言うが
  コードは `selectable(enabled)` だけ)。実装の on-surface 38% は他コンポーネントと同じ慣例なので維持。
  矢印キーが disabled タブを飛ばすのは APG の許容範囲(フォーカス可能にする選択肢もある)
- **RTL**: `ArrowRight` が常に「次」。RTL では逆にするのが APG/Compose(LayoutDirection)の挙動。TB9 の修正時に合わせて
  対応するのが自然
- **tabpanel との関連付け**: `TabPanel` コンポーネントや自動 id 付与はない。`aria-controls` は `...rest` で渡せる
  ので、利用側の責務としてドキュメント/ストーリーで示すのが妥当(API 追加は MUI の `TabPanel` 相当として別途検討)
- **ループ**: 矢印キーが末尾→先頭へ回る。site の「infinite scroll する tab set を作らない」は内容のループの話で、
  キー移動の回り込みは APG どおり
- **Compose にあって実装にないもの**(機能追加の候補、今回は対象外): `LeadingIconTab`(インラインアイコン、
  アイコンとテキストの間 8dp — site 寸法表にもある)、タブ内バッジ(site: テキストとバッジの間 4dp、
  積み上げアイコンへの重なり 6dp。Compose `badgeBounds`)
- **アイコンとラベルの縦位置**: 実装は `gap: 2px` で中央寄せ。Compose は「ラベルのベースラインが下端から 17dp、
  アイコン下端からベースラインまで 20sp」。TB1(64dp)の修正時に合わせて確認する
- **Expressive の MotionScheme**: Compose の Tabs は MotionScheme の値をそのまま使う(standard 0.9/700、
  expressive 0.8/380)。どちらを既定にするかはライブラリ横断の判断(Button B5 と同じ論点)
- テスト追加候補: ArrowLeft・Home/End・disabled タブのスキップ(横断監査の Tier 2 指摘)、手動アクティベーション、
  scrollable の選択タブのスクロール

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| アイコン+ラベルの高さ | 64dp(寸法表・トークン、warning なし) | トークン `IconAndLabelTextContainerHeight` = 64、しかし `Tab.kt` は `LargeTabHeight = 72.dp` をハードコード(トークン未使用) | site とトークンが一致 → **64dp**(TB1) |
| secondary indicator の高さ | 2dp(トークン・寸法表、warning なし) | secondary トークンに indicator がなく、`SecondaryIndicator` は primary の 3dp を流用 | site 優先 → **2dp**(TB4) |
| divider の色 | 色ロール一覧は Outline variant。トークン行は #E7E0EC(surface-variant)だが **warning(非推奨)マーク付き** | トークン `DividerColor` = SurfaceVariant(未使用)、実際の `HorizontalDivider` は **OutlineVariant** | warning 行は古いと判断 → **outline-variant を維持**(現実装のまま) |
| primary indicator のシェイプ | 寸法表 3, 3, 0, 0(本文は「fully rounded」) | `RoundedCornerShape(3.dp)`(四隅) | site の表を優先 → **上角のみ 3 を維持**。高さ 3 なので見た目の差はほぼない |
| inactive タブの state layer の色 | primary: hover/focus = on-surface、pressed = primary | ripple の色 = `selectedContentColor`(primary)固定。「選択前から選択色を見せる」ためとコメント | site 優先 → **hover/focus は on-surface**(TB6b) |
| hover/focus/pressed のラベル色 | inactive は on-surface | トークンは同じだが、Compose は状態別のコンテンツ色を**実装していない** | site とトークンが一致 → **実装する**(TB6a) |
| inactive の既定色 | on-surface-variant | トークンは同じだが、Defaults は `unselectedContentColor = selectedContentColor`(未使用のトークン) | site とトークンが一致 → **on-surface-variant を維持** |
| キーボードでの選択 | 矢印 = フォーカス移動、Space/Enter = 選択(「Space/Enter でタブを移動しない」) | フォーカス移動で選択しない(`selectable` のクリックのみ) | 一致 → **手動アクティベーション**(TB9a)。APG は自動も許容するが、上位ソースに従う |

## 詳細対照表

### 寸法(site / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 高さ(ラベルのみ) | 48 | 48 | 48 ✓ |
| 高さ(アイコン+ラベル) | 64 | 72(トークンは 64) | **72 ✗(TB1)** |
| 固定タブの幅 | 均等 | `rowWidth / tabCount` | **ラベル長で不均等 ✗(TB2)** |
| 左右パディング | — | 16 | 16 ✓ |
| scrollable の最小タブ幅 | — | 90 | 90 ✓(固定時にもかかる → TB2) |
| scrollable の端の余白 | — | 52(両端) | **0 ✗(TB8a)** |
| アイコン | 24 | 24(トークン。コードは呼び出し側任せ) | 24 ✓ |
| divider | 1 | 1 | 1 ✓(inset box-shadow) |
| primary indicator 高さ / シェイプ | 3 / 3,3,0,0 | 3 / 四隅 3 | 3 / 上角 3 ✓ |
| primary indicator 幅 | 最小 24(本文: 左右 2dp inset) | ラベル幅、最小 24、中央 | **タブ幅 − 32 ✗(TB3)** |
| secondary indicator | 2、タブ全幅 | 3、タブ全幅 | **3 ✗(TB4)** / 全幅 ✓ |
| インラインアイコンとテキストの間 | 8 | 8(`LeadingIconTab`) | —(未実装、軽微欄) |

### カラー(light)

| 要素 | enabled active | enabled inactive | inactive hover/focus/pressed | 実装 |
|---|---|---|---|---|
| コンテナ | surface | surface | — | surface ✓ |
| primary ラベル/アイコン | primary | on-surface-variant | on-surface | active ✓ / inactive ✓ / **状態変化なし ✗(TB6a)** |
| secondary ラベル/アイコン | on-surface | on-surface-variant | on-surface | active ✓ / inactive ✓ / **状態変化なし ✗(TB6a)** |
| primary state layer | primary(全状態) | hover/focus on-surface、pressed primary | — | active ✓ / **inactive hover primary ✗(TB6b)** |
| secondary state layer | on-surface | on-surface | — | ✓ |
| indicator | primary | — | — | ✓ |
| divider | outline-variant | — | — | ✓ |
| focus ring | secondary 3dp、offset −3 | — | — | 色・太さ ✓ / **offset +2 ✗(TB7)** |

### モーション

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| indicator の移動 | 「shifts into position」 | left・width を `DefaultSpatial`(standard: spring 0.9/700)、初回はスナップ | **なし ✗(TB5)** |
| コンテンツ色 | — | 選択 `DefaultEffects`(1.0/1600)、解除 `FastEffects`(1.0/3800) | **なし ✗(TB6c)** |
| 選択タブへのスクロール | off screen のタブを選べること | 中央へ `animateScrollTo`(`DefaultSpatial`) | **なし ✗(TB8b)** |
| ripple / state layer | — | bounded ripple | Ripple ✓(reduced-motion 対応済み) |

### キーボード・a11y(site a11y ページ / WAI-ARIA APG Tabs)

| 要件 | 実装 |
|---|---|
| `tablist` / `tab` / `aria-selected` | ✓ |
| roving tabindex(タブリストへの Tab で選択中タブへ、もう一度 Tab で外へ) | ✓ |
| 矢印でフォーカス移動 | ✓(ただし同時に選択 → **TB9a**) |
| Space/Enter で選択 | ✓(ネイティブ button) |
| Home/End | **✗(TB9b)** |
| RTL での矢印の向き | ✗(軽微欄) |
| `aria-controls` → tabpanel | 利用側が `...rest` で渡す(軽微欄) |
| 48×48 のターゲット | 高さ 48 以上・幅 90 以上 ✓ |
| focus indicator | FocusRing ✓(offset は TB7) |

## 手順メモ(今回わかったこと)

- トークンセットのメニュー項目の `innerText` は、選択中の項目だけ先頭に `check\n` が付く(例: `check\nTabs - Primary navigation`)。
  項目名の完全一致で探すと選択中のセットを取りこぼすので、`check\n` を取り除いてから比較する
- 「タブ幅」「indicator 幅」のようにレイアウト(flex)で決まる値は CSS を読むだけでは分からない。Storybook を起動して
  `getBoundingClientRect` で実測すると、ラベル幅との比較まで一度に取れる
