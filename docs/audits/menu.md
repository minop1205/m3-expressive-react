# Menu 監査レポート(2026-07-18)

Tier 1 監査(/audit-component 手順)。ソース: ① m3.material.io/components/menus/specs
(トークン4セット全展開)② Compose androidx-main(Menu.kt / MenuDefaults / AndroidMenu.android /
MenuTokens / SegmentedMenuTokens / Standard・VibrantMenuTokens / ListTokens / MenuPosition)
③ WAI-ARIA APG(menu-button / menu パターン)④ 実装(src/components/Menu/)。

## 前提: どの仕様を対象とするか

m3.material.io は Menu を **vertical menu(Expressive、推奨)** と **baseline(旧来)** に分割した。
Compose androidx-main も新旧2世代を併存させている(classic `DropdownMenu` = baseline 相当、
新 `DropdownMenuPopup`/`DropdownMenuGroup` = vertical/segmented 相当)。
**現実装は classic/baseline を対象としており、それ自体は妥当**(既存プロダクト向けに有効と
site も明言)。本監査は「baseline としての正しさ」を判定し、vertical menu は将来課題(M8)とする。

## 結論サマリ

**一致(修正不要)**: コンテナ色 surface-container / コーナー 4dp / elevation Level2 相当の
shadow / コンテナ縦 padding 8dp / 幅 112〜280dp / item 高さ 48dp / item 横 padding 12dp /
テキスト-アイコン間 12dp / label-large(site・Compose 出荷実装とも)/ item テキスト on-surface /
アイコン on-surface-variant / disabled 38% / hover state layer 0.08 / `role="menu"`・
`role="menuitem"`・trigger の `aria-haspopup`・`aria-expanded` / outside クリックと Escape で閉jour。

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき姿 | 深刻度 |
|---|---|---|---|---|
| M1 | **フォーカス管理が全欠落** | open してもフォーカスは trigger のまま。close/Escape 後の復帰もなし | APG: Enter/Space/↓ で開いたら最初の item にフォーカス(↑ は最後)、閉じたら trigger に復帰 | **高** |
| M2 | **メニュー内キーボードナビが全欠落 + item が Tab 順序を汚染** | item は素の `<button>`(tabindex 0)。矢印/Home/End なし。Tab でメニューが閉じない | APG: item は roving tabindex(-1)、↑↓ で移動(wrap)、Home/End、Tab で閉じて脱出。Compose も focusable Popup でフォーカスを閉じ込める | **高** |
| M3 | typeahead なし | — | APG: 印字文字で先頭一致 item へ移動(推奨扱い) | 低 |
| M4 | **pressed/focus の state layer がない**(hover 0.08 のみ)。Ripple・FocusRing 未使用、focus は手書き 2px outline | hover のみ手書き | Compose は item に ripple(hover 0.08 / focus 0.10 / pressed 0.10)。site の focus indicator は secondary 3dp/offset −3dp。プロジェクト規約のプリミティブ(Ripple/FocusRing)へ置換 | 中 |
| M5 | **アイコン 20px** | leading/trailing 20px(CSS コメントは「Compose が 20dp」と主張 — 誤り。20dp は新 segmented トークン) | **24dp**(site baseline 24dp、Compose classic は ListTokens.ItemLeading/TrailingIconSize = 24dp で両ソース一致) | 中 |
| M6 | **開閉モーションなし**(display 切替) | — | Compose: scale 0.8→1(FastSpatial: standard 0.9/1400)+ alpha 0→1(FastEffects 1.0/3800 ≒ 数十ms)、transform-origin はアンカー交差点(下に開けば上端起点)。CSS 近似: `transform-origin: top` + scale/opacity transition | 中 |
| M7 | **衝突回避なし**(常に trigger の下に固定) | 画面下端でもそのまま下に出る | Compose: 下→上→中央のフォールバックチェーン + 窓端マージン(縦48dp)。少なくとも「下に入らなければ上に開く」flip は必要 | 中 |

**判断・記録のみ(Issue 化するが仕様逸脱ではない)**:

