# Badge 監査レポート(2026-09-30)

Phase B。`src/components/Badge/` の `Badge`(`size: 'small' | 'large'`、`value` / `max`(既定 999)/ `visible`、
`children` = anchor)を3ソースで突き合わせた:

1. **m3.material.io/components/badges/specs** + **/guidelines** + **/accessibility** — Playwright MCP で token-viewer
   (セットは「Badges」の1つだけ)を visibility 表示のまま全展開して取得。寸法図(`Annotation of badge sizes, padding, and
   measurements…`)を原寸で取得して読んだ
2. **Compose androidx-main** — `Badge.kt`(`BadgedBox` / `Badge` / `BadgeDefaults`、offset 定数、`badgeBounds` ruler)、
   `tokens/BadgeTokens.kt`、`ShapeTokens` / `TypeScaleTokens` / `TypographyTokens`、samples の `BadgeSamples.kt`、
   `ComposeMaterial3Flags.kt`(badge 関連フラグなし)
3. **実装** — `Badge.tsx`, `Badge.module.css`, テスト(14件、全通過)・ストーリー(9話)。Storybook(dev)で
   `getBoundingClientRect` / computed style を実測、`dir="rtl"`、root font-size 200%、実ブラウザで axe-core 4.10 と aria snapshot。
   jsdom の一時テストで `computeAccessibleName`(テストは削除済み)

