# TimePicker 監査レポート(2026-09-30)

Phase B Tier 2。3ソースを突き合わせた:

1. **m3.material.io/components/time-pickers/specs** + **/accessibility** + **/guidelines** — Playwright MCP で
   トークンテーブル2セット(Time picker - Dial / Time picker - Input)を全展開して取得(シェイプ・elevation は `visibility`
   ビューで数値化)、寸法表(vertical / horizontal / input)、a11y ページのキー表・ラベル表、guidelines の挙動を抽出
2. **Compose androidx-main**(`VERSION: v0_210` のトークン)— `TimePicker.kt`(`TimePicker` / `TimeInput` / `TimePickerDefaults` /
   `TimeInputDefaults` / `ClockFace` / `ClockText` / `TimeSelector` / `PeriodToggle` / `TimeInputTransformation`)、
   `TimePickerDialog.kt`(`TimePickerDialog` / `TimePickerDialogDefaults`)、`tokens/TimePickerTokens.kt`・`TimeInputTokens.kt`、
   `ComposeMaterial3Flags`・`StateTokens`・`DialogTokens`・`MotionScheme`・`ToggleButton.kt`・`res/values/strings.xml`
3. **実装** — `src/components/TimePicker/`(`TimePicker.tsx` / `TimePicker.module.css`)、テスト(9件、全通過)・ストーリー
   (Default のみ)。寸法・色は Storybook で `getComputedStyle` / `getBoundingClientRect` を実測(dial / input 両モード、
   スクリーンショット確認)、入力・キーボード・ARIA・axe は一時テスト(コミットしていない)で確認

前提: 公開 API は `TimePicker` 1つ(`value` / `defaultValue` / `onChange(value)` / `mode: 'dial' | 'input'`)。
値ファーストの `onChange` は Phase A 裁定 **A8** で確定済みのため対象外。Compose は `TimePicker`(dial)と `TimeInput` を
別コンポーネントにし、見出し・Cancel/OK・モード切替は `TimePickerDialog` 側が持つ。本ライブラリは1コンポーネント +
`mode` なので、その差は API 方針どおりで指摘しない(ダイアログ部分の欠落だけを TP8 で扱う)。
Compose の `Vibrant*` / `TimeScroll`(Expressive の opt-in)は範囲外とし、標準パスだけと照合した。

## 結論サマリ

**一致している(修正不要)**:

- **コンテナ**: 色 surface-container-high、シェイプ extra-large(28)、影 `shadow-level3`(6dp — 下記裁定)、パディング 24
- **時刻セレクタ(hour / minute の箱、dial モード)**: 96×80、シェイプ small(8)、display-large(57/64)、
  selected = primary-container / on-primary-container、unselected = surface-container-highest / on-surface、
  値は2桁ゼロ埋め、12h 表示は 0 → 12
- **区切り「:」**: display-large・on-surface
- **AM/PM(period selector, vertical)**: 高さ 80、1dp の outline 枠 + 項目間 1dp の区切り線、シェイプ small(8)、
  selected = tertiary-container / on-tertiary-container、unselected ラベル on-surface-variant・背景透明、title-medium(16/500)
  (いずれも site / Compose トークン / Compose の legacy パス — 下記裁定)。AM↔PM で hour ±12
- **時刻表示と dial の間隔**: 36(Compose `ClockDisplayBottomMargin`)
- **クロック dial**: 256 の円、surface-container-highest、ラベル 12 個(時は 12 を頂点に時計回り、分は 00〜55 の 5 分刻み)、
  body-large 16px、unselected on-surface、selected on-primary、トラック 2dp primary、中心点 8dp primary
- **入力モードの色**: 未フォーカス surface-container-highest / on-surface、フォーカス primary-container / on-primary-container +
  **primary の 2dp 枠**(site トークン — 下記裁定)
- **入力モードの a11y 名**: 「Hour」「Minute」の text input(site a11y ラベル表と一致)、`inputMode="numeric"`
- **モード切替**: dial ではキーボードアイコン、入力ではスケジュール(時計)アイコン(site guidelines / Compose `DisplayModeToggle`)、
  on-surface-variant