- **M8: Expressive vertical menu 変種が未実装** — item 44dp・アイコン 20dp・leading/trailing
  16dp・surface-container-low・selected(tertiary-container)・グループ/gap 2dp・vibrant 配色・
  選択状態のシェイプモーフ。Compose androidx-main は新 API(`DropdownMenuPopup`)を出荷済みなので
  「Compose に存在する変種」に該当。Phase A の API 方針確定後に feature として実装検討
- disabled item が native `disabled` でフォーカス不能 — APG は「フォーカス可能だが起動不可」
  (aria-disabled)を推奨。M2 実装時に `aria-disabled` 方式へ移行するのが自然
- Divider/グループ/セクションラベルのスロットなし(baseline anatomy には divider がある)。
  M8 と合わせて検討

## ソース間の食い違い(裁定)

| 項目 | site | Compose | 裁定 |
|---|---|---|---|
| item ラベルの typescale | label-large(14/20/500/0.1) | 出荷実装 labelLarge、ただし ListTokens は BodyLarge で TODO コメントあり | 両者の実効値一致 → **label-large 維持** |
| selected item の色(baseline) | secondary-container / on-secondary-container | MenuTokens に同トークンがあるが**実装未使用**(dead tokens)。新 API の selected は tertiary 系 | baseline に selected 状態を実装しない現状は妥当。M8 で tertiary 系を採用 |
| キーボード操作 | (言及なし) | 矢印キー処理は androidx-main に存在せず(focusable Popup + プラットフォーム走査任せ。desktop 実装は JetBrains fork 側) | Web では **APG が規範** → M1/M2 は APG 準拠で実装 |
| アイコンサイズ | baseline 24dp / vertical 20dp | classic 24dp / segmented 20dp | 対象は baseline → **24dp**(M5) |

## 詳細対照(baseline)

| 属性 | site | Compose classic | 実装 | 判定 |
|---|---|---|---|---|
| コンテナ色 | surface-container (#F3EDF7) | MenuTokens.ContainerColor = SurfaceContainer | surface-container | ✓ |
| コーナー | 4dp | CornerExtraSmall 4dp | corner-extra-small(4px) | ✓ |
| elevation | (未解決セル) | shadow Level2 3dp + tonal 0 | shadow-level2 | ✓ |
| コンテナ縦 padding | — | 8dp | 8px | ✓ |
| 幅 | min 112 / max 280 | item min 112 / max 280 | menu min 112 / max 280 | ✓(適用先は同義) |
| item 高さ | 48dp | 48dp(ハードコード) | min-height 48px | ✓ |
| item 横 padding | 12dp | 12dp | 12px | ✓ |
| 要素間 | 12dp | 12dp | gap 12px | ✓ |
| アイコン | **24dp** | **24dp**(ListTokens) | 20px | **✗ M5** |
| item 文字色 | on-surface | ListTokens OnSurface | on-surface | ✓ |
| アイコン色 | on-surface-variant | OnSurfaceVariant | on-surface-variant | ✓ |
| disabled | on-surface 0.38 | on-surface 0.38 | 38% color-mix(アイコン含む) | ✓ |
| state layer | hover .08 / focus .1 / pressed .1 | ripple 同値 | hover のみ | **✗ M4** |
| モーション | — | scale .8→1 FastSpatial + alpha FastEffects, transform-origin=交差点 | なし | **✗ M6** |
| 配置 | — | 下→上→中央 fallback、縦マージン48dp | 下固定 | **✗ M7** |

## スキルへのフィードバック

- 対話型コンポーネントでは **APG 比較が最大の発見源**(視覚トークンより先に挙動を見るべき)。
  Compose の挙動は「プラットフォーム機構(focusable Popup)頼み」のことがあり、Web では
  APG を規範とする裁定が必要になる
- Compose には**実装未使用の dead token**(MenuTokens の selected 系)がある — トークンファイル
  だけ読むと存在しない機能を「あるべき」と誤認する。Defaults/実装参照の裏取りは必須(Button の
  教訓の再確認)