**共有実装・利用箇所について**: ライブラリ内で `Badge` を import しているコンポーネントは**ない**。NavigationBar /
NavigationRail は `badge` prop を**独自の `<span>`**(`.badge` / `.badgeDot`)で描画しており、`Badge` を再利用していない。
したがって本レポートの修正の VRT 影響は Badge のストーリーだけ。ナビゲーション項目内でのバッジの**読み上げ順**は
`docs/audits/navigation-bar.md` NB7(#175)で扱い済みなので重複させない — 本レポートは `Badge` 自身の a11y API を扱う。

## 結論サマリ

**一致している(修正不要)**:

- **色**: container **error**、label **on-error**(site `#B3261E` / `#FFFFFF`、Compose `BadgeTokens.Color` / `LargeColor` = Error、
  `LargeLabelTextColor` = OnError。実測 rgb(186,26,26) / rgb(255,255,255) — テーマ生成の error 色)
- **small(dot)**: **6×6**、形状 full(site 3dp radius、Compose `CornerFull`。実測 6×6・`border-radius: 3px`)
- **large**: 高さ **16**、最小幅 **16**、左右 padding **4**(site「padding between badge and text container 4dp」、Compose
  `BadgeWithContentHorizontalPadding` 4)、形状 full(site 8dp radius。実測 8px)、「999+」幅 **34.9**(site 16×34dp)
- **タイポ**: **label-small** 11 / 16 / 500 / 0.5(site token、Compose `LargeLabelTextFont = LabelSmall`。実測 `11px/16px 500 0.5px`)
- **位置(LTR)**: dot は anchor の top-trailing 角に内接(site「top trailing icon corner → bottom leading badge corner 6×6」、Compose
  `BadgeOffset` 6。実測: 右端 = icon 右端、上端 = icon 上端)。large は leading 端 = icon 右端 − **12**、下端 = icon 上端 + **14**
  (site 14×12、Compose `BadgeWithContentHorizontalOffset` 12 / `VerticalOffset` 14。実測 −12 / 下端 14)。桁が増えると
  **右へ伸び、leading 端は固定**(site「width expands, but keeps the same placement」、Compose `placeRelative(badgeX…)`。実測 1 / 24 / 999+
  とも leading −12)
- **RTL**: `inset-inline-*` で鏡像化(site Do「Change the position of the badge for right-to-left languages」、Compose `placeRelative`)。
  実測: dot は icon 左端に内接、large は trailing(右)端 = icon 左端 + 12
- **最大文字数**: 既定 `max = 999` → 「999+」の **4文字**(site「maximum number of characters … is four, including a +」)
- **anchor はバッジで大きくならない**(Compose `layout(width = anchor.width, …)`。実測 anchor 24×24 のまま)
- **`pointer-events: none`**(Compose「Not using Surface … because it blocks touch propagation」と同趣旨)
- **axe**: jsdom・実ブラウザとも違反なし(ただし BG1 / BG2 は axe では検出されない)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| BG1 | **バッジに正しい説明を与える手段がない** | dot は `<span role="status">` で**テキストも名前もない**(実ブラウザ aria snapshot `- status`)。large は `aria-label` が英語固定の `"{n} notifications"` で上書き・翻訳不可。利用者が渡す `aria-label` は `...rest` で **anchor の `<div>`(generic)** に付く(jsdom 実測)。全バッジが `role="status"` = polite live region で、更新時に読まれるのは `aria-label` ではなく**テキスト内容("6")** | site a11y「Numerical badges will have their number read, while non-counting badges will simply announce **New notification**」。Compose `BadgeSamples.kt`: dot に `contentDescription = "New notification"`、数値に `"8 new notifications"` / `"999+ new notifications"`。live region はどちらのソースも求めていない。→ ラベル prop(例 `label?: string \| (displayValue) => string`、既定は dot「New notification」/ 数値「{n} new notifications」)を visually-hidden テキスト等で出し、見える数字は `aria-hidden`。live region は opt-in にするか判断 | 中 |
| BG2 | **`visible={false}` のバッジが読み上げられる** | `visible` は `transform: scale(0)` を切り替えるだけで、span は a11y ツリーに残る。実測: ToggleVisibility で Hide 後も aria snapshot に `status "5 notifications"` | site a11y「When a badge is used to indicate an unread notification, **the badge gets hidden** once it's selected」— 隠したバッジは読まれてはならない。→ 非表示時は scale-out 後に `visibility: hidden`(または `aria-hidden`) | 中 |
| BG3 | **文字サイズを上げると large のラベルがコンテナからはみ出す** | `height: 16px` 固定 + `top: calc(14px − 16px)`。label-small は rem(0.6875rem / 1rem)。root font-size 200% で **22px / 32px の文字が 16px の箱**に入り、`scrollHeight 24 > clientHeight 16`、白文字が赤地の外に出る(スクリーンショットで確認) | Compose `Badge`: `defaultMinSize(minWidth = size, minHeight = size)`(16dp は**最小値**、sp の文字で伸びる)、`BadgedBox`: `badgeY = -badge.height + 14.dp`(**下端**を anchor 上端 + 14 に固定)。site も「bottom leading badge corner」基準。→ `min-height` / `min-width`、位置は `bottom: calc(100% − 14px)` | 低 |

Issue: BG1 + BG2 → #265(どちらも `Badge.tsx` のバッジ `<span>` の属性を書き換えるため同梱)、BG3 → #266

**軽微(判断・記録のみ)**:

- **value = 0 の扱い**: 実装は「0」を表示(ZeroValue ストーリー)。site は「未読通知を示すバッジは選択されたら隠す」、Compose は
  呼び出し側に任せる(0 の概念なし)。MUI の `showZero`(既定 false)相当を入れるかは API 判断。現状は利用者が `value` を
  `undefined` にすれば消えるので issue 化しない
- **負数・`max` の上限**: `value={-2}` は「-2」をそのまま表示、`max={99999}` なら 6文字の「99999+」になりうる。site の上限は 4文字。
  JSDoc に「max は 999 以下を推奨」と書く程度
- **表示アニメーション**: 実装は `scale(0 → 1)` 150ms standard。Compose の `Badge` / `BadgedBox` にアニメーションはなく、site も
  規定しない(矛盾なし)→ 維持。ただし large の `transform-origin: left center` は物理指定で、RTL では scale の原点が
  leading 端(右)にならない。BG1 / BG3 の修正時に `transform-origin` を論理的に(RTL で `right center`)直すとよい
- **`--_large-shape: 8px`**: CLAUDE.md の「round は `calc(var(--_height) / 2)`」規約と違う直書き。高さ 16 固定なら同値。BG3 で
  高さが可変になっても角丸 8 は site の値(「8dp corner radius」)そのもの — 伸びた時に pill を保つなら `calc(height / 2)` にする
- **clamp(`badgeBounds`)**: Compose は NavigationBar / Rail / NavigationItem の中でだけ、バッジが項目の右端・上端を越えないよう
  clamp する。単体の `BadgedBox` には clamp なし → 単体の `Badge` は現状(clamp なし)で一致。ナビ内は独自 span なので
  Nav 側の話
- **anchor の対象**: site「Badge containers are anchored inside the icon bounding box」。`Badge` は `children` の箱に対して配置するので、
  `<Badge><IconButton/></Badge>` とすると 40dp のボタン角に付く。Compose のサンプルは `IconButton { BadgedBox { Icon } }` の形。
  JSDoc / ストーリーで「アイコンを包む」使い方を示す
- **dot のサイズの呼び分け**: `size="small"` は `value` を無視する(JSDoc 済み)。Compose は `content` の有無で決まる。
  Phase A #12(A1)で `small/large` の名前は維持と決定済み — 再提起しない

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| large の寸法の性質 | 「one digit size 16dp」「max character count 16×34dp」(固定値に見える) | `defaultMinSize(16, 16)` = 最小値。34 は 4 + 「999+」+ 4 の結果 | 矛盾ではない(site は既定文字サイズでの結果値)→ **最小値として実装**(BG3) |
| large 角丸 | 8dp corner radius | `CornerFull` | 16dp 高では同値。高さが伸びた場合は full を採る(軽微欄) |
| 数値ラベルの文言 | 「Numerical badges will have their number read」 | サンプル `"8 new notifications"` | 同趣旨。site は数だけとも読めるが、Compose の文言を既定に採る(BG1。翻訳のため上書き可能にする) |
| large 用トークン | `Badge large color` / `Badge large label text color` | `LargeColor` / `LargeLabelTextColor` はトークンにあるが `Badge.kt` は読まない(`BadgeDefaults.containerColor` + `contentColorFor`) | 値は同じ(error / on-error)→ **実装どおり** |

## 詳細対照表

### 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| small サイズ | 6 | min 6 | 6 ✓ |
| large 高さ | 16 | **min** 16 | **固定** 16 ✗ BG3 |
| large 最小幅 | 16 | min 16 | 16 ✓ |
| large 左右 padding | 4 | 4 | 4 ✓ |
| 「999+」の幅 | 34 | 内容 + 8 | 34.9 ✓ |
| small の位置 | top-trailing 角に内接(6×6) | leading = end − 6、下端 = top + 6 | 同じ ✓ |
| large の位置 | leading = end − 12、下端 = top + 14 | 同じ(下端基準) | 同じ ✓(ただし **top 基準** — BG3) |
| RTL | 位置を鏡像にする | `placeRelative` | 論理プロパティ ✓ |

### 色・タイポ・形状

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| container | error | Error | error ✓ |
| label | on-error | OnError(`contentColorFor`) | on-error ✓ |
| label type | 11 / 16 / 500 / 0.5 | LabelSmall(同値) | label-small ✓ |
| small 形状 | 3dp | CornerFull | 3px ✓ |
| large 形状 | 8dp | CornerFull | 8px ✓ |
| コントラスト | 既定色で 3:1 以上 | — | 既定色のみ ✓ |

### 振る舞い・a11y

| 項目 | site / Compose | 実装 |
|---|---|---|
| dot の読み上げ | 「New notification」 | **名前なし ✗ BG1** |
| 数値の読み上げ | 数を読む / "{n} new notifications" | 英語固定 "{n} notifications"、上書き不可 **✗ BG1** |
| 非表示のバッジ | 読まない | **読まれる ✗ BG2** |
| live region | 求めていない | 全バッジが `role="status"`(BG1 で判断) |
| ナビ先の後に読む | badges/accessibility | Nav 側 #175(NB7) |
| 最大 4文字 | 「999+」 | 既定 max 999 ✓ |
| 文字拡大 | Compose は伸びる | **はみ出す ✗ BG3** |
| アニメーション | なし | scale 150ms(維持、原点は軽微) |
| axe | — | 違反なし ✓ |

## 手順メモ(今回わかったこと)

- 「見えない」状態(`transform: scale(0)`、`opacity: 0`)は a11y ツリーから外れない。`visible` 系 prop は aria snapshot で
  非表示後の状態を必ず確認する(BG2 は axe では出ない)
- rem ベースの文字を固定 px の箱に入れているコンポーネントは、root font-size 200% で `scrollHeight > clientHeight` を測ると
  すぐ見つかる(BG3)
- Compose の a11y 文言はコンポーネント本体ではなく **samples**(`BadgeSamples.kt`)にある。semantics を持たない小部品は
  samples ディレクトリまで見る
