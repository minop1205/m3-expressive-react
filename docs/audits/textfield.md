# TextField 監査レポート(2026-09-30)

Phase B Tier 2 の先頭。3ソースを突き合わせた:

1. **m3.material.io/components/text-fields/specs** + **/accessibility** — Playwright MCP で
   トークンテーブル2セット(Text field - Filled / Outlined)を全展開して取得、寸法表・a11y 本文を抽出
2. **Compose androidx-main** — `TextField.kt` / `OutlinedTextField.kt` / `SecureTextField.kt` /
   `TextFieldDefaults.kt` / `internal/TextFieldImpl.kt` / `FilledTextFieldTokens`・
   `OutlinedTextFieldTokens`(v0_103)/ `MotionScheme`・`StandardMotionTokens`・`ExpressiveMotionTokens`
3. **実装** — `src/components/TextField/TextField.tsx`, `TextField.module.css`, テスト(30件、全通過)・ストーリー

## 結論サマリ

**一致している(修正不要)**:

- **寸法**: 高さ 56、filled シェイプ extra-small の上角のみ(4/4/0/0)、outlined シェイプ extra-small(4)、
  左右パディング 16(アイコンありは 12)、アイコン 24、アイコンとテキストの間 16(テキスト開始 x=52 は
  Compose の 48dp アイコンボックス+4 と一致)、filled でラベルがあるときの上下 8(浮上ラベル top 8 + 16 行 → 入力 top 24 + 24 行 + 8 = 56)、
  supporting text は上 4 / 左右 16、カウンターとの間 16、prefix/suffix とテキストの間 2
- **線幅**: filled インジケーター 1 → フォーカスで 2、outlined 枠 1 → フォーカスで 2、disabled は 1 のまま
- **outlined の切り欠き**: ラベル幅 + 左右 4(開始 x=12)、浮上ラベル x=16(leading icon があっても 16 のまま)、
  浮上前ラベルの開始は leadingWidth+4(=52)
- **タイポグラフィ**: 入力/prefix/suffix/placeholder = bodyLarge、ラベル bodyLarge → bodySmall、supporting = bodySmall
- **色(全状態)**: filled container = surface-container-highest、outlined 枠 = **`outline`**(outline-variant ではない
  — 下記裁定)、インジケーター = on-surface-variant → hover で on-surface → focus で primary、ラベル =
  on-surface-variant → focus で primary、入力 = on-surface、placeholder/prefix/suffix = on-surface-variant、キャレット =
  primary(error で error)、error 時は indicator/枠/label/trailing icon/supporting が error、leading icon は
  on-surface-variant のまま、error hover は on-error-container、disabled は container on-surface 4% / 枠 on-surface 12% /
  その他 on-surface 38%、filled hover の state layer は on-surface 0.08
