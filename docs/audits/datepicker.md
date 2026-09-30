# DatePicker 監査レポート(2026-09-30)

Phase B Tier 2。3ソースを突き合わせた:

1. **m3.material.io/components/date-pickers/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   トークンテーブル3セット(Date picker - Docked / Modal / Modal input)を全展開して取得(寸法・シェイプは `visibility`
   ビューで数値化)、a11y ページのキーボード表・ラベル表・読み上げ要件、guidelines の挙動を抽出。寸法図は画像のみ
2. **Compose androidx-main**(snapshot 83c1be95)— `DatePicker.kt`(`DatePicker` / `DatePickerDefaults` /
   `DatePickerColors` / `YearPicker` / `MonthsNavigation` / `dayOnKeyEvent`)、`DateRangePicker.kt`、`DateInput.kt`、
   `DatePickerDialog`(androidMain)、`tokens/DatePickerModalTokens.kt`・`DateInputModalTokens.kt`、`DialogTokens`・
   `ElevationTokens`・`MotionScheme`・`internal/Strings.kt`・`internal/CalendarModel.kt`
3. **実装** — `src/components/DatePicker/`(`DatePicker.tsx` / `DatePickerField.tsx` と各 `.module.css`)、テスト
   (16件、全通過)・ストーリー(Modal / Range / Docked)。寸法・色は Storybook で `getComputedStyle` /
   `getBoundingClientRect` を実測、ARIA・キーボード・axe(ポップアップを開いた状態を含む)は一時テスト(コミットしていない)で確認

前提: 公開 API は `DatePicker`(単一 / `range`)と `DatePickerField`(docked)の2つ。`onChange(value)` の値ファーストは
Phase A 裁定 **A8** で確定済みのため対象外。Compose には **docked の実装もトークンもない**(date 系トークンは
`DatePickerModalTokens` と未使用の `DateInputModalTokens` のみ)ので、docked は site のトークン表だけを正として照合した。

## 結論サマリ

**一致している(修正不要)**:

- **コンテナ(modal)**: 幅 360、シェイプ extra-large(28)、色 surface-container-high、影 `shadow-level3`(6dp — 下記裁定)
- **ヘッダー**: supporting text(「Select date」)= label-large・on-surface-variant、headline = headline-large(単一日付時)、
  ヘッダー下の divider = outline-variant 1px
- **日付セル**: 40×40 の円、48dp ピッチ(40 + margin 4×2 = Compose の 48dp タッチターゲット)、body-large(16px)、
  unselected = on-surface、selected = primary / on-primary、today = primary の 1px 輪郭 + primary ラベル(選択時は輪郭なし)、
  disabled = on-surface 38%
- **曜日ラベル**: on-surface・body-large・48×48 セル、ナロー表記(「S M T…」— Compose の `weekdayNames[i].second` と同じ)
- **範囲選択**: 帯の色 secondary-container、範囲内ラベル on-secondary-container、帯は端点セルの中心から始まり
  選択円がキャップになる構造(Compose `drawRect` と同じ)、選択ロジック(未選択/両端確定なら新しい start、start 以降なら end、
  start より前なら start をやり直し — Compose `updateDateSelection` と同一)
- **月ナビ**: prev/next は 40px の円形アイコンボタン・on-surface-variant(Compose `navigationContentColor` = on-surface-variant)、
  月ラベル on-surface-variant 14px/500
