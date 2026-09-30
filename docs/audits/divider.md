# Divider 監査レポート(2026-09-30)

Phase B。`src/components/Divider/` の `Divider`(`variant: 'full-width' | 'inset' | 'middle-inset'`、
`orientation: 'horizontal' | 'vertical'`、`<hr>`)を3ソースで突き合わせた:

1. **m3.material.io/components/divider/specs** + **/guidelines** + **/accessibility** — Playwright MCP で token-viewer
   (セットは「Divider」の1つ、warning 行なし)を visibility 表示のまま全展開して取得。寸法図(1dp × ∞)を原寸で取得
2. **Compose androidx-main** — `Divider.kt`(`HorizontalDivider` / `VerticalDivider` / 非推奨 `Divider` / `DividerDefaults`)、
   `tokens/DividerTokens.kt`
3. **実装** — `Divider.tsx`, `Divider.module.css`, テスト(9件、全通過)・ストーリー(3話)。Storybook(dev)で
   `getBoundingClientRect` / computed style を実測、`dir="rtl"`、`forced-colors: active` のエミュレーション、実ブラウザで
   axe-core 4.10 と aria snapshot

**共有実装・利用箇所について**: `Divider` を使うのは **SideSheet**(`showDivider` — header と content の間。Standard ストーリーで
`showDivider` を指定しているので VRT に出る)。Menu の区切りは**別実装**の `MenuDivider`(`<hr>` + 独自 CSS、`role="menu"` 内の
separator として正しい)で、本レポートの対象外。SearchBar の divider も独自(`docs/audits/searchbar.md` SB5b)。

## 結論サマリ

**一致している(修正不要)**:

- **太さ 1dp**(site token「Divider thickness 1dp」+ 寸法図、Compose `DividerTokens.Thickness` = `DividerDefaults.Thickness` = 1.0.dp。
  実測 高さ 1 / vertical 幅 1)
- **色 outline-variant**(site `#CAC4D0`、warning なし、Compose `DividerTokens.Color = OutlineVariant`。実測 rgb(202,196,207))
- **full-width = 100%**(site、Compose `fillMaxWidth()` / `fillMaxHeight()`。実測 親幅いっぱい、vertical は親の高さ 120 いっぱい)
- **inset: leading 16 / trailing 0**、**middle-inset: 16 / 16**(site Measurements。実測 InList で start 16 / end 0)
- **RTL**: `margin-inline-*` の論理プロパティで inset が右側に移る(site「align with the leading edge」。実測 RTL で右から 16 / 左 0)
- **variant が horizontal / vertical の2向きだけ**(Compose も `HorizontalDivider` / `VerticalDivider` のみ。inset は Compose では
  modifier の padding で表す — 本ライブラリの `variant` は site の用語に合わせた Web 的な表現で、API 方針どおり)
- **UA の `<hr>` スタイルの除去**(`border: none; margin: 0`)、`flex-shrink: 0`
- **axe**: jsdom・実ブラウザとも違反なし

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| DV1 | **すべての divider が separator として読み上げられる(装飾として出せない)** | 常に `<hr role="separator" aria-orientation="…">`。実ブラウザ aria snapshot(InList): `text, separator, text, separator, text`。SideSheet の header 下の線も同様。`role="separator"` は `<hr>` の暗黙 role と重複、`aria-orientation="horizontal"` も既定値の重複 | site a11y「Dividers are **decorative elements**, which have no contrast minimums」。Compose は `Canvas` + `drawLine` だけで **semantics なし**(TalkBack に出ない)。→ 既定を装飾(`aria-hidden` / `role="none"`)にし、意味のある区切りは opt-in(例 `decorative={false}`、または `role="separator"` を渡す)。vertical の `aria-orientation` は semantic な場合だけ | 低 |

Issue: DV1 → #267

**軽微(判断・記録のみ)**:

- **vertical の inset**: 実装は vertical にも `inset`(上 16)/ `middle-inset`(上下 16)を適用する。site の inset は横向きの
  説明しかなく(「indented from both sides of the screen」)、Compose にも inset はない。CSS のコメントどおりライブラリ独自の
  便宜として維持
- **vertical の高さは flex 親に依存**: `align-self: stretch` で伸ばすので、flex / grid 以外の親では高さ 0 になる(Compose は
  `fillMaxHeight()` で親の制約いっぱい)。JSDoc に「flex 行の中で使う」と書く程度
- **forced-colors(Windows ハイコントラスト)で消える**: 線を `background-color` で描いており、`forced-colors: active` では
  背景が Canvas 色に置き換わる(実測 rgb(255,255,255)、線が見えなくなる)。site は「装飾でコントラスト要件なし」なので
  CONFIRMED にはしないが、`@media (forced-colors: active)` で `background-color: CanvasText` か `border-top` にすると堅い
- **site Measurements の他の行**: 「Space between divider & supporting-text 4dp」「Divider right margin 8dp」「Divider bottom margin 8dp」は
  subheader などの周辺レイアウトの値で、`Divider` 自体の prop ではない(利用側の List / section のレイアウトで扱う)
- **Hairline**: Compose は `Dp.Hairline` で物理 1px の線を出せる(KDoc)。Web は `1px` = CSS px で十分。対応不要
- **`--_color` / `--_thickness` の名前**: CLAUDE.md の `part.property` 規約なら `--_color` → `--_divider-color` 等だが、部品が1つ
  しかないので実害なし。DV1 の修正時に揃えてもよい

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| inset / middle-inset | 16 / 0、16 / 16 を規定 | inset のパラメータなし(modifier の padding) | 矛盾ではない(Compose は modifier で表す)→ site の値で `variant` を提供(実装どおり) |
| a11y 上の性質 | 「decorative elements」 | semantics なし | 両者一致 → **装飾が既定**(DV1)。Web の `<hr>` の thematic break 用途は opt-in で残す |
| 色 | outline-variant(warning なし) | OutlineVariant | 一致(tabs.md の TabRow divider の裁定とも同じ) |

## 詳細対照表

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 太さ | 1dp | 1.0.dp | 1px ✓ |
| 色 | outline-variant | OutlineVariant | outline-variant ✓ |
| full-width | 100% | fillMaxWidth / fillMaxHeight | 100% / stretch ✓ |
| inset(horizontal) | start 16 / end 0 | — | 16 / 0 ✓ |
| middle-inset(horizontal) | 16 / 16 | — | 16 / 16 ✓ |
| inset(vertical) | — | — | 上 16 / 上下 16(独自、軽微) |
| RTL | leading 側を inset | — | 論理プロパティ ✓ |
| role | 装飾 | なし | **separator ✗ DV1** |
| forced-colors | — | — | 消える(軽微) |
| axe | — | — | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- 装飾部品(Divider など)の a11y は「axe 違反なし」では判断できない。site の accessibility ページの「decorative」の一文と
  Compose の semantics の有無を突き合わせ、実ブラウザの aria snapshot で読み上げのノイズを確かめる
- 線を `background-color` で描く部品は `emulateMedia({ forcedColors: 'active' })` で消えないか確認する