- **挙動**: controlled/uncontrolled、`prefers-reduced-motion` でハンドの transition を無効化、既定値 12:00 AM
  (Compose の `initialHour = 0` と同じ時刻)、axe は dial / input 両モードで違反 0

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| TP1 | **入力モードのキー入力が壊れている** | キー入力ごとに `Number(value)` を 1–12 / 0–59 にクランプして即 `onChange`。「10」の末尾で「3」を打つと「103」→ 12 に丸められ **12 AM(hour 0)がコミット**される。全選択で消すと「01」に戻る(空にできない)。「75」は黙って 59、エラー表示なし、`maxLength` なし、hour 入力後に minute へ進まない(一時テストで確認) | Compose `TimeInputTransformation`: 数字以外は無視、2桁の状態で3桁目を打つとカーソル位置に応じて**置き換え**、空は 0(12h PM では 12)として扱う、範囲外(13 や 60)は**文字としては受け付けて**エラー状態にする(文字色・枠 error、container error-container、supporting text を「Hour must be 1–12」/「Hour must be 0–23」/「Minute must be 0–59」に差し替えて polite live region)、hour が2桁になるか 12h で 2–9 を打った時点で minute フィールドへ自動で進む(支援技術使用時は除く)、Enter/Next でも進む、`maxTextLength = 2` | 高(a11y) |
| TP2 | **入力モードの寸法・タイポ・supporting text** | フィールド 96×**80**・**display-large**(57/64)、未選択フィールドにも 1px の outline 枠、AM/PM 52×**80**、フィールド下の「Hour」「Minute」ラベルなし(実測) | フィールド **96×72・display-medium(45/52/0)**(site `Time input field container` / `label text`、Compose `TimeInputTokens`)、AM/PM **52×72**、**未選択フィールドは枠なし**(site に unfocused outline トークンなし、Compose も非選択フィールドは枠なしの `TimeSelector` Surface で描く)、フィールド下 **7dp** に「Hour」/「Minute」の supporting text(**body-small・on-surface-variant**、site guidelines「label below the field」、Compose `SupportingText`) | 中 |
| TP3 | **行高・字間トークンが抜けている / 区切りと AM/PM の幅** | 時刻セレクタ・区切りは `letter-spacing: normal`、AM/PM ラベルと dial ラベルは `line-height: normal`・`letter-spacing: normal`(実測)。区切りの占有幅は gap 8 + 13.8 + gap 8 = 29.8、AM/PM 枠は content-box で外寸 **54** 幅 | 時刻セレクタ・区切り −0.25、AM/PM **24 / 0.15**、dial ラベル **24 / 0.5**(site 各 `label text` トークン)。区切りのボックス幅 **24**(Compose `DisplaySeparatorWidth`)、AM/PM は外寸 **52**(site / Compose `PeriodSelectorVerticalContainerWidth`) | 低 |
| TP4 | **dial ラベルのターゲット・名前・選択状態・キーボード** | 数字は **40×40** のボタン(48 に拡張なし)、選択ハンドルも 40 の円、ラベル半径 100。名前は「3」「15」だけ、選択は `data-selected` のみで支援技術に出ない。dial の 12 個がすべて Tab ストップ(Tab 20 回の順序を一時テストで確認)、矢印キーは無反応 | ターゲット **48×48**(site a11y「Dial selector targets should be 48x48dp」、Compose `MinimumInteractiveSize`)、選択ハンドル **48** の primary 円(site / Compose `ClockDialSelectorHandleContainerSize`)、ラベル半径 **101**(Compose `OuterCircleToSizeRatio`)。名前に単位を含める(Compose「%d o'clock」/「%d minutes」/ 24h は「%d hours」— site は「Hour 7 of 12」の形 — 下記裁定)、選択状態を公開(Compose `selected`)。キーボードは Compose `ClockText`: dial は**選択中の値に1つだけフォーカスが入り**、←↑ / →↓ でリング内を循環、Tab で dial を抜けて次の要素へ(Shift+Tab で hour/minute セレクタへ)、Enter/Space で選択 | 高(a11y) |
| TP5 | **dial の操作: 端数の分・ドラッグ・時→分の自動切替** | ハンドルは `Math.round(minute / 5)` の位置に描かれ、7 分でも「05」が選択表示になる(一時テストで確認)。ドラッグ不可(クリックのみ)。時をクリックしても時のまま(自動で分に切り替わらない — 一時テストで確認) | ハンドルは実際の角度に描く(Compose `selectorPos` は現在角度から算出し、ラベルの `selected` は「ハンドルがそのラベルの矩形内にあるか」)。**セレクタトラックのドラッグ**で選択(site guidelines「tapping a number or dragging the dial selector track」、Compose: ドラッグ中は1分単位、離すとスナップ)。ポインタで時を選んだら 100ms 後に**分へ自動切替**(Compose `onTap` / drag end。キーボード操作・支援技術使用時は切り替えない) | 中 |
| TP6 | **hour/minute セレクタと AM/PM のセマンティクス** | hour/minute は名前「Hour」/「Minute」の素の `<button>`(どちらが選択中か出ない)。AM/PM は `role="group" aria-label="AM or PM"` の中の素の `<button>` で選択状態なし、矢印キー非対応(一時テストで属性を確認) | hour/minute: Compose `TimeSelector` = `Role.RadioButton` + selected、名前「Select hour」/「Select minutes」+ 値(「10 o'clock」)。AM/PM: site a11y ラベル表「AM or PM — **Radio button (in list)**」、Compose `selectableGroup` +「Select AM or PM」+ 各項目 selected → `role="radiogroup"` + `role="radio"` / `aria-checked`、矢印キーで移動(APG radio group) | 中(a11y) |
| TP7 | **Ripple / FocusRing / state layer を使っていない** | 時刻セレクタ・AM/PM・dial ラベルに hover/pressed の state layer なし。フォーカスは `outline: 2px solid primary/secondary` の独自実装。モード切替は 48 の円に hover 0.08 だけ(pressed・focus なし) | 共有 `Ripple` + `FocusRing`。hover **0.08** / focus **0.10** / pressed **0.10**。色: 時刻セレクタ selected **on-primary-container**・unselected **on-surface**、AM/PM selected **on-tertiary-container**・unselected **on-surface-variant**、入力フィールド hover **on-surface**(site Hovered / Focused / Pressed セット、Compose は各 Surface の ripple = StateTokens)。dial ラベルは半径 24 の ripple(Compose)。モード切替は `IconButton`(standard)に置き換える | 中 |
| TP8 | **見出しと Cancel/OK(ダイアログ)の構成手段がない** | 見出しなし。OK/Cancel もなく、モード切替は単独の行にある | site anatomy の **Headline**(「Select time」/ 入力は「Enter time」、**label-medium 12/16/500・on-surface-variant**)と **Text buttons**(Cancel / OK)、guidelines「OK で確定、Cancel・外側クリックで破棄、それまではフォーカスを保持」、a11y ラベル表の Cancel / OK ボタン。Compose `TimePickerDialog(title, confirmButton, dismissButton, modeToggleButton)`: タイトル上 24、アクション行は「モード切替・スペーサー・Cancel・OK」の順で間隔 8、下 24。DatePicker の DP14(#161)と同じ API 判断(`actions` スロットか `TimePickerDialog` 相当か)が先に要る | 中 |
| TP9 | **24 時間制がない** | `is24Hour` 相当の prop もロケール判定もなく、AM/PM が常に表示され、dial は 12 時間 | site: 24h dial(内外2リング)、**AM/PM を出さない**、時刻セレクタ幅 **114**(`Time selector 24h vertical container width`)。Compose: `is24Hour` の既定はシステム設定(`is24HourFormat`)、24h の時の dial は外リング **0–11**(半径 101)・内リング **12–23**(半径 **69**)、中心から 74dp 未満のタップ/ドラッグは内リング、キーボードは外リング末尾 → 内リング先頭へ循環、名前は「%d hours」、入力の上限 0–23。Web ではロケールの `hourCycle`(`Intl.DateTimeFormat().resolvedOptions()`)を既定にし、prop で上書き(MUI の `ampm` 相当 — prop 名は要決定) | 中 |

Issue: TP1 → #163、TP2/TP3 → #164(入力/表示部の寸法とタイポの CSS を同じ箇所で書き換える)、TP4/TP5 → #165(dial のマークアップ・
ハンドル描画・ポインタ/キーハンドラを書き直すため同梱)、TP6 → #166、TP7 → #167、TP8 → #168(#161 と同じ API 判断)、TP9 → #169

**軽微(判断・記録のみ)**:

- **ハンドルの動き**: 実装は CSS `transition: transform short4 standard`(回転の最短経路を取らないので 11→12→1 で逆回りに一周しうる)。
  Compose は角度を `DefaultSpatial` spring(standard スキームで damping 0.9 / stiffness 700)で最短経路に回転、時↔分の切替時も
  回転、キーボード選択は snap、文字盤の入れ替えは `DefaultEffects` の Crossfade。TP5 の修正時に最短経路の補間と一緒に直すのが自然
- **トラックの終点**: Compose は中心からハンドルの縁まで線を引き、ハンドル下のラベルは on-primary で抜く。実装は数字の中心まで線を引き、
  選択ボタンの背景で隠している。見た目は同等(TP4 でハンドルを 48 にすれば差はさらに小さい)
- **横向き(landscape)レイアウト**: site guidelines は画面の向き・高さに応じて horizontal(AM/PM は 216×38 を下に)へ切り替えるとし、
  Compose も `TimePickerLayoutType`(高さ < 幅で Horizontal、dial は利用可能な高さで 256 / 238 / 200)を持つ。Web では
  prop(`orientation`)かコンテナクエリかの判断が要るので記録のみ
- **モード切替の名前**: 実装「Switch to keyboard input」/「Switch to dial」、site「Toggle input picker」/「Toggle dial picker」、
  Compose「Switch to text input mode」/「Switch to clock mode」+ tooltip。どれも意味は通じる。TP7 で `IconButton` 化するときに
  site の文言に寄せる(Compose の tooltip も付けるなら Tooltip コンポーネントで)
- **`mode` が初期値のみ**: 表示モードの controlled 版(`onModeChange`)がない。TP8 のダイアログ構成を決めるときに一緒に
- **フォーカス中フィールドのキャレット色**: 実装は on-primary-container(`color` 継承)、Compose は primary。差は小さい
- **入力モードで選択中だがフォーカスが外れたフィールド**: Compose は surface-container-highest + outline 1dp で描く(下記裁定)。
  実装は選択の概念がなくフォーカスだけで判定。TP1 / TP2 の修正で「選択中フィールド」を持たせるなら合わせる
- テスト・ストーリー追加候補: 入力モードのストーリー(cross-cutting で指摘済み)、24h、キーボード操作(TP4/TP6)、入力の境界値(TP1)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| コンテナの elevation | 6dp(Dial / Input とも) | トークン `ContainerElevation` = Level3 だが、`TimePicker` 自体は面を描かず、`TimePickerDialog` は `tonalElevation = Level3` のみ(影なし) | site 優先 → **`shadow-level3` を維持**(DatePicker と同じ裁定、現実装のまま) |
| AM/PM の配色・形 | tertiary-container / on-tertiary-container、outline 1dp 枠、シェイプ 8(warning なし) | トークンは同じだが、`ComposeMaterial3Flags.isUpdatedTimepickerToggleEnabled = true`(既定、TODO b/521427342)で primary-container / on-primary-container・未選択 surface-container-lowest・枠なし・pill→12dp の ToggleButton 2個(間隔 4、選択ラベル太字)に差し替え | site 優先 → **tertiary + outline 枠を維持**(現実装のまま)。Compose の新トグルは flag 付きの移行中デザインとして記録。site が更新されたら再監査 |
| 時刻表示と AM/PM の間隔 | (図のみ) | flag on で 4、legacy 12 | 上の裁定(legacy 配色)に合わせて **12**(現実装のまま) |
| 入力フィールドのフォーカス枠の色 | primary 2dp(`Time input field focus outline color`) | トークン `TimeFieldFocusOutlineColor` = Primary だが、`TimeInputDefaults.colors()` は `focusedBorderColor = Outline`(TODO なし) | site 優先 → **primary**(現実装のまま) |
| 未選択の入力フィールドの枠 | トークンなし(枠なし) | 非選択フィールドは枠なしの Surface。選択中でフォーカスが外れたフィールドだけ outline 1dp | 一致 → **非選択は枠なし**(TP2)。「選択中・非フォーカス」の 1dp は Compose に従ってよい(軽微) |
| 見出しの色 | on-surface-variant(`Time picker headline color`) | トークンは OnSurfaceVariant、`TimePickerDialogDefaults.Title` は色指定なし → Surface の content color(on-surface)を継承 | site 優先 → **on-surface-variant**(TP8) |
| 入力モードの区切り「:」のフォント | display-large(`Time input field separator`) | トークンは DisplayLarge、実装はフィールドの DisplayMedium を継承 | site 優先 → **display-large**(現実装のまま) |
| display-large / title-medium の字間 | −0.25 / 0.15 | `TypeScaleTokens` は −0.2 / 0.2 | site 優先 → **−0.25 / 0.15**(`tokens.css` の値のまま、TP3 で参照するだけ) |
| 24h の時刻セレクタ幅 | 114(`Time selector 24h vertical container width`) | トークンは 114 だが TimePicker.kt で未使用(96 のまま) | site 優先 → **114**(TP9) |
| 24h dial のリング配置 | guidelines 本文「even numbers appear in an inner ring, and odd numbers in an outer ring」 | 外リング 0–11、内リング 12–23 | 本文は Compose・Android 実機・一般的な 24h 文字盤のいずれとも合わず、偶奇で分けると同じ角度に2つの時が来ない(12 位置に 12 個しか置けない)ため誤記と判断 → **Compose(外 0–11 / 内 12–23)**。site の図版は画像のみで未確認 |
| dial ラベルの読み上げ | 「{Value} Hours or minutes of {Total}」(例「Hour 7 of 12」)、role Button | 名前「7 o'clock」/「30 minutes」/「7 hours」、role なし + selected | 名前は単位を含める点で一致。site 優先で **role は button、名前は site の形式(例「7 o'clock」に位置「of 12」を加えるか、`aria-setsize`/`aria-posinset` で補う)は修正時に決める**。選択状態の公開は両者の趣旨どおり必須(TP4) |
| AM/PM の role | Radio button (in list) | flag on: ToggleButton(Role.Checkbox)+ selected / legacy: TextButton + selected | site 優先 → **radiogroup + radio**(TP6) |
| dial のキーボード | キー表は Tab(time slot へ)と Space/Enter のみ | 矢印でリング内循環、Tab で抜ける、単一のフォーカス入口 | 矛盾なし(site は矢印に触れない)→ **Compose の方式**(TP4) |
| 時刻セレクタ・フィールドの hover/focus/pressed ラベル色 | 各状態で rest と同色 | 同(トークンのみ、コードは rest 色を使う) | 一致 → state layer だけ足す(TP7) |
| Container surface tint | `surface tint layer color`(warning 付き) | tint なし | warning = 非推奨の旧行 → **tint なし**(現実装のまま) |
| clock dial color の `ignore` 行 | on-surface-variant の `ignore` 行(warning 付き)と surface-container-highest の正規行 | SurfaceContainerHighest | warning 行を無視 → **surface-container-highest**(現実装のまま) |

## 詳細対照表

### 寸法(site トークン / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| コンテナのパディング | 24 | ダイアログ 24(`contentPadding`) | 24 ✓ |
| コンテナのシェイプ | 28 | 28(`DialogTokens.ContainerShape`) | 28 ✓ |
| 時刻セレクタ | 96×80(24h 縦は 114 幅) | 96×80(114 は未使用) | 96×80 ✓ / 24h なし(TP9) |
| 区切りの幅 | (図のみ) | 24(`DisplaySeparatorWidth`) | **29.8(gap 8 + 13.8 + 8)✗(TP3)** |
| AM/PM(dial, vertical) | 52×80 | 52×80 | **54**×80(content-box + 枠)✗(TP3) |
| AM/PM(horizontal) | 216×38 | 216×38、上 16 | なし(軽微: landscape) |
| 時刻表示 → dial | (図のみ) | 36 | 36 ✓ |
| dial | 256 | 256(horizontal は 256/238/200) | 256 ✓ |
| ラベル半径 | — | 外 101 / 内 69(24h) | **100** / なし(TP4 / TP9) |
| ラベルのターゲット | 48×48 | 48 | **40 ✗(TP4)** |
| 選択ハンドル | 48 | 48 | **40 ✗(TP4)** |
| 中心点 / トラック | 8 / 2 | 8 / 2 | 8 / 2 ✓ |
| 入力フィールド | 96×72 | 96×72 | **96×80 ✗(TP2)** |
| 入力の AM/PM | 52×72 | 52×72 | **54×80 ✗(TP2/TP3)** |
| supporting text | フィールドの下 | 上 7、minLines 2 | **なし ✗(TP2)** |
| モード切替 | icon button | IconButton(40 + 48 ターゲット) | 48 の円(IconButton ではない — TP7) |

### カラー(light)

| 要素 | site | Compose(Defaults) | 実装 |
|---|---|---|---|
| コンテナ | surface-container-high | surface-container-high(dialog) | ✓ |
| 見出し | on-surface-variant | on-surface(継承)— 裁定 | **なし(TP8)** |
| 時刻セレクタ selected | primary-container / on-primary-container | 同 | ✓ |
| 時刻セレクタ unselected | surface-container-highest / on-surface | 同 | ✓ |
| 区切り | on-surface | on-surface | ✓ |
| AM/PM selected | tertiary-container / on-tertiary-container | flag on: primary-container / on-primary-container — 裁定 | ✓(site) |
| AM/PM unselected | 透明 / on-surface-variant | flag on: surface-container-lowest | ✓(site) |
| AM/PM 枠 | outline 1dp | flag on: なし | ✓(site) |
| dial | surface-container-highest | 同 | ✓ |
| dial ラベル | on-surface / selected on-primary | 同 | ✓ |
| ハンドル・トラック・中心点 | primary | primary | ✓ |
| 入力フィールド(未フォーカス) | surface-container-highest / on-surface、枠なし | 同(非選択は枠なし) | 背景・文字 ✓ / **outline 1px ✗(TP2)** |
| 入力フィールド(フォーカス) | primary-container / on-primary-container、primary 2dp | 枠は Outline — 裁定 | ✓ |
| supporting text | on-surface-variant(エラー時 error) | 同 | **なし(TP2 / TP1)** |
| state layer | 時刻セレクタ on-primary-container / on-surface、AM/PM on-tertiary-container / on-surface-variant、入力 hover on-surface、0.08/0.10/0.10 | ripple 0.08/0.10/0.10 | **モード切替の hover のみ ✗(TP7)** |

### タイポグラフィ

| 要素 | site | Compose | 実装 |
|---|---|---|---|
| 見出し | label-medium 12/16/500/0.5 | LabelMedium | **なし(TP8)** |
| 時刻セレクタ・区切り | display-large 57/64/400/−0.25 | DisplayLarge | 57/64 だが **字間 normal ✗(TP3)** |
| 入力フィールド | display-medium 45/52/400/0 | DisplayMedium | **display-large ✗(TP2)** |
| 入力の区切り | display-large | DisplayMedium(継承)— 裁定 | display-large ✓ |
| AM/PM | title-medium 16/24/500/0.15 | TitleMedium | 16/500 だが **行高・字間 normal ✗(TP3)** |
| dial ラベル | body-large 16/24/400/0.5 | BodyLarge | 16 だが **行高・字間 normal ✗(TP3)** |
| supporting text | body-small 12/16/400/0.4 | BodySmall | **なし(TP2)** |

### 挙動・a11y

| 要件 | 出典 | 実装 |
|---|---|---|
| 手入力できる(dial だけにしない)・キーボードアイコンで切替 | site a11y / guidelines | ✓ |
| hour / minute = text input「Hour」「Minute」 | site a11y | ✓ |
| 入力の検証・置き換え・エラー表示・自動で minute へ | Compose `TimeInputTransformation` / `SupportingText` | **✗(TP1)** |
| dial ターゲット 48×48 | site a11y / Compose | **✗ 40(TP4)** |
| dial ラベルの名前に単位・選択状態 | site ラベル表 / Compose | **✗ 数字のみ(TP4)** |
| dial のキーボード(単一入口 + 矢印循環 + Tab で抜ける) | Compose `ClockText` | **✗ 12 Tab ストップ(TP4)** |
| Space / Enter で選択 | site キー表 | ✓(ネイティブ button) |
| 端数の分をその角度に表示 | Compose | **✗ 5 分に丸め(TP5)** |
| トラックのドラッグ | site guidelines / Compose | **✗(TP5)** |
| 時を選んだら分へ自動切替(ポインタのみ) | Compose | **✗(TP5)** |
| hour/minute セレクタ = radio +「Select hour/minutes」 | Compose | **✗ 素の button(TP6)** |
| AM/PM = radio(in list)「AM or PM」 | site / Compose | **✗ group + button(TP6)** |
| hover/focus/pressed の state layer、FocusRing | site / Compose | **✗(TP7)** |
| 見出し、Cancel / OK、外側クリックで破棄、フォーカス保持 | site anatomy / guidelines / a11y、Compose `TimePickerDialog` | **✗(TP8)** |
| 24h(ロケール既定、AM/PM なし、内リング) | site / Compose | **✗(TP9)** |
| `prefers-reduced-motion` | — | ✓(ハンドルの transition を無効化) |
| axe(dial / input 両モード) | — | 違反 0 ✓ |

## 修正時の決定(#164〜#169、2026-09-30)

裁定表で「修正時に決める」とした点と、修正中に選んだ点:

| 項目 | 決定 | 理由 |
|---|---|---|
| dial ラベルの読み上げ(上表「dial ラベルの読み上げ」) | role は native `<button>`、名前は Compose の単位付き文言(「3 o'clock」/「15 minutes」/ 24h「15 hours」、`getHourLabel` / `getMinuteLabel` で差し替え可)。選択中の値は **`aria-current="time"`**。site の「of 12」の位置情報は付けない | site の role(button)に従い、選択状態は「時刻の集合の中の現在値」を表す ARIA の語で出す(`aria-pressed` はトグルの意味になるため不採用)。位置は矢印キーの循環で自明 |
| 端数の分(例 7 分)のとき | ハンドルは 42° に描き、Tab の入口は最寄りの 5 分(「05」)、`aria-current` はどのラベルにも付けない | Compose `isTheSelectedValue`(入口)と、読み上げが実値と食い違わないこと |
| dial の Tab 順 | 選択中の数字 1 つが Tab ストップ(矢印で移動した数字に roving)。Shift+Tab は選択中の hour/minute セレクタへ戻す | Compose `ClockText` |
| ポインタ押下時のフォーカス | dial 上の押下では数字にフォーカスを残さない | Compose `clearFocus()` |
| 24h 外リング先頭の表記 | 「00」(名前は「0 hours」) | Compose は「0」だが、時刻セレクタの「00」表示と揃える見た目の軽微差 |
| `mode` の互換(B6 付随) | `mode` は `onModeChange` と併用したときだけ controlled。単独指定は v1.0 どおり初期値(`@deprecated`、`defaultMode` へ移行、v2 で常に controlled) | Phase B 裁定の追加条件(v1.1.0 で互換を壊さない) |
| 見出しの表示条件 | `onAccept` / `onCancel` / `open` のいずれかがあるときだけ(アクション行と同じ) | B6(opt-in、既存ストーリー不変) |
| Enter の確定 | 入力モードの minute フィールドで有効値のとき `onAccept`(hour は minute へ進む)。dial の Enter は選択のみ | m3 キー表 + Compose `ClockText`(Enter は選択) |

## 手順メモ(今回わかったこと)

- time-pickers の token viewer は、セットを切り替えても `visibility` ビューが維持されることがある(ボタンが `view_list` 表示になる)。
  その状態ではシェイプが「Small rounding」/「Extra large rounding」の文字列、elevation は `.elevation-preview-block` の
  インライン `box-shadow` としてしか出ず、`.token` / `.token-value-wrapper` のセレクタは何も返さない。
  elevation は該当行の祖先の `outerHTML` から box-shadow を読むと確実
- Compose の `ComposeMaterial3Flags` に既定 true の見た目変更フラグ(今回は `isUpdatedTimepickerToggleEnabled`)がある。
  `*Defaults` を読むときはフラグ分岐も確認し、トークンとの差は「flag 付きの移行中デザイン」として裁定表に記録する
- Compose がダイアログ側に持つ要素(見出し・アクション・elevation)は `TimePickerDialog.kt` にあり、`TimePicker.kt` の
  トークン(Headline / ContainerElevation)は未使用。コンポーネント本体のファイルだけ読むと「トークン未使用」を見落とす