- **挙動**: min/max 外の日付は disabled、docked は選択で閉じる・外側クリックと Escape で閉じる、controlled/uncontrolled、
  axe はポップアップを開いた状態・range 表示でも違反 0

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| DP1 | **範囲の帯が描画されていない** | `.day::before { z-index: -1 }` が、スタッキングコンテキストを作らない `.day` / `.picker` を突き抜け、`.picker` の背景の**下**に描かれる。Range ストーリーで 5〜12 日の間に帯がないことをスクリーンショットで確認(VRT ベースラインもこの壊れた状態) | secondary-container の帯が start〜end を連結(site guidelines「間の日付は subtle highlight でつながる」、site/Compose `RangeSelectionActiveIndicatorContainerColor`)。`.day` に `isolation: isolate` を付けるか、帯を別レイヤー(セル背景)で描く | 高 |
| DP2a | **headline の色** | on-surface | **on-surface-variant**(site `Header headline color` #49454F、Compose `headlineContentColor = HeaderHeadlineColor` = OnSurfaceVariant) | 低 |
| DP2b | **range の headline が headline-large で折り返す** | 32/40 で「Fri, Jun 5 – Fri, Jun 12」が2行(ヘッダー高 165 を実測) | **title-large(22/28)・1行**(site `Range selection header headline` 22/28、Compose `RangeSelectionHeaderHeadlineFont` = TitleLarge、`maxLines = 1`) | 中 |
| DP3 | **行高・字間トークンが抜けている** | 日付・曜日・月ラベルとも `line-height: normal`・`letter-spacing: normal`(実測) | body-large の **24 / 0.5**(site `Date label text` / `Weekdays label text`)、月ラベルは 20 / 0.1 | 低 |
| DP4a | **Ripple / FocusRing を使っていない** | 日付・ナビボタンは素の `<button>` + `:hover` の背景色のみ。pressed / focus の state layer がなく、フォーカスは `outline: 2px solid secondary`(オフセットなし)の独自実装 | 共有 `Ripple` + `FocusRing`。hover **0.08** / focus **0.10** / pressed **0.10**(site `Date * state layer opacity`、Compose は selectable Surface の ripple) | 中 |
| DP4b | **state layer の色が状態で変わらない** | unselected の hover が on-surface、selected は hover なし(`:not([data-selected])`)、today も on-surface | unselected = **on-surface-variant**、selected = **on-primary**、today = **primary**、範囲内 = **on-primary-container**(site の Hovered / Focused / Pressed セット。unselected 色は下記裁定) | 低 |
| DP5 | **グリッドのキーボード操作がない** | 全日付が個別の Tab ストップ(1か月で 33 個を実測)、矢印キー・PageUp/PageDown 等は無反応(一時テストで確認) | **単一 Tab ストップ + roving tabindex**(選択日 → 今日 → 1日の順で初期フォーカス)。←→↑↓ で日/週移動(月をまたぐとページ送り)、**PageUp/PageDown** で前後の月の同日、**Shift+PageUp/PageDown** で前後の年、**Home/End** で月の初日/末日(site 表 — 下記裁定)、Enter/Space で選択(site a11y キー表、APG date picker dialog、Compose `dayOnKeyEvent` の矢印+端でのページ送り) | 高(a11y) |
| DP6 | **日付のアクセシブルネームと grid セマンティクス** | ボタン名が「15」だけ、選択を `aria-pressed` で表現、曜日ヘッダーは `aria-hidden`、グリッドは role なしの `<div aria-label>`(generic への aria-label は無効) | site a11y「Month grid = **Grid**、Days of the week = **Column header**」「SR は日付を完全に読む(Monday, August 17)」。Compose は「[Start date/End date/In range][, Today], Saturday, March 27, 2021」+ selected。→ `role="grid"` + 行/`columnheader`(略記は `abbr`/完全名)+ `gridcell` に `aria-selected`、今日は `aria-current="date"`、日付ボタン名は完全な日付(範囲の端点・範囲内も付加)。headline は polite live region(Compose `liveRegion = Polite`「Current selection: …」) | 高(a11y) |
| DP7a | **docked ポップアップのフォーカス管理** | 開いてもフォーカスは移らない、Escape で閉じると、フォーカスが非表示になった「Next month」に残る(一時テストで確認)— トグルに戻らない、Tab で外に出ても開いたまま | 開いたら選択日(なければ今日)へフォーカス、Escape / 選択で閉じたらトグル(または input)へ復帰、フォーカスが外へ出たら閉じる(APG date picker dialog、site「Unless … dismissed, the picker will continue to retain focus」) | 中(a11y) |
| DP7b | **トグルとポップアップの ARIA** | トグルは `aria-expanded` のみ(`aria-haspopup` / `aria-controls` なし)、ポップアップに role も名前もない。閉じている間も 33 個のボタンが `display: none` で DOM に常駐 | トグル: `aria-haspopup="dialog"` + `aria-controls`、ポップアップ: `role="dialog"` + `aria-label`(例「Choose date」)。閉じている間は描画しない | 中(a11y) |
| DP7c | **トグルのタッチターゲットが 24×24** | `.toggle` 24px、`::before` の拡張なし(実測 24×24) | **48×48**(site a11y「Touch targets are 48x48dp」)。`IconButton`(standard)を trailing slot に入れる形が自然(TextField 監査の「インタラクティブな trailing icon」と同じ整理) | 中(a11y) |
| DP8 | **docked の見た目が modal のまま** | ドロップダウン内で modal の `DatePicker` をそのまま表示: 角 28、headline 付きヘッダー、月ラベル + 矢印のナビ行(高さ 469 を実測) | site `Date picker - Docked`: 角 **16dp**(large)、headline ヘッダーなし、高さ **64** のヘッダーに**月・年のメニューボタン**(高さ 40・円形・title-small・on-surface-variant・アイコン 18)+ 前後ボタン、日付コンテナ 48、**前後の月の日付を on-surface 38% で表示**、全体 360×456。Compose に docked はない=矛盾なし | 中 |
| DP9 | **年の選択がない** | 月の前後送りのみ(年単位の移動手段がない — 生年月日などで数百クリック) | site guidelines「年をタップすると年ピッカー」「docked の年選択メニューがカレンダーを置き換える」、site トークン: 年セル **72×36**・円形・selected primary / on-primary・unselected ラベル **on-surface-variant**・body-large。Compose `YearPicker`: 3列・縦間隔 16・高さ 335・今年は 1dp primary 輪郭・「Navigate to year %s」・開いたら表示中の年にフォーカス。月ラベルは ▼ 付きのメニューボタン(開くと 180° 回転)にする | 中 |
| DP10 | **入力モード(modal date input)がない** | カレンダーのみ | site a11y「modal date picker では **edit アイコン**で date input に切り替えられるべき」、Compose `DisplayMode.Picker/Input` の切り替えボタン(「Switch to text input mode」/「Switch to calendar input mode」、headline の右)、Input は outlined text field(ラベル「Date」、placeholder = ロケールのパターン例 MM/DD/YYYY)+ エラー文言 | 中 |
| DP11 | **DatePickerField の手入力解析** | キー入力のたびに `new Date(text)` で解析して即 `onChange`。「2」と打った瞬間に **2001-02-01** がコミットされる(一時テストで確認)。解析はロケール非対応(表示は `locale` で整形するのに、解析は V8 の US 解釈 → `en-GB` では日と月が入れ替わる)。min/max を検証しない、エラー表示なし、書式のヒントなし | site a11y「Enter かフォーカスアウトで整形・確定」「入力マスクは使わない」「ダッシュ・スペース・スラッシュ・ドットや先頭 0 を受け付ける」「helper text で書式(既定 MM/DD/YYYY)を示し、description として関連付ける」。Compose は書式不一致・範囲外・選択不可の各エラー文言を出す。→ blur/Enter でロケールのパターンに沿って解析、min/max 外・不正は `error` + supporting text | 中 |
| DP12 | **グリッドが常に6行ではない / ナビ行の高さ** | 月により 5〜6 行(June 2026 は 5 行で全高 509 を実測)→ 月送りでコンテナの高さが跳ねる。ナビ行 48 | Compose: グリッドは常に **6 行 × 48 = 288**、ナビ行 **56**(`requiredHeight(56)`)。site の modal コンテナ高 524 も固定高を示す | 低 |
| DP13 | **週の始まりが常に日曜** | `new Date(2023, 0, 1 + i)` 固定 | ロケールの週の開始曜日(Compose `firstDayOfWeek` はロケール由来)。`Intl.Locale#getWeekInfo`(未対応環境は日曜にフォールバック) | 低 |
| DP14 | **確定/キャンセル(ダイアログ)の構成手段がない** | JSDoc は「`Dialog` で包め」とだけ書き、OK/Cancel も、Enter で確定して閉じる動線もない | site の3バリアント全ての anatomy に **text buttons**、guidelines「OK で確定 / Cancel で破棄、外側で破棄」、a11y キー表「Enter: カレンダーを閉じて選択日を保存」。Compose `DatePickerDialog(confirmButton, dismissButton)`(ボタン行: 下 8 / 右 6、間隔 8、label-large primary)。→ API 形状(`actions` スロットか `DatePickerDialog` 相当か)は Phase A 流の決定が要る | 中 |

Issue: DP1 → #151、DP2a/DP2b/DP3 → #152(ヘッダーとセルのタイポ/色の CSS)、DP4a/DP4b → #153(セルとナビボタンに Ripple/FocusRing を載せる同じ箇所)、
DP5/DP6 → #154(グリッドのマークアップとキーハンドラを書き直すため同梱)、DP7a–c → #155(DatePickerField のトグルとポップアップ)、DP8 → #156、
DP9 → #157、DP10 → #158、DP11 → #159、DP12/DP13 → #160(セル配列の生成を同じ箇所で書き換える)、DP14 → #161

**軽微(判断・記録のみ)**:

- **headline の日付書式**: 実装は「Fri, Jul 4」(weekday short + month short + day)、Compose は `yMMMd`(「Jul 4, 2024」)。
  site の図版は曜日付き。どちらも許容範囲で、年が見えない点だけが気になる(DP9 の年ピッカーで年が明示されれば解消)
- **未選択時の headline / タイトル文言**: 実装は headline・タイトルとも「Select date」(重複)、range は「Select range」。
  Compose は headline「Selected date」/ 範囲タイトル「Select dates」、範囲 headline は「Start date – End date」のプレースホルダ。
  文言の揃えは DP2 の修正時に一緒に
- **range の区切り**: 実装 en dash「–」、Compose はハイフン「-」。en dash が表記として正しいので維持
- **range のレイアウト**: site guidelines・Compose とも range は**縦スクロールの月リスト**(月ごとに title-small の subhead、
  ナビ行なし、ヘッダー高 128)。実装は単月ページング。Web で縦スクロールのリストにするかは大きな設計判断で、
  現状も機能的には成立しているので記録のみ(実装するなら site `Range selection month subhead` = title-small on-surface-variant)
- **full-screen の range(X と Save)**: site guidelines の compact 向け。Compose も未実装なので対象外
- **ナビボタンの境界**: min/max の外の月にも移動できる(全日 disabled の月が出る)。Compose は `yearRange`(既定 1900–2100)の
  外に出られない。DP9 の年ピッカーを入れるときに、min/max で prev/next と年を disabled にするのが自然
- **controlled `value` の外部変更で表示月が追従しない**(`view` は初回だけ `value` から決まる)。Compose も `displayedMonth` は
  別 state だが、`DatePickerState.selectedDateMillis` の設定で表示月も動く。利用側から見ると驚きがあるので、修正時に検討
- **disabled な今日**: 実装は primary のラベルが残る(`[data-today]` の詳細度が `:disabled` に勝つ)。Compose は disabled 色
  (on-surface 38%)+ 輪郭は残す。見た目の差は小さい
- **ツールチップ**: site a11y は前後ボタンに「ショートカットを含むツールチップ」、曜日にホバーのツールチップ(完全名)を推奨。
  Compose も prev/next に plain tooltip。Tooltip コンポーネントで対応可能だが推奨レベル
- **Shift+M / Shift+Y**(月・年ドロップダウンへ移動): site のキー表にあるが、DP8/DP9 のメニューボタンが入ってからの話
- **モーション**: 月送り・範囲の色変化にアニメーションがない。Compose は月ページのスクロールアニメーション、色は
  DefaultEffects spring、Picker↔Input は縦スライド + フェード、年ピッカーは展開/縮小。いずれも装飾レベルなので、
  入れる場合は `prefers-reduced-motion` で無効化する前提で DP9/DP10 と一緒に
- **docked ドロップダウンの影**: 実装は modal と同じ `shadow-level3`、site docked も 6dp なので一致(記録のみ)
- テスト追加候補: min/max(cross-cutting で指摘済み)、キーボード操作(DP5)、ポップアップを開いた状態の axe(既存 axe は閉じた状態のみ)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| コンテナの elevation | 6dp(Docked / Modal / Modal input とも) | トークン `ContainerElevation` = Level3 だが、`DatePickerDefaults.TonalElevation` = **Level0**・影なし(色は surface-container-high で代替) | site 優先 → **`shadow-level3` を維持**(現実装のまま) |
| unselected 日付の state layer 色 | on-surface-variant(#49454F) | selectable Surface の ripple = `contentColorFor(Transparent)` → LocalContentColor(on-surface と推定) | site 優先 → **on-surface-variant**(DP4b) |
| docked バリアント | トークン表あり(16dp・456 高・メニューボタン・前後月の日付 38%) | 実装もトークンもない | 矛盾なし → **site どおり**(DP8) |
| 月/年ボタンの色 | docked `Menu button label text color` = on-surface-variant | トークンなし、`navigationContentColor = onSurfaceVariant` を TODO(b/234060211)付きでハードコード | 一致 → on-surface-variant(現実装のまま) |
| 範囲の帯の形 | `Range selection active indicator` 高さ 40・shape Circular | 未使用。`drawRect` の長方形(行高 40、端点セルの中心から) | 見た目は同等(端は選択円がキャップ)→ **長方形 + 端点の円**(現構造のまま、DP1 で表示だけ直す) |
| Home / End | 「Home/End: Move to the first day of the month」(両方とも初日と書かれている) | キー処理なし | site 優先。End も初日なのは誤記と判断 → **Home = 月の初日、End = 月の末日**(APG の「週の初日/末日」ではなく site に従う)(DP5) |
| 手入力の書式 | 入力マスクを使わない、Enter/フォーカスアウトで整形 | 数字のみ受け付けて区切り文字を自動挿入(マスク) | site 優先 → **マスクなし・確定時に解析/整形**(DP11) |
| Container surface tint | `Container surface tint layer color`(Docked / Modal input は warning 付き) | tint なし(surface-container-high) | warning = 非推奨の旧行 → **tint なし**(現実装のまま) |
| 日付コンテナの寸法(docked) | Docked: date container 48(state layer 40)/ Modal: 40 | 40 のセル + 48 のタッチターゲット | 実質同じ(48 のセル内に 40 の円)→ 現構造のまま |

## 詳細対照表

### 寸法(site トークン / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| modal コンテナ幅 | 360 | min 360(dialog は requiredWidth 360) | 360 ✓ |
| modal コンテナ高 | 524 | 可変(max 568) | 509(5 行月)— **行数で変動 ✗(DP12)** |
| modal シェイプ | 28 | 28(CornerExtraLarge) | 28 ✓ |
| docked シェイプ / 高さ | 16 / 456 | — | **28 / 469 ✗(DP8)** |
| ヘッダー高 | 120(range 128) | min 120 | 125(1行)/ **165(range で折り返し ✗ DP2b)** |
| ヘッダーのパディング | (図のみ) | title 上 16・左 24 / headline 下 12・左 24 | 16 / 24 / 12 ✓ |
| ナビ行の高さ | —(docked ヘッダー 64) | 56 | **48 ✗(DP12)** |
| 前後ボタン | 48 タッチ | IconButton(40 + 48 タッチ) | 40(タッチターゲット拡張なし — DP4a の IconButton 化で解消) |
| 曜日行 | — | min 48 | 48 ✓ |
| 日付セル | 40×40(docked はコンテナ 48・state layer 40) | 40 の円 + 48 タッチ | 40 + margin 4 = 48 ✓ |
| グリッド | — | 6 行固定 = 288 | **5〜6 行 ✗(DP12)** |
| 年セル | 72×36 | 72×36・3列・縦 16 | **なし ✗(DP9)** |
| docked トグル | 48 タッチ | — | **24×24 ✗(DP7c)** |
| 範囲の帯 | 高さ 40 | 行高 40 | 40 ✓(ただし非表示 — DP1) |

### カラー(light)

| 要素 | site | Compose(Defaults) | 実装 |
|---|---|---|---|
| コンテナ | surface-container-high | surface-container-high | ✓ |
| supporting(タイトル) | on-surface-variant | on-surface-variant | ✓ |
| headline | on-surface-variant | on-surface-variant | **on-surface ✗(DP2a)** |
| divider | outline-variant | outline-variant | ✓ |
| 月ラベル・前後ボタン | on-surface-variant | on-surface-variant(ハードコード) | ✓ |
| 曜日 | on-surface | on-surface | ✓ |
| 日付 unselected | on-surface | on-surface | ✓ |
| 日付 selected | primary / on-primary | 同 | ✓ |
| 今日 | primary ラベル + primary 1dp 輪郭 | 同(選択時は輪郭なし) | ✓ |
| 範囲の帯 / 範囲内ラベル | secondary-container / on-secondary-container | 同 | ラベル ✓ / **帯が見えない ✗(DP1)** |
| disabled | —(docked の前後月日付 on-surface 38%) | 各色 × 0.38 | on-surface 38% ✓ |
| 年 unselected / selected | on-surface-variant / primary・on-primary | 同 | **なし(DP9)** |
| state layer(hover/focus/pressed) | unselected on-surface-variant・selected on-primary・today primary・範囲内 on-primary-container、0.08/0.10/0.10 | ripple(contentColor) 0.08/0.10/0.10 | **hover のみ on-surface 0.08・selected/today/範囲内は区別なし ✗(DP4)** |

### タイポグラフィ

| 要素 | site | Compose | 実装 |
|---|---|---|---|
| supporting | label-large | LabelLarge | ✓ |
| headline(単一) | headline-large 32/40 | HeadlineLarge | ✓ |
| headline(range) | title-large 22/28 | TitleLarge・1行 | **headline-large・折り返し ✗(DP2b)** |
| 月ラベル | title-small(docked menu button) | LabelLarge(TextButton) | 14/500 だが **line-height normal ✗(DP3)** |
| 曜日・日付・年 | body-large 16/24/0.5 | BodyLarge | 16px だが **line-height・tracking normal ✗(DP3)** |

### 挙動・a11y

| 要件 | 出典 | 実装 |
|---|---|---|
| 日付グリッドは単一 Tab ストップ + 矢印キー | APG / site キー表 / Compose | **✗ 33 Tab ストップ(DP5)** |
| PageUp/Down(月)、Shift+PageUp/Down(年)、Home/End | site キー表 / APG | **✗(DP5)** |
| Enter で選択・確定して閉じる | site / APG | クリック相当で選択 ✓、確定動線なし(DP14) |
| Escape で閉じてフォーカス復帰 | APG | 閉じる ✓ / **復帰 ✗(DP7a)** |
| 開いたらダイアログ内へフォーカス | APG | **✗(DP7a)** |
| 月グリッド = grid、曜日 = column header | site a11y ラベル表 | **✗(DP6)** |
| 日付の完全な読み上げ(曜日・月・日・年) | site / Compose | **✗ 数字のみ(DP6)** |
| 選択状態 | Compose selected / APG `aria-selected` | `aria-pressed`(**DP6**) |
| 今日 | Compose「Today」/ `aria-current="date"` | 視覚のみ(**DP6**) |
| 前後ボタンのラベル | site「{label}」Button / Compose「Change to previous month」 | 「Previous month」/「Next month」✓ |
| docked トグル | ボタン + ポップアップ関連付け | `aria-expanded` のみ(**DP7b**) |
| テキスト入力が独立した Tab ストップ | site a11y | ✓(input とトグルは別) |
| 書式の helper text、確定時の整形 | site a11y | **✗(DP11)** |
| 48dp タッチターゲット | site a11y | 日付 ✓ / トグル **✗(DP7c)** |
| 年の選択 / 入力モード | site / Compose | **✗(DP9 / DP10)** |
| `prefers-reduced-motion` | — | アニメーション自体がない(該当なし) |

## 手順メモ(今回わかったこと)

- date pickers の specs ページは寸法図が画像のみで、数値はトークン表(`visibility` ビュー)からしか取れない。
  Docked セットにしかない値(16dp・456 高・メニューボタン・前後月 38%)があるので、セットは必ず全部回す
- Compose に対応物がないバリアント(docked)は「site 単独 + 矛盾なし」で CONFIRMED にできる
- `z-index: -1` の疑似要素は、祖先にスタッキングコンテキストがないと親の背景の下に消える。computed style では
  正しく見えるので、帯・インジケーター類は**スクリーンショットで目視**すること
- テストの `console.log` はこのリポジトリの vitest 設定で出力されない。一時テストでは `process.stderr.write` を使う