- **挙動**: フォーカスしただけで(空でも)ラベルが浮上する、placeholder はフォーカス中かつ空のときだけ表示、prefix/suffix は
  フォーカス中または値があるときだけ表示、error 表示中も focus で 2dp になる、`<label htmlFor>` による関連付け、
  `aria-invalid`、`aria-describedby` → supporting、error 文言に `role="alert"`、required でラベル末尾に `*`
  (a11y 名にも含まれる)、ネイティブ input による Tab 移動、コンテナのクリックで input にフォーカス

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| T1a | **outlined の hover でラベル色が変わらない** | on-surface-variant のまま(枠だけ on-surface) | ラベルも **on-surface**(site: `hover label text color` #1D1B20。Compose トークン `OutlinedTextFieldTokens.HoverLabelTextColor` = OnSurface も同値) | 低 |
| T1b | **error + focus + hover で hover 色が勝つ** | `.error:not(.disabled):hover`(詳細度 0,3,0)が `.error.focused`(0,2,0)に勝つ → filled のラベルと、両バリアントの trailing icon が on-error-container のままになる | フォーカス中は error focus の値(label/trailing icon = **error**。site の Error / Focus セット)。outlined の枠は `.outlined.error.focused` が後勝ちして正しく error になる | 低 |
| T2 | **prefix/suffix が支援技術から input に関連付けられていない** | `<span>` が浮いているだけで、`aria-describedby` 等の参照がない。「$」や「kg」を読み上げない | site a11y:「prefix と suffix の a11y ラベルは一意の id を持つ必要がある」。Compose も prefix・本文・suffix をまとめて読ませる。→ id を振って input の `aria-describedby` に含める | 中(a11y) |
| T3 | **文字数カウンターに a11y ラベルがない** | `aria-describedby` 経由で「3 / 20」がそのまま読まれる | site a11y:「残り文字数カウンターは label 内で “character count” と呼ぶべき」。→ 視覚的に隠した文言を付ける(例: 「character count 3 of 20」) | 中(a11y) |
| T4 | **min-width** | 210px(根拠不明) | **280dp**(Compose `TextFieldDefaults.MinWidth` = 280.dp。site に記載なし=矛盾なし) | 低(VRT 差分あり) |

Issue: T1a/T1b → #129、T2/T3 → #130(同じ `aria-describedby` の組み立てを触るため同梱)、T4 → #131

**軽微(判断・記録のみ)**:

- **error 表示時の `role="alert"` の付け替え**: `supportingText` がある状態で `error` を立てると、既存の
  `<div>` に role と本文が同時に付く。スクリーンリーダーは「既存要素に role=alert を後付け」を読み上げないことがある
  (NVDA/JAWS で挙動差)。常設の live region(`aria-live="assertive"` を最初から付けておく)にすれば確実。
  実機 SR 検証が必要なので PLAUSIBLE にとどめる
- **error 中の supporting text の扱い**: site a11y は「supporting と error の両方を表示する場合、supporting →
  error の順で読ませる」。実装は error 中に supporting を error で置き換える(視覚仕様どおり)ので、この条件に
  当たらない。両方を読ませたいなら、非表示の supporting も `aria-describedby` に含める選択肢がある
- **outlined の浮上ラベルが root の上にはみ出す**: Compose はラベルがある outlined にだけ上 8dp
  (bodySmall 行高の半分)の余白を足して、レイアウト内に収めている。実装は `top: -8px` ではみ出す(周囲に余白が
  ないと、直前の要素に重なる)。Web ではマージンで調整するのが普通で、material-web も同じ構造。変えると外形寸法が
  変わる破壊的変更になるので、記録のみ
- **インタラクティブな trailing icon**: `Password` ストーリーは素の `<button>`(24px、state layer なし)を使っており、
  48dp のタッチターゲット規約を満たさない。Compose は icon slot を 48dp ボックスにしている。実装の slot 中心
  (端から 24px)は 48dp ボックスの中心と一致するので、`<IconButton>` を入れれば正しく収まる。ストーリーと
  JSDoc で `IconButton` の利用を推奨するのが妥当(後述のドキュメント改善と一緒に)
- **filled フォーカスインジケーターの遷移**: Compose は太さを 1→2dp にアニメーション(FastSpatial)、実装は
  2px 線のクロスフェード(150ms)。見た目の差は僅か
- **モーション**: ラベル浮上 150ms standard easing は Compose standard の FastSpatial(0.9/1400、ほぼ
  臨界減衰)の妥当な近似。`MaterialExpressiveTheme` では expressive(0.6/800、明確なバウンス)になるが、
  ライブラリ全体でどちらの MotionScheme を既定にするかは横断的な判断(Button B5 と同じ論点)。placeholder
  フェード(83ms + 67ms 遅延 = material-web 由来)と Compose SlowEffects(1.0/800)の差も僅か
- **テキスト選択色**: Compose は handle primary / 背景 primary 40%(`TextSelectionColors`)。実装は
  ブラウザ既定。site にトークンがなく、Compose でもテーマ全体の設定なので、`::selection` を足すかは任意
- **disabled の prefix/suffix**: Compose は on-surface-variant @38%、実装は on-surface @38%(他の要素と同じ)。
  site にトークンがなく、見た目の差はほぼない
- **Compose にあって実装にないもの**(機能追加の候補、今回は対象外): `SecureTextField`(難読化モード)、
  `TextFieldLabelPosition.Above`(ラベルをコンテナの外に常時小さく表示)・`isAlwaysMinimized`、Expressive の
  `roundedShape`(12dp)と `tonalColors()`(Compose 側にまだ `TODO(b/448727879)` が付いており、仕様が流動的)
- テスト追加候補: hover/focus/error の組み合わせの色(T1)、prefix/suffix とカウンターの a11y 名(T2/T3)、
  multiline の自動伸長、`readOnly` でフォーカススタイルが出ること(Compose と同じ)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| hover 状態全般 | filled に state layer on-surface 0.08、indicator on-surface、outlined の枠とラベル on-surface、error hover on-error-container | トークンには同じ値があるが、`TextFieldColors` に hover スロットがなく**一切使っていない** | site 優先 → **hover を実装する**(現実装のまま + T1a) |
| outlined 枠の色 | Outline(#79747E) | `OutlinedTextFieldTokens.OutlineColor` = Outline。Expressive の `tonalColors()` のみ OutlineVariant | 両者一致 → **`outline` を維持**。CLAUDE.md の「outlined の枠は outline-variant」は Button 系の話で、TextField には当てはまらない |
| フォーカス時の outlined 枠の太さ | `focus outline width` **3dp**(同じ表の `Focus indicator` 群は warning=非推奨マーク付き) | トークン `FocusOutlineWidth` = **2.0dp**、Defaults も 2dp | 3dp は旧「フォーカスインジケーター」仕様の名残と判断(CLAUDE.md の「site 行の鮮度を疑う」)→ **2px を維持** |
| filled フォーカスインジケーター | `height` 2dp と `thickness` 3dp が併記 | 2dp | 同上 → **2px を維持** |
| filled disabled container | on-surface @ 0.04 | トークンは on-surface @0.04 だが、Defaults は `surfaceContainerHighest` 不透明のまま(TODO コメントなし) | site とトークンが一致 → **on-surface 4% を維持**(現実装のまま) |

## 詳細対照表

### 寸法(site 寸法表 / Compose 実装値 / 実装)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| コンテナの高さ | 56 | 56(min) | 56 ✓ |
| 最小幅 | — | 280 | **210 ✗(T4)** |
| 左右パディング(アイコンなし) | 16 | 16 | 16 ✓ |
| 左右パディング(アイコンあり) | 12 | 48dp ボックス → 端から 12 | 12 ✓ |
| アイコンとテキストの間 | 16 | 12(ボックス内余白)+ 4 | 16 ✓ |
| filled の上下(ラベルあり) | 8 | 8 | 8 ✓ |
| supporting の上 | 4 | 4 | 4 ✓ |
| supporting とカウンターの間 | 16 | —(カウンターなし) | 16 ✓ |
| outlined 浮上ラベルの左右余白 | 4 | 4 | 4 ✓ |
| prefix/suffix とテキストの間 | — | 2 | 2 ✓ |
| アイコン | 24 | 24 | 24 ✓ |
| indicator / 枠(通常 → focus) | 1 → 2(site の 3 は裁定済み) | 1 → 2 | 1 → 2 ✓ |

### カラー(light、全状態を確認)

| 要素 | enabled | hover | focus | disabled | error | error hover | error focus |
|---|---|---|---|---|---|---|---|
| filled container | surface-container-highest ✓ | + on-surface 0.08 ✓ | ✓ | on-surface 4% ✓ | ✓ | + 0.08 ✓ | ✓ |
| filled indicator | on-surface-variant ✓ | on-surface ✓ | primary 2dp ✓ | on-surface 38% ✓ | error ✓ | on-error-container ✓ | error 2dp ✓ |
| outlined 枠 | outline ✓ | on-surface ✓ | primary 2dp ✓ | on-surface 12% ✓ | error ✓ | on-error-container ✓ | error 2dp ✓ |
| label | on-surface-variant ✓ | filled ✓ / **outlined: on-surface ✗(T1a)** | primary ✓ | on-surface 38% ✓ | error ✓ | on-error-container ✓ | error(**filled + hover 時 ✗ T1b**) |
| input | on-surface ✓ | ✓ | ✓ | on-surface 38% ✓ | on-surface ✓ | ✓ | ✓ |
| leading icon | on-surface-variant ✓ | ✓ | ✓ | on-surface 38% ✓ | on-surface-variant ✓ | ✓ | ✓ |
| trailing icon | on-surface-variant ✓ | ✓ | ✓ | on-surface 38% ✓ | error ✓ | on-error-container ✓ | error(**hover 時 ✗ T1b**) |
| supporting | on-surface-variant ✓ | ✓ | ✓ | on-surface 38% ✓ | error ✓ | error ✓ | error ✓ |
| caret | primary ✓ | — | — | — | error ✓ | — | error ✓ |

### a11y(site accessibility ページの要件)

| 要件 | 実装 |
|---|---|
| Tab でフォーカス(disabled 以外) | ネイティブ input ✓ |
| a11y 名 = ラベル(required の `*` を含む) | `<label htmlFor>` + ラベル文字列に `*` ✓ |
| error 文言に alert ロール | `role="alert"` ✓(付け替えの確実性は軽微欄) |
| supporting text を読ませる | `aria-describedby` ✓ |
| prefix/suffix に一意の id を振って関連付け | **✗(T2)** |
| カウンターを “character count” として読ませる | **✗(T3)** |
| インタラクティブな trailing icon は機能を示すラベル+ボタンのロール | 利用側の責務(ストーリーは `aria-label` あり。タッチターゲットは軽微欄) |

## 手順メモ(今回わかったこと)

- m3.material.io のトークンセット切り替えで、前回の呼び出しでメニューが開いたままだと、ボタンのクリックで
  メニューが**閉じて**しまい、選択が効かない。`[role="menuitem"]` が既にあるかを確かめてから開き、切り替え後に
  `button.active-token-set-button` の文字列で選択できたか検証すること
- m3.material.io の a11y ページ(`/accessibility`)は、トークン表にない要件(prefix/suffix の id、カウンターの
  文言など)を含む。入力系コンポーネントでは specs と一緒に必ず読む
