# Phase B — 公開 API 判断(2026-09-30・**全項目 決定**)

コンポーネント別 spec 監査(`docs/audits/*.md` — 多くは PR #162〜#296 で追加中)で `api-design` ラベルが付いた
Issue 30 件(#301 を含む)と、監査の軽微欄で「横断判断」として持ち越された論点をまとめた**提案書**。
本書は当初「提案書」として起案され、全項目がユーザー判断待ちだった(推奨は起案者の案)。下記の裁定により全項目が決定した。

> **裁定(2026-09-30)**: ユーザーが **全 29 項目を推奨どおり承認**した。本書は `phase-a-api.md` と同じ決定記録として扱う。
> 追加条件: **v1.1.0(マイナー)で出すため、互換性を壊さない**。破壊的変更を含む項目(B5 の ListItem DOM、B6 の TimePicker
> `mode`、B26 の `medium` / `large` / `variant="center"`)は、旧 API を **非推奨の別名として残して互換を保つ**形で実装し、
> 削除は v2 で行う。DOM の変化(B5・B21)は公開 API ではないが、CHANGELOG に明記する。
> 実装順は下記「依存関係」に従う。v1.1.0 は監査で出た全 Issue の修正が揃ってからリリースする。

前提(Phase A で決定済み — 本書の推奨はこれと矛盾しないように組んである):

- 1 MD3 コンポーネント = 1 コンポーネント、差分は `variant` 等の prop(CLAUDE.md API Design Policy)。Compose は挙動・既定値・
  どの variant があるかを決めるが、**prop の形は決めない**
- `onChange(event, value)`(A2)。ただしピッカーは値ファースト `onChange(value)`(A8)
- ポップアップ系は `open` / `defaultOpen` / `onOpenChange`、モーダル系は `onClose`(A3)
- stateful な prop は controlled / uncontrolled の両方(A4)
- アイコン対は `startIcon` / `endIcon`、状態別アイコン(`selectedIcon`)は維持(A5)
- サイズ語彙: 5段階組は `xs`〜`xl`、Fab は `small/regular/medium/large`(A1)。Fab 配色は `color` + `tonal`(A6)
- `ref` は常にルート、入力系は `inputRef`(ref / A10)

## サマリ

| ID | Issue | 論点 | 推奨 | 破壊的変更 | 状態 |
|---|---|---|---|---|---|
| B1 | 横断(#265 #251 #161 ほか) | 組み込み文言の i18n | **prop ごとのラベル(`*Label` / `get*Label`)を正とし、`LocaleProvider` は後から既定値供給として追加** | なし | 決定(2026-09-30・推奨どおり) |
| B2 | 横断(button B5・nav 監査) | 既定の motion scheme | **expressive を既定、`ThemeProvider motionScheme="standard"` で切替** | 挙動のみ(bounce 量) | 決定(2026-09-30・推奨どおり) |
| B3 | 横断(PI5・CR4 ほか) | reduced motion の方針 | **状態遷移は即時/フェードのみ、不定進捗だけ最小の動きで継続** | 挙動のみ | 決定(2026-09-30・推奨どおり) |
| B4 | 横断(#259 #54) | ポップアップ位置決めの共通化 | **内製の `src/internal` ヘルパー(flip + clamp)+ Popover API の top layer** | なし(内部) | 決定(2026-09-30・推奨どおり) |
| B5 | #217 #301 #247 | 操作可能な面(リンク化・入れ子の操作要素・Carousel 項目) | **`href` → `<a>` / `onClick` → ボタン。入れ子は ListItem = 内部で主アクションと `trailing` を兄弟に、Card = `CardActionArea` / `CardActions` を追加** | ListItem の DOM のみ | 決定(2026-09-30・推奨どおり) |
| B6 | #161 #168 | ピッカーの OK / Cancel と dialog 構成 | **組み込みアクション行 + `onAccept`(下書き/確定モデル)+ `open` 指定でモーダル表示** | TimePicker `mode` のみ(下記) | 決定(2026-09-30・推奨どおり) |
| B7 | 横断 | ピッカー確定と Snackbar host の共通パターン | **仕組みは共通化しない。語彙(`reason`)と内部プリミティブだけ共有** | なし | 決定(2026-09-30・推奨どおり) |
| B8 | #169 | TimePicker 24 時間制 | **`ampm?: boolean`(MUI X)、既定は `locale`(既定 `'en-US'`)から導出** | なし | 決定(2026-09-30・推奨どおり) |
| B9 | #251 | Snackbar host(キュー・自動消去) | **`SnackbarProvider` + `useSnackbar().show()`(Promise を返す)、`Snackbar` は見た目部品のまま** | なし | 決定(2026-09-30・推奨どおり) |
| B10 | #253 | 長い action を別行に | **`actionOnNewLine?: boolean`(自動判定なし)** | なし | 決定(2026-09-30・推奨どおり) |
| B11 | #257 #261 | rich tooltip の操作性と persistent | **action 付き rich は非モーダル `role="dialog"`、`persistent?: boolean` を追加** | a11y ロールのみ | 決定(2026-09-30・推奨どおり) |
| B12 | #259 | rich tooltip の既定配置 | **rich は `bottom` 既定(plain は `top` のまま)** | 既定値変更(VRT) | 決定(2026-09-30・推奨どおり)。rich の既定位置は **B38 で置換** |
| B13 | #281 | ButtonGroup の選択モデル | **`selectionMode` + `value` / `defaultValue` / `onChange(event, value)` + `selectionRequired`** | なし | 決定(2026-09-30・推奨どおり) |
| B14 | 横断(SG 軽微欄) | SegmentedButton の存廃 | **維持 + JSDoc / Storybook で ButtonGroup を案内(`@deprecated` は付けない)** | なし | 決定(2026-09-30・推奨どおり) |
| B15 | #213 | アイコンのみセグメント | **option に `ariaLabel`、アイコンは選択時も残す(check + icon)** | なし(見た目は新ストーリーのみ) | 決定(2026-09-30・推奨どおり) |
| B16 | #184 #185 #189 | input chip の選択・avatar・ChipSet | **filter と同じ選択 API / `avatar` prop / `ChipSet` 新設** | なし | 決定(2026-09-30・推奨どおり) |
| B17 | #225 | List の選択を支援技術へ | **`List selectionMode` + `value` → `listbox` / `option` + `aria-selected`** | なし(追加) | 決定(2026-09-30・推奨どおり) |
| B18 | #224 | Expressive リストの形・segmented・既定の見た目 | **Expressive の形を既定、`variant="standard" \| "segmented"`** | 見た目(VRT) | 決定(2026-09-30・推奨どおり) |
| B19 | #293 | SwipeToDismiss のライフサイクル | **`onDismiss` は退場後、`dismissed` の controlled / uncontrolled で reset / プログラム dismiss** | タイミングのみ | 決定(2026-09-30・推奨どおり) |
| B20 | #294 | 方向別の背景 | **`startToEndBackground` / `endToStartBackground` + `data-*` / 進捗 CSS 変数** | なし | 決定(2026-09-30・推奨どおり) |
| B21 | #295 | List 内での list 構造 | **context で自動: List 内の SwipeToDismiss が `<li>`、中の ListItem は `<div>`** | DOM のみ | 決定(2026-09-30・推奨どおり) |
| B22 | #174 | ナビ項目の `selectedIcon` | **`selectedIcon?: ReactNode`(Switch / IconButton と同名)** | なし | 決定(2026-09-30・推奨どおり) |
| B23 | #180 | モーダル NavigationRail | **`modal` + `hideOnCollapse` + `onClose`(useModal ベース)** | なし | 決定(2026-09-30・推奨どおり) |
| B24 | #203 #208 | FabMenu の名前固定とサイズ | **`closeAriaLabel` を deprecated(無視)/ `size` + `tonal` を追加** | 実質なし(prop は残す) | 決定(2026-09-30・推奨どおり) |
| B25 | #233 #243 | AppBar / Toolbar のスクロール連動 | **状態 prop(`scrolled` 等)+ 便利 prop `scrollBehavior` / `scrollTarget` の二層** | なし | 決定(2026-09-30・推奨どおり) |
| B26 | #238 | AppBar の flexible・subtitle・配置 | **`medium` / `large` を flexible に置換、`subtitle`、`titleAlignment`、`variant="center"` は deprecated エイリアス** | あり(見た目・型) | 決定(2026-09-30・推奨どおり) |
| B27 | 横断(AB / TL 軽微欄) | BottomAppBar の扱い | **JSDoc で `Toolbar variant="docked"` を案内、deprecated 化は v2 で再判断** | なし | 決定(2026-09-30・推奨どおり) |
| B28 | #265 | Badge のラベルと非表示時の扱い | **visually-hidden の既定英語ラベル + `label` で上書き、`role="status"` 廃止、非表示時は AT からも隠す** | a11y のみ | 決定(2026-09-30・推奨どおり) |
| B29 | #267 | Divider を既定で装飾扱いに | **既定 decorative(AT から隠す)+ `decorative={false}` で意味付き区切り** | a11y のみ | 決定(2026-09-30・推奨どおり) |
| B30 | #393 | Search app bar | **`TopAppBar variant="search"` + `searchBar` スロット(SearchBar を合成)、`titleAlignment` で中央揃え、`title` は visually hidden の h1** | なし(追加) | 決定(2026-10-07・#393 の API 案どおり) |
| B36 | #438 | ChipSet の選択モードと filter chip の `endIcon` | **`ChipSet selectionMode` + `value` / `defaultValue` / `onChange(event, value)` + `selectionRequired`(single = APG radio group)、filter chip に装飾の `endIcon`(Menu の trigger で `aria-expanded` 時に 180° 回転)** | なし(追加) | 決定(2026-10-13・#438 の API 案どおり) |
| B35 | #437 | BottomSheet の standard variant と detent | **`variant="standard" \| "modal"`(既定 modal)+ `expanded` / `defaultExpanded` / `onExpandedChange` + `skipPartiallyExpanded`、部分展開 = `min(画面/2, シート/2)`(Compose 現行フラグ、TODO 付き)は `skipPartiallyExpanded={false}` で opt-in(既定 true = 従来どおり、切替は v2 候補)、opt-in 時のハンドルは partial ↔ expanded のトグル** | なし(追加) | 決定(2026-10-13) |
| B31 | #434 | Select(exposed dropdown menu・非編集) | **専用の `<Select>` + `<Option>` 子要素、`value` / `defaultValue` / `onChange(event, value)`、APG select-only combobox + 隠しネイティブ input** | なし(追加) | 決定(2026-10-13・#434 フェーズ 1) |
| B38 | #440 | Tooltip の配置拡張・rich の既定位置・caret | **`placement` に `'start' \| 'end' \| 'left' \| 'right'`(論理値は RTL で反転、flip あり)、`placement` 未指定の rich は bottom-end の角 + 4 隅の動的配置、`caret?: boolean`(16×8dp)** | 既定値変更(rich の未指定時の位置) | 決定(2026-10-13・#440 の提案どおり) |
| B32 | #441 | PullToRefresh(新規) | **自身がスクロールコンテナになる `<PullToRefresh refreshing onRefresh indicator disabled threshold>`、touch + pointer、reduced motion はフェードのみ、`aria-busy` + polite live region** | なし(追加) | 決定(2026-10-13・#441 の API 案をもとに確定) |
| B33 | #435 | Menu の選択項目(単一 / 複数)・supporting text | **`MenuGroup selectionMode="single" \| "multiple"` + `value` / `defaultValue` / `onChange(event, value)`(single = `menuitemradio`、multiple = `menuitemcheckbox` で開いたまま)、`closeOnSelect`(group / item)、`MenuItem supportingText` / `selectedIcon`** | なし(追加。baseline の selected に色が付く) | 決定(2026-10-13・実装時に確定) |
| B34 | #436 | Menu のサブメニューとコンテキストメニュー | **`MenuItem submenu={…}`(APG のサブメニュー操作、RTL 反転、ホバー意図 400ms、親メニューの横に flip 配置、見た目とモーションは md-sub-menu)+ `Menu anchorPosition={{ top, left }}`(`trigger` 省略可)と `onContextMenu` レシピ。`ContextMenu` ラッパーは作らない** | なし(追加) | 決定(2026-10-13・実装時に確定) |
| B40 | #443 | Tabs のインラインアイコンとバッジ | **`Tab iconPosition="top" \| "start"`(MUI 名、既定 `'top'`)+ `badge={<Badge …/>}`(アイコン上 / テキストのみはラベルの後ろ、読み上げはラベルの後)** | なし(追加) | 決定(2026-10-13・#443 の API 案どおり) |
| B39 | #442 | SearchBar の full-screen レイアウト | **`layout="docked" \| "fullscreen"`(既定 docked)、full-screen は Compose `ExpandedFullScreenContainedSearchBar`(contained)、戻るボタンの名前は `backLabel`** | なし(追加) | 決定(2026-10-13・#442 の API 案どおり) |
| B37 | #439 | TextField のラベル位置(上置き・常時縮小) | **`labelPlacement?: 'floating' \| 'above'`(既定 `'floating'`)+ `shrinkLabel?: boolean`、DatePickerField も同名で素通し** | なし(追加) | 決定(2026-10-13・#439 の API 案どおり) |
| B41 | #444 | 小さな構成の不足(FabMenu 配置・Toolbar elevation・dismissible drawer・Carousel 幅) | **FabMenu `horizontalAlignment`、Toolbar `disableElevation`、NavigationDrawer `variant="dismissible"`、Carousel `itemWidth` の JSDoc 修正** | なし(追加) | 決定(2026-10-13) |
| B42 | #434 | Autocomplete(exposed dropdown menu・編集可) | **専用の `<Autocomplete>`、`options` 配列か `<Option>` 子要素、`value` / `inputValue` の二系統(各 controlled / uncontrolled)、`freeSolo` / `filterOptions` / `noOptionsText`、APG list autocomplete、listbox / Option は Select と共有** | なし(追加) | 決定(2026-10-13・#434 フェーズ 2) |
| B43 | #444 | TimePicker の vibrant・横向き・スクロールホイール | **`variant="standard" \| "vibrant"`、`orientation="vertical" \| "horizontal"`(dial のみ)、`mode="scroll"`(Compose `TimeScroll`)+ 公開 `ScrollField`(APG spinbutton)** | なし(追加) | 決定(2026-10-13) |
| B44 | #444 | TextField / Select の tonal・secure field・VerticalDragHandle | **TextField / Select `tonal?: boolean`(`@experimental`、Compose `tonalColors()` + `roundedShape`)、secure field はレシピ(`type="password"` + `IconButton toggle`、名前固定 + `aria-pressed`)、新規 `DragHandle`(APG window splitter、`value` / `onChange(event, value)` / `min` / `max` / `step` / `paneSide`)** | なし(追加) | 決定(2026-10-13) |
| B51 | #496 #501 #502 | フォーカス可能な無効ボタン・Menu `onAction`・Tooltip の表示遅延 | **いずれも実装しない(仕様に根拠なし)。代替手段をドキュメント化** | なし | 決定(2026-10-15) |

「破壊的変更」は公開型・既定値・DOM・見た目のいずれかが既存利用者に見える形で変わるか。VRT への影響は各項目の「影響」に書く。

### 判断の依存関係(この順に決めると手戻りがない)

- **B1(i18n)** → B6・B9・B24・B28 の文言 prop 名
- **B4(位置決め)** → B11・B12
- **B13(ButtonGroup 選択)** → B14(SegmentedButton の存廃)
- **B17(List 選択)** → B21(SwipeToDismiss の li 化とロールの載せ先)
- **B5(主アクションの構造)** と **B17(選択モード)** は ListItem の内部 DOM を両方書き換える — 同じ PR 系列で実装
- **B2 / B3(motion)** → モーションを実装するすべての修正(B9・B18・B25 ほか)
- B6 と B9 の関係は B7 で整理

---

## 横断(ライブラリ全体)

### B1: 組み込み文言の i18n

- **Issue**: 横断(#265 Badge、#251 / SN 軽微欄 "Dismiss"、#161 DatePicker、TextField の `getCounterLabel`)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 英語が直書きの文言が散在する — Snackbar "Dismiss"、Dialog "Close"、DatePickerField "Open calendar"、
  DatePicker "Previous month" / "Next month" / "Select date"、TimePicker "Hour" / "Minute" / "AM or PM" / "Switch to dial"、
  Chip `Remove ${label}`、Badge `${n} notifications`。一方で一部は既に prop 化済み(SideSheet `closeLabel` / `backLabel`、
  BottomSheet `dragHandleLabel`、Slider `rangeStartLabel`、SplitButton `trailingAriaLabel`、FabMenu `closeAriaLabel`、
  TextField `getCounterLabel`)で、命名も揃っていない。

**選択肢**

- **(a) prop ごとのラベルのみ**(MUI core の Autocomplete `clearText` / `openText`、Pagination `getItemAriaLabel`、
  Rating `getLabelText` と同じ流儀)
  ```tsx
  <Snackbar message="Saved" dismissLabel="閉じる" />
  <Badge value={3} getLabel={(n) => `新着 ${n} 件`} />
  ```
  - 利点: 明示的・tree-shake しやすい・既存の prop 化済み部品と同じ形。欠点: アプリ全体を訳すには全箇所に渡す必要
- **(b) `LocaleProvider`(または `ThemeProvider` の `localeText`)のみ**(MUI X の `localeText`)
  ```tsx
  <LocaleProvider locale="ja-JP" text={jaJP}><App /></LocaleProvider>
  ```
  - 利点: 一括翻訳。欠点: 個別上書きができない、context 依存が全コンポーネントに入る
- **(c) 両方: prop が正、Provider は既定値の供給源**(優先順位 prop > Provider > 英語既定)。MUI core も
  `createTheme(jaJP)`(= コンポーネント既定 props の供給)と個別 prop の併用
  - 利点: (a) の明示性 + (b) の一括性。Provider は後から非破壊で足せる。欠点: 実装面が2つ

**推奨**: **(c) を段階導入** — Phase B では全文言を prop 化して命名を統一し、`LocaleProvider` は v1.x で非破壊追加。
理由: prop 化はどの案でも必要な土台で、Provider は既定値を差し込むだけの薄い層にできるため。

- 命名規約(新規分): 文字列は `xxxLabel`、値に依存する文言は `getXxxLabel(…) => string`。
  既存の `closeAriaLabel` / `trailingAriaLabel` / `ariaLabel` は改名しない(v2 で deprecated エイリアス付き改名を再判断)
- `locale`(Intl 書式用)も Provider から供給できるようにする(DatePicker の `locale` 既定 `'en-US'` と整合)

**影響**: 非破壊(追加のみ、既定文言は現状の英語のまま)。VRT なし。対象: Snackbar / Dialog / DatePicker / DatePickerField /
TimePicker / Chip / Badge ほか。

### B2: 既定の motion scheme(standard / expressive)

- **Issue**: 横断(button.md B5、navigation-bar 監査「MotionScheme 既定は横断判断」、toolbar / list 監査の FastSpatial 指定)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: Compose は `MotionScheme.standard()` / `.expressive()` を持ち、`MaterialTheme` の既定は standard、
  `MaterialExpressiveTheme` の既定は expressive。差があるのは spatial ばね(Fast 0.9/1400 ↔ 0.6/800 など)だけで、
  effects ばねは同一。本ライブラリは現状コンポーネントごとに cubic-bezier を直書き(トグル系の `0.34,1.4,0.5,1` 等)。

**選択肢**

- **(a) expressive を既定 + `ThemeProvider motionScheme="standard"` で切替**
  ```tsx
  <ThemeProvider motionScheme="standard">…</ThemeProvider>  // 既定は 'expressive'
  ```
  spring トークンを `--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-{easing|duration}` の CSS 変数
  (CSS `linear()` で近似)として `tokens.css` に置き、ThemeProvider が `data-motion-scheme` で差し替える
  - 利点: ライブラリの性格(Expressive)と Compose `MaterialExpressiveTheme` に一致。欠点: bounce が強めに見える場面がある
- **(b) standard を既定 + expressive は opt-in**
  - 利点: 控えめで業務 UI 向き。欠点: 「Expressive ライブラリ」の既定体験が Expressive にならない
- **(c) scheme を持たない(現状: コンポーネントごとに固定)**
  - 利点: 実装コスト 0。欠点: 同じ FastSpatial がコンポーネントごとに違う近似になり、監査のたびに個別判断が要る

**推奨**: **(a)**。理由: ライブラリの目的が M3 Expressive で、Compose の Expressive 用テーマの既定と一致し、切替も
CSS 変数の差し替えだけで済むため。CLAUDE.md の「通常の押下モーフは ~150ms standard easing(B5)」は Compose でも
scheme 非依存の DefaultEffects なので、そのまま維持。

**影響**: API は非破壊(`ThemeProvider` に prop 追加)。見た目は spatial モーションの bounce 量が変わるが、VRT はアニメ無効で
撮るため差分なし。対象: トークン層 + spring を使う全コンポーネント(Button / IconButton / Fab / FabMenu / NavigationRail /
Toolbar / List ほか)。

### B3: reduced motion の方針

- **Issue**: 横断(progress 監査 PI5 軽微欄、carousel CR4、各監査の「reduced motion」行)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 現状は `transition: none` が多数派だが統一方針がない。不定進捗は linear / wavy / LoadingIndicator が静止フレーム、
  flat circular だけ 6s で回り続ける。静止した不定進捗は「止まった determinate」に見える懸念がある。m3 / Compose とも規定なし
  (Compose は `InfiniteAnimationPolicy` のみ)。

**選択肢**

- **(a) 全停止**: すべての transition / animation を止め、不定進捗も静止フレーム
  - 利点: 単純・VRT 決定的。欠点: 「処理中」の手がかりが消える
- **(b) 「本質的な動き」だけ残す**(WCAG 2.3.3 の essential の考え方)
  - 状態遷移・シェイプモーフ・spring・enter/exit → **即時、または opacity フェードのみ**(Tooltip の現行方式)
  - 空間移動・拡大縮小・パララックス・wave・carousel の縮小 → **停止**(CR4 の方向)
  - **不定進捗だけは最小の動きで継続**(circular は一定速度の回転のみで伸縮なし、LoadingIndicator は回転のみでモーフなし、
    linear は低速の単純スイープ)
  - 利点: 酔いの原因(空間運動・弾み)を消しつつ状態は伝わる。欠点: 実装がコンポーネント別に要る
- **(c) (b) + 利用者の上書き**: `ThemeProvider reducedMotion="system" | "always" | "never"`(Framer Motion `MotionConfig` の
  `reducedMotion="user"` に相当)
  - 利点: アプリ側の独自設定に追従できる。欠点: API 面が増える

**推奨**: **(b)**(c の上書きは要望が出てから非破壊で追加)。理由: 静止した不定進捗は誤情報になり得る一方、それ以外の
動きは止めても情報が失われないため。

**影響**: API なし(方針のみ)。VRT は reduced motion で撮るため、不定進捗の JS 駆動部分は `window.__VRT__` で固定フレームに
落とす分岐が必要(しないと非決定的になる)。静止フレームの選び方を変えると ProgressIndicator / LoadingIndicator の
既存ベースラインが変わる。

### B4: ポップアップ位置決めの共通化

- **Issue**: #259(TT4)、Menu の flip(#54)、DatePickerField(docked)、SearchBar のビュー
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: Menu は flip を `Menu.tsx` 内にインライン実装、Tooltip は CSS だけ(flip も clamp もなく、祖先の `overflow` で切れる)。
  Compose はどのポップアップも「anchor 基準 + flip + window 内に clamp、clipping なし」。

**選択肢**

- **(a) 内製ヘルパー `src/internal/usePopupPosition`**(flip + clamp + `position: fixed` 座標、resize / scroll 追従)。
  描画は Popover API(`popover="manual"`)の top layer で祖先の clipping と z-index を回避(portal 不要)
  - 利点: 依存ゼロ・必要十分(Compose 相当の単純なロジック)。欠点: 端ケースは自前で保守
- **(b) Floating UI(`@floating-ui/react-dom`)に依存**(MUI Base UI が採用。MUI core は Popper.js)
  - 利点: 実績・端ケース(shift / size / arrow)込み。欠点: 依存追加、配置ロジックが M3 の「8dp 刻み」等と一致する保証なし
- **(c) CSS Anchor Positioning + `position-try-fallbacks`**
  - 利点: JS 不要。欠点: ブラウザ対応が揃っていない(Baseline 未到達の環境がある)ため今は主経路にできない

**推奨**: **(a)**。理由: 必要なロジックは Compose の flip + clamp 程度で小さく、依存方針(外部 a11y フレームワークなし)とも
整合し、内部 API にしておけば将来 (c) へ差し替えられるため。公開 API は各コンポーネントの `placement` のみ(ヘルパーは非公開)。

**影響**: 公開 API なし。VRT: Tooltip の Plain / Rich(#259 の修正で位置と幅が変わる — `update-vrt-baselines`)。
対象: Menu / Tooltip / DatePickerField / SearchBar(順次移行)。

**実装メモ(#312 Tooltip、#317 Menu / DatePickerField / SearchBar)**

- ヘルパーは開いている間、scroll / resize に加えて anchor と popup のサイズ変化(ResizeObserver)と、サイズが変わらない
  anchor の移動(レイアウトシフト。IntersectionObserver の rootMargin を anchor の矩形に絞る Floating UI `autoUpdate`
  と同じ手法)でも再配置する。使った側の余白を `--_popup-available-height` として popup に書く
- **Menu**: top layer + flip + clamp(端から 8dp。Compose `MenuVerticalMargin` は縦 48dp だが、Web の viewport には
  システムバーがないため Tooltip と同じ 8dp に統一)。幅モデルは従来の実測値を維持 — 内容幅(`max-content`)を 112–280dp
  に収め、trigger の幅には合わせない(Compose `DropdownMenu` も内容幅)。viewport より高い baseline メニューは内部スクロール
  (`max-height: 100dvh - 16px`、Compose の縦スクロールに相当)。vertical variant はグループの影を切らないため overflow を
  変えない
- **DatePickerField(docked)**: top layer + flip + clamp(8dp)、field の下に start 揃え。狭い viewport では 360dp の
  popup を `100vw - 16px` まで縮める(従来は右へはみ出していた)
- **SearchBar(docked view)**: view だけを top layer に置き、**flip / clamp はしない**(`avoidCollisions: false`)。
  Compose `ExpandedDockedSearchBar` の Popup はバー位置に固定・clipping 無効で、上に反転しない。幅はバーに一致
  (`matchAnchorWidth`)。高さは従来の 240dp〜viewport の 2/3 に加え、バー下の余白を上限にして結果を view 内でスクロール
  させる(240dp 未満にはしない)。**scrim は top layer に入れない** — top layer は通常フローのバーより必ず上に描かれるため、
  scrim がバーを覆ってしまう。scrim は従来どおりページ内(`position: fixed`、wrapper の z-index でバーの下)に残す

### B5: 操作可能な面 — Card / ListItem / CarouselItem の起動要素と入れ子の操作要素

- **Issue**: #217(CD2 — リンクカード)、#301(Card / ListItem の入れ子操作要素 — axe `nested-interactive`)、#247(CR5 — Carousel 項目)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: クリック可能な Card は `<div role="button">` 固定で `href` がない(`role="link"` を渡しても Space で起動)。
  さらに Card / ListItem は `role="button"` の容器の中にボタンや Switch を入れられる構造で、axe `nested-interactive`
  (入れ子の操作要素が支援技術に公開されない恐れ)。キー / クリックの横取りは PR #298(#216 / #226)で修正済みで、
  残るのは構造の問題。CarouselItem は素の `<div>` でフォーカスも起動もできない(実ブラウザ axe `scrollable-region-focusable`)。
  ライブラリにはまだ `href` を持つコンポーネントがない。

3 つの小論点に分けて裁定する。

**(1) 起動要素の出し分け(#217 / #247)**

- **(1a) `href` → `<a>`、`onClick` → ボタン、どちらもなし → 非操作**(MUI `ButtonBase` の「`href` があれば `<a>`」と同じ)
  ```tsx
  <Card href="/articles/42">…</Card>        // <a>、Enter のみで起動、中クリック・新規タブ可
  <Card onClick={open}>…</Card>             // ボタン
  <CarouselItem href="/album/1" aria-label="…">…</CarouselItem>
  ```
- **(1b) ポリモーフィック `component` prop**(MUI `CardActionArea component={Link}`)— ルーター統合できるが型が重く、
  Button / NavigationBarItem / ListItem にも波及する横断判断

**(2) 主アクションと入れ子の操作要素の構造(#301)**

- **(2a) MUI 流の分割 — 部品を増やす**: Card は `CardActionArea`(主アクション、中身を包む `<button>` / `<a>`)+
  `CardActions`(兄弟に置くボタン群)。List は `ListItemButton` + `secondaryAction`
  ```tsx
  <Card>
    <CardActionArea href="/articles/42"><img …/><h3>Title</h3><p>…</p></CardActionArea>
    <CardActions><Button variant="text">Share</Button></CardActions>
  </Card>
  <ListItem secondaryAction={<Switch …/>}>
    <ListItemButton onClick={open}>…</ListItemButton>
  </ListItem>
  ```
  - 利点: MUI 利用者に最も馴染む。主アクションの名前が中身から自動で決まる。欠点: 部品が増え、ListItem の既存
    スロット API(`headline` / `leading` / `trailing`)と二重になる
- **(2b) 既存コンポーネントのまま「引き伸ばした主アクション」**(Bootstrap の stretched link): `onClick` / `href` 指定時、
  内部の `<button>` / `<a>` を `::after { inset: 0 }` で面全体に広げ、入れ子の操作要素はその兄弟として上に重ねる
  - 利点: 部品が増えない。欠点: Card は中身の構造を知らないので、主アクションの名前を `aria-label` / `aria-labelledby` で
    利用者が与える必要がある(忘れると名前なしのリンク)
- **(2c) 混合 — スロットの有無で使い分け**
  - **ListItem**: スロットを持つので内部で分割する。`onClick` / `href` 指定時は `leading` + テキスト部を包む
    `<button>` / `<a>` を主アクションとし、`trailing` はその**兄弟**に描く(MUI の `ListItemButton` + `secondaryAction` と
    同じ構造を 1 コンポーネントで)。操作要素は `trailing` に置く、と JSDoc に明記
  - **Card**: `CardActionArea` / `CardActions` を追加((2a) の Card 部分)。`Card onClick` / `href` は「入れ子の操作要素が
    ないカード」の短縮形として残す(中に操作要素を置いたら dev 警告)

**(3) ルーター対応**: (1b) を今入れるか、横断の別判断として後に回すか

**推奨**: **(1a) + (2c) + (3) は後回し**。理由: 起動要素の出し分けだけで #217 / #247 の a11y 指摘は消え、入れ子の問題は
ListItem では既存スロットを兄弟に分けるだけで解け(部品を増やさない)、Card では構造を知らない以上、名前が中身から
自動で決まる MUI の `CardActionArea` / `CardActions` が最も誤用しにくいため。`component` は複数コンポーネントに及ぶので
単独で決めるべき。Carousel の非操作項目ではスクロールコンテナを到達可能に保つ(`tabIndex=0` + ラベル)。
状態レイヤーは focus 0.10(#194)を最初から入れる。B17 の選択モード(`listbox` / `option`)の項目には操作要素を置けないので、
(2c) の分割は選択モードでないリスト(single-action / multi-action)に適用する。

**影響**: 追加が中心。ListItem は `onClick` / `href` と `trailing` を併用しているときに DOM 構造が変わる(主アクションと
`trailing` が兄弟になる)— 見た目は維持する前提で、VRT は差分なしを PR で確認。Card の新部品・リンクカード・操作可能な
Carousel 項目はストーリー追加でベースライン追加。対象: Card(+ `CardActionArea` / `CardActions`)/ ListItem / CarouselItem。

---

## ピッカー・通知

### B6: ピッカーの確定 / キャンセルと dialog 構成

- **Issue**: #161(DP14)、#168(TP8)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: DatePicker / TimePicker とも OK / Cancel がなく、JSDoc は「Dialog で包め」とだけ言う。m3 は全 variant の anatomy に
  テキストボタンを含め、「OK で確定・Cancel と外側で破棄」「Enter で確定して閉じる」。Compose は
  `DatePickerDialog(confirmButton, dismissButton)` / `TimePickerDialog(title, …)`。TimePicker は見出し
  (「Select time」/「Enter time」)も欠落。

**選択肢**

- **(a) `actions` スロットのみ**(Dialog の `actions?: ReactNode` と同じ形)
  ```tsx
  <Dialog open={open} onClose={close}>
    <DatePicker value={draft} onChange={setDraft}
      actions={<><Button variant="text" onClick={close}>Cancel</Button>
                 <Button variant="text" onClick={() => save(draft)}>OK</Button></>} />
  </Dialog>
  ```
  - 利点: 最小。欠点: 下書き/確定・Enter で確定・Cancel で戻す、を毎回利用者が書く。Dialog とピッカーの容器が二重になる
- **(b) 組み込みアクション行 + 下書き/確定モデル**(MUI X の `onAccept` と同じ意味論)
  ```tsx
  <DatePicker
    value={draft} onChange={setDraft}      // 選択のたび(A8 値ファースト)
    onAccept={(v) => save(v)}              // OK / Enter
    onCancel={() => …}                     // Cancel(値は開始時点に戻す)
    okLabel="OK" cancelLabel="Cancel"      // B1
  />
  ```
  `onAccept` / `onCancel` のどちらかを渡すとアクション行(と TimePicker の見出し)を描画
  - 利点: 仕様の挙動(Enter 確定・Cancel で破棄)を内蔵。欠点: モーダル化は利用者任せのまま
- **(c) (b) + `open` を渡すとモーダル表示**(ピッカー自身が `useModal` でスクリム・フォーカストラップ・Escape を持つ。
  A3 のモーダル系に合わせて `onClose(reason)`)
  ```tsx
  <DatePicker open={open} onClose={(reason) => setOpen(false)}
    value={draft} onChange={setDraft} onAccept={save} />
  ```
  - 利点: Compose の `DatePickerDialog` 相当を 1 コンポーネントで(API 方針どおり、`DatePickerDialog` を別に作らない)。
    容器の二重化がない。欠点: 実装量が最大
- **(d) `DatePickerDialog` / `TimePickerDialog` を別コンポーネントで**(Compose そのまま)
  - 利点: Compose と 1:1。欠点: 「1 MD3 コンポーネント = 1 コンポーネント」の方針に反する

**推奨**: **(c)**(実装は (b) → モーダル表示の順に分割可)。理由: 仕様が求める確定/破棄の挙動をライブラリが保証でき、
容器も二重化せず、別コンポーネントを増やさずに済むため。DatePicker と TimePicker で同じ形にする。

- 付随: TimePicker の `mode` は現状「初期値」扱い(内部 state にコピーするだけ)で A4 に反する →
  `mode` / `defaultMode` / `onModeChange` に整理(現 `mode` を初期値として使っている利用者には挙動変更)

**影響**: 追加のみ(アクション行・見出しは opt-in なので既存ストーリーは不変)。TimePicker `mode` の意味変更のみ破壊的。
VRT: 新ストーリー(アクション付き・モーダル)でベースライン追加。対象: DatePicker / TimePicker(DatePickerField は docked で
選択即確定のまま)。

### B7: ピッカー確定と Snackbar host は共通パターンにするか

- **Issue**: 横断(#161 / #168 と #251 の関係)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: どちらも「ユーザーの応答を待つ一時 UI」に見えるが、ピッカーは値を編集する宣言的コンポーネント、
  Snackbar はアプリ全体で 1 件ずつ出す通知キュー。

**選択肢**

- **(a) 共通の命令型 API**(`const d = await pickDate()`、`await snackbar.show()` を同じ host で)
  - 利点: 使い方が揃う。欠点: ピッカーを命令型にする必然性がなく、controlled / uncontrolled(A4)から外れる
- **(b) 仕組みは共通化せず、語彙と内部部品だけ共有**
  - 語彙: 閉じた理由は `reason`('accept' / 'cancel' / 'escapeKeyDown' / 'backdropClick' / 'timeout' / 'action' / 'dismiss')。
    MUI Snackbar の `onClose(event, reason)` に揃える
  - 内部部品: `useModal`(モーダルピッカー)、フォーカス復帰ユーティリティ、live region(Snackbar)、ラベル規約(B1)
- **(c) 完全に別物として扱う**(語彙も揃えない)

**推奨**: **(b)**。理由: 用途が異なるため仕組みの共通化は利点が薄いが、`reason` の語彙とフォーカス復帰は揃えておくと
利用者の学習コストとテストが減るため。

**影響**: なし(B6・B9 の設計指針)。

**追補(2026-10-12・#407)— モーダルオーバーレイの `onClose(event, reason)`**: Dialog / BottomSheet / SideSheet /
NavigationDrawer / モーダル NavigationRail の `onClose` に、B7 の語彙で `(event, reason)` を渡す(MUI Modal の
`onClose(event, reason)` と同じ形)。引数を足すだけなので非破壊 — `() => setOpen(false)` はそのまま動く。

- 語彙: `'escapeKeyDown'`(Escape — `useModal` の `onEscape` が受けたネイティブ `KeyboardEvent` をそのまま渡す)/
  `'backdropClick'`(scrim クリック)/ `'closeButton'`(組み込みの閉じる操作)/ `'drag'`(BottomSheet のドラッグ・フリングで閉じた)。
  `'escapeKeyDown'` / `'backdropClick'` はピッカー(`DatePickerCloseReason` / `TimePickerCloseReason`)・Snackbar と同じ綴り
- 型: `event` は `SyntheticEvent | Event`。各コンポーネントは出し得る理由だけに絞った型を公開する —
  `DialogCloseReason` = escapeKeyDown / backdropClick / closeButton(full-screen の閉じるボタン)、
  `BottomSheetCloseReason` = 4 つすべて(ドラッグハンドルをボタンとして押した場合は `'closeButton'`)、
  `SideSheetCloseReason` = escapeKeyDown / backdropClick / closeButton、
  `NavigationDrawerCloseReason` / `NavigationRailCloseReason` = escapeKeyDown / backdropClick
- ピッカーの `onClose(reason)`(値ファースト、A8)は今回変えない。新しい理由を足すときはこの語彙に追記する

### B8: TimePicker の 24 時間制

- **Issue**: #169(TP9)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 24 時間制がなく、AM/PM が常に出る。m3 は 24h で内外 2 リングの文字盤・AM/PM なし。Compose は `is24Hour`
  (既定はシステム設定)。

**選択肢**

- **(a) `ampm?: boolean`**(MUI X ピッカーと同名)。既定は `locale` の `hourCycle` から導出
  ```tsx
  <TimePicker ampm={false} />          // 24h
  <TimePicker locale="ja-JP" />        // ja-JP の hourCycle(h23)→ 24h
  ```
- **(b) `hourCycle?: 'h12' | 'h23'`**(Intl と同じ語)
  - 利点: Intl と対応が明快。欠点: MUI 利用者には馴染みがない
- **(c) `is24Hour?: boolean`**(Compose と同名)
  - 利点: Compose と 1:1。欠点: Web / MUI 的でない

既定値の導出元も選ぶ: `locale` prop(既定 `'en-US'` → 12h、SSR で安定)か、`navigator.language`(実行環境依存、
SSR とハイドレーションで食い違う)か。

**推奨**: **(a) + `locale` prop(既定 `'en-US'`)から導出**。理由: MUI X と同名で対象読者に馴染みがあり、DatePicker の
`locale` 既定 `'en-US'` と揃えれば SSR でも決定的で既存ストーリーも 12h のまま変わらないため。

**影響**: 非破壊(追加)。VRT: 24h ストーリーを追加。対象: TimePicker。

### B9: Snackbar host(キュー・自動消去・配置・入退場)

- **Issue**: #251(SN1)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `Snackbar` は見た目だけで、キュー・duration・配置・モーション・フォーカス復帰は利用者任せ。live region が内容と
  同時に挿入されるので読まれない支援技術がある。Compose は `SnackbarHost` + `SnackbarHostState.showSnackbar()`(1 件ずつ、
  Short 4s / Long 10s / Indefinite)。

**選択肢**

- **(a) `SnackbarProvider` + `useSnackbar().show()`**(Compose `SnackbarHostState`、notistack `enqueueSnackbar`、
  MUI Toolpad `useNotifications` と同じ形)
  ```tsx
  <SnackbarProvider>{app}</SnackbarProvider>
  const { show } = useSnackbar()
  const result = await show({ message: 'Deleted', actionLabel: 'Undo' })  // 'action' | 'dismiss' | 'timeout'
  ```
  duration 既定: action ありは indefinite、なしは short(4000ms)。hover / フォーカス中はタイマー停止(WCAG 2.2.1)。
  live region は Provider が常設して中身だけ差し替え。閉じたら直前のフォーカスへ戻す
- **(b) MUI core 流の宣言的 `<Snackbar open autoHideDuration onClose(event, reason)>`**(キューなし)
  - 利点: MUI 利用者に最も馴染む。欠点: 「同時に 1 件」を保証できず、live region 常設もできない
- **(c) (a) を正とし、(b) の宣言的 `open` も Provider のキューへ流す形で後から追加**

**推奨**: **(a)**(需要があれば (c) の宣言的モードを非破壊で追加)。理由: 仕様の要件(1 件ずつ・常設 live region・
フォーカス復帰)はアプリ全体で 1 つの host がないと満たせず、Compose と同じ構造になるため。`Snackbar` 自体は host が
使う見た目部品として残す(単体利用も可)。

**影響**: 非破壊(新規)。VRT: host ストーリー追加(モーションは VRT に写らない)。reduced motion はフェードのみ(B3)。
対象: Snackbar(新規 Provider / hook)。

### B10: 長い action を別行に置く

- **Issue**: #253(SN5)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 常に 1 行 flex で、狭い幅では message が潰れる。m3 は「長い action は 3 行目に」、Compose は
  `actionOnNewLine: Boolean = false`(自動判定なし)。

**選択肢**

- **(a) `actionOnNewLine?: boolean`**(Compose と同名)
- **(b) `layout?: 'inline' | 'stacked'`**
  - 利点: 将来の配置追加に開く。欠点: 現状 2 値しかなく過剰
- **(c) 自動判定**(overflow を測って切替)
  - 利点: 設定不要。欠点: どちらの仕様も求めていない、測定でレイアウトが揺れる

**推奨**: **(a)**。理由: 仕様どおりの明示的 opt-in で、boolean で十分意味が通るため。B9 の `show()` オプションにも同名で渡す。

**影響**: 非破壊。VRT: 新ストーリーのみ。対象: Snackbar。

---

## Tooltip

### B11: rich tooltip の操作性(キーボード到達)と persistent

- **Issue**: #257(TT1)、#261(TT6)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: trigger の blur で必ず閉じるため、Tab で rich tooltip の action に到達できない(フォーカスが `<body>` へ落ちる)。
  操作要素を含むのに `role="tooltip"` のまま(APG 非許容)。クリックで開き外側操作まで残る persistent 型もない。
  m3「Tooltip role, or similar」「persistent はクリック/タップでのみ表示、hover では出ない」、Compose `isPersistent`。

**選択肢**

- ロール(#257)
  - **(a) action 付き rich は非モーダル `role="dialog"` + `aria-labelledby`(subhead)**、action なしは `role="tooltip"` のまま
  - **(b) 常に `role="tooltip"`**(action は `aria-describedby` 経由の説明扱い)— APG 上は不適
- トリガー(#261)
  - **(c) `persistent?: boolean`**(m3 の用語・Compose `isPersistent`)
    ```tsx
    <Tooltip variant="rich" persistent subhead="New" text="…" action={<Button variant="text">Learn more</Button>}>
      <Button>Details</Button>
    </Tooltip>
    ```
    クリックでトグル、外側 pointerdown / Escape / フォーカス離脱で閉じる、hover では開かない
  - **(d) `trigger?: 'hover' | 'click'`**
    - 利点: 語が汎用。欠点: m3 / Compose の用語と対応しない
  - **(e) MUI 流の `disableHoverListener` / `disableFocusListener` + 利用者が ClickAway を実装**
    - 利点: MUI と同じ。欠点: 外側クリック dismiss を毎回書く

**推奨**: **(a) + (c)**。`persistent` の既定は false(既存挙動を変えない)。JSDoc で「action を持つ rich は `persistent` 推奨」
(Compose KDoc と同じ)を案内。フォーカスがラッパー内(trigger + tooltip)にある間は閉じない(`focusout` の
`relatedTarget` 判定)。理由: 仕様の用語と一致し、ロールも APG に適合するため。

**影響**: 公開 API は追加のみ。action 付き rich の a11y ロールが変わる(支援技術の読み上げが変わる)。VRT: 既存なし、
Persistent ストーリーを追加。対象: Tooltip(TT2 #258 / TT7 #262 と同じハンドラを触るので PR は直列に)。

### B12: rich tooltip の既定配置

- **Issue**: #259(API 判断部分)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 は rich を「親の右下」(desktop は中央下)、Compose の現行 provider は両 variant とも `Above` 既定、
  実装は両方 `top` 既定。スペック優先順位では rich = 下。

**選択肢**

- **(a) 現状維持**(両方 `top`)— Compose と一致、既定変更なし
- **(b) rich だけ `bottom` 既定**(plain は `top` のまま)
- **(c) (b) + `placement` に `bottom-start` / `bottom-end` 等を追加して m3 の「右下」も表現可能に**

**推奨**: **(b)**(`-start` / `-end` は要望が出たら (c) として追加)。理由: スペック優先順位 1 位の m3 が rich を下に置くと
明言しており、B4 の flip があれば画面下端でも破綻しないため。

**影響**: 既定値の変更(`placement` 未指定の rich が下に出る)。VRT: Rich ストーリーが変わる(#259 の幅修正と同じ PR で
`update-vrt-baselines`)。対象: Tooltip。

> **B38 で一部置換(2026-10-13)**: `placement` 未指定の rich は「下・中央」ではなく **bottom-end の角**(m3「bottom right
> of the parent element」)になった。「rich は下が既定」の部分は B38 でも維持。詳細は B38。

### B38: Tooltip の配置拡張(start / end / left / right)・rich の既定位置・caret

- **Issue**: #440
- **状態**: 決定(2026-10-13・#440 の提案どおり)
- **背景**: `TooltipPlacement = 'top' | 'bottom'`(中央揃え)のみ。m3 guidelines は「By default, rich tooltips are positioned
  to the **bottom right** of the parent element. They adjust position to avoid going off screen」「**Four different rich
  tooltip locations** based on dynamic positioning」。Compose `Tooltip.kt`(androidx-main): `TooltipAnchorPosition`
  (`:807`)= Above / Below / Left / Right / Start / End、`TooltipPositionProviderImpl`(`:899`)の Left / Right は
  anchor の横に**縦中央**で置き、はみ出すと反対側へ flip → clamp(`leftPositioning` / `rightPositioning`)、Start / End は
  `LayoutDirection` で Left / Right に読み替える。非推奨の `rememberRichTooltipPositionProvider`(`:641`)は
  `x = anchor.left`(start 揃え)→ 右端に当たれば `anchor.right - width`(end 揃え)→ それも左に当たれば中央。
  `TooltipBox`(`:167`、象限判定 `:186`–`:207`)は popup と anchor の位置から Top Left / Top Right / Bottom Left / Bottom Right の
  4 象限を判定している。caret は `caretShape: Shape? = null`(`PlainTooltip` `:345` / `RichTooltip` `:430`、既定なし)、
  `TooltipDefaults.caretSize = DpSize(16.dp, 8.dp)`(`:532`)、`DefaultTooltipCaretShape`(`:1343`)は幅 16・高さ 8 の
  三角形、`layoutCaret`(`:1193`)は anchor を向く辺に置き、上下配置では x を anchor 中央(`caretX` `:1164`)、
  左右配置では y を tooltip の縦中央にする。

**選択肢**

- **(a) `placement` に `'start' | 'end' | 'left' | 'right'` を追加、rich の既定は内部の「角」配置、`caret?: boolean`**
  ```tsx
  <Tooltip text="Hint" placement="end">…</Tooltip>              // RTL では左
  <Tooltip variant="rich" subhead="…" text="…">…</Tooltip>      // bottom-end の角、4 隅で動的に移動
  <Tooltip variant="rich" placement="bottom" …>…</Tooltip>      // 明示すれば従来どおり下・中央
  <Tooltip text="Hint" caret>…</Tooltip>
  ```
- **(b) (a) + `'bottom-end'` などの角の値も公開** — Floating UI 風に 12 値。表現力は増えるが、Compose にない値を公開型に
  持つことになり、4 隅の自動移動と「優先する角」の意味が衝突する
- **(c) caret を Compose どおり形(`caretShape`)で受ける** — Web では Shape オブジェクトに相当する慣習がない

**決定**: **(a)**。補足:

- **論理 / 物理**: `start` / `end` は RTL で反転(Compose Start / End)、`left` / `right` は物理のまま。どれも anchor の横に
  縦中央で置き、入らず反対側の方が広ければ flip、最後に viewport 内へ clamp(上下の B4 と同じ規則)。`data-placement` は
  実際に使った**物理側**(`top` / `bottom` / `left` / `right`)。
- **rich の既定(`placement` 未指定)**: 下・**start 揃え**(trigger の start 端に揃え、end 方向へ伸びる = LTR で右下)。下に
  入らなければ上へ、end 側へはみ出すなら **end 揃え**へ、それも入らなければ中央(非推奨の rich provider と同じ順)→ clamp。
  結果として 4 隅(bottom-end / bottom-start / top-end / top-start)のいずれかになる。RTL では揃えが反転する。`placement` を
  明示した rich は中央揃え(従来どおり)。plain の既定 `top`(中央)は変えない。
- **caret**: `caret?: boolean`(既定 `false` = Compose の `null`)。16×8dp の三角形を container 色で、anchor を向く辺に描き、
  anchor 中央を指す(位置は共有ヘルパーが `--_popup-anchor-x` / `-y` に書く)。角丸 + caret 幅の半分より内側に収める。
  **Web 適応**: Compose は caret があっても `SpacingBetweenTooltipAndAnchor`(4dp)のままで、高さ 8dp の caret が anchor に
  4dp 食い込む。m3 の「distance is 4dp」「Tooltips shouldn't cover the parent element」を優先し、caret 付きは
  **gap = 4 + 8 = 12px**(caret の先端と anchor の距離が 4dp)。caret は `::after` なので rich の影(elevation level 2)は
  caret に掛からない(Compose は Surface の shape に caret を合成するので影も付く — 見た目の差は軽微として許容)。
- **共有ヘルパー**: `usePopupPosition` に `side: 'left' | 'right' | 'start' | 'end'`、`flipAlign`(揃えの flip)、
  `trackAnchorCenter`(`--_popup-anchor-x/y`)を**オプトイン**で追加。既定値は従来どおりなので Menu / Select / SearchBar /
  DatePickerField の挙動は変わらない。

**影響**: 追加 prop・追加値は非破壊。`placement` 未指定の rich の位置が「下・中央」から「bottom-end の角」に変わる(既定値
変更)。VRT: 既存の Rich / Persistent ストーリーは `placement: 'bottom'` を明示して**従来と同一ピクセル**を保ち、新規
ストーリー(PlacementEnd / PlacementStartRtl / RichDefaultCorner / RichCornerFlip / Caret / RichCaret)を追加。対象: Tooltip、
`src/internal/usePopupPosition.ts`。

---

## ボタン系の選択

### B13: ButtonGroup の選択モデル

- **Issue**: #281(BGR7)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 Expressive は connected ButtonGroup を「単一 / 複数 / 選択必須」の選択に使い、baseline の segmented button を
  置き換えるとしている。現状 ButtonGroup は選択を持たず、各 `Button toggle` を手で配線する。`role="group"` は `{...rest}` の
  後にあり上書き不可。

**選択肢**

- **(a) ButtonGroup に選択モデルを追加**(MUI `ToggleButtonGroup` の `exclusive` / `value` / `onChange(event, value)` と同型)
  ```tsx
  <ButtonGroup variant="connected" selectionMode="single" value={view}
    onChange={(e, v) => setView(v)} selectionRequired>
    <Button value="day">Day</Button>
    <Button value="week">Week</Button>
  </ButtonGroup>
  ```
  `selectionMode: 'none'(既定) | 'single' | 'multiple'`。single は `role="radiogroup"` + 子 `role="radio"` / `aria-checked`
  + 矢印キー(BGR6 / SegmentedButton SG1 の裁定と同じ)、multiple は `aria-pressed` のボタン群
- **(b) 別コンポーネント(`ToggleButtonGroup` 等)**
  - 利点: 責務が分かれる。欠点: m3 では ButtonGroup の構成であり、1 コンポーネント方針に反する
- **(c) 現状維持 + ドキュメントで手配線を案内**
  - 利点: 実装 0。欠点: 単一選択が radiogroup として公開されない(a11y 指摘が残る)

**推奨**: **(a)**。理由: 仕様上 ButtonGroup の構成であり、Phase A の A2 / A4 の形をそのまま当てられるため。あわせて
`role` は `{...rest}` で上書き可能にする(既定値を先に置く)。値の型は single = `string | null`、multiple = `string[]`。

**影響**: 非破壊(既定 `'none'` で現行と同じ)。VRT: 新ストーリーのみ。対象: ButtonGroup(+ Button の `value` prop 受け取り)。

### B14: SegmentedButton の存廃(Expressive では「推奨されない」)

- **Issue**: 横断(segmentedbutton 監査の軽微欄、buttongroup 監査 BGR7)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 は「Expressive では segmented button は推奨されない、connected ButtonGroup を使う」と明記。Compose は
  `SegmentedButton` を非推奨にしておらず(Expressive トークンはないが motion scheme には追従)、コンポーネントの存在は
  Compose が決める(CLAUDE.md)。

**選択肢**

- **(a) 維持(現状どおり、特記なし)**
- **(b) 維持 + ソフト非推奨**: JSDoc と Storybook に「Expressive では `ButtonGroup variant="connected" selectionMode` を推奨」
  と明記。`@deprecated` タグは付けない(IDE の取り消し線を出さない)
- **(c) `@deprecated` を付けて v2 で削除**

**推奨**: **(b)**、削除は B13 の実装完了 **かつ** Compose が非推奨化した時点で再判断。理由: 「どのコンポーネントがあるか」は
Compose が決める方針で Compose は存続しているが、m3 の推奨先は利用者に伝えるべきため。

**影響**: なし(ドキュメントのみ)。対象: SegmentedButton。

### B15: SegmentedButton のアイコンのみセグメント

- **Issue**: #213(SG4)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `{ value, icon }`(label なし)のセグメントはアクセシブルネームを渡せず axe `button-name`。さらに選択時に
  check がアイコンを置き換え、どれも同じ見た目になる。m3 は「icon と label の両方があるときだけ icon を check に置換」、
  Compose は check を icon スロット、表示アイコンを label スロットに置くのでアイコンは消えない。

**選択肢**

- 名前の渡し方
  - **(a) option に `ariaLabel`**(FabMenu `ariaLabel`・IconButton `selectedAriaLabel` と同じ camelCase)
    ```tsx
    options={[{ value: 'cheap', icon: <PaidIcon />, ariaLabel: 'Inexpensive' }]}
    ```
  - **(b) option に `'aria-label'`**(HTML 属性名そのまま。オブジェクトリテラルで引用符が要る)
  - **(c) 子要素 API へ移行**(`<SegmentedButtonItem value aria-label>`)— 大きな破壊的変更
- 選択時の表示
  - **(d) アイコンのみなら check を出さずアイコンを維持**
  - **(e) check + アイコン**(Compose の構造と同じ。`showSelectedCheck` に従う)

**推奨**: **(a) + (e)**。理由: 既存の独自 prop 名(`ariaLabel`)と一致し、表示は m3 が規定しない部分を Compose に合わせる
(スペック優先順位どおり)ため。

**影響**: 非破壊。VRT: 既存にアイコンストーリーがないので新ストーリーのみ。対象: SegmentedButton。

---

## Chip

### B16: input chip の選択状態・avatar・ChipSet

- **Issue**: #184(CH4)、#185(CH5)、#189(CH10)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `variant="input"` に `selected` を渡しても黙って無視される(m3 / Compose `InputChip(selected)` は選択状態を持つ)。
  input chip の 24dp 円形 avatar スロットがない(18dp の `icon` のみ)。chip 間を矢印キーで移動する chip set がない
  (m3 キー表「Arrows: chip 間を移動」、material-web `md-chip-set`)。

**選択肢**

- (1) input の選択 API
  - **(a) filter と同じ `selected` / `defaultSelected` / `onChange(event, selected)`**(A2 / A4、`aria-pressed`、check は出さない)
  - **(b) controlled のみ(`selected` + `onClick`)**(Compose は選択を呼び出し側任せ)
- (2) avatar
  - **(c) `avatar?: ReactNode`**(MUI Chip と同名。input のみ有効、`icon` より優先、24dp 円形クリップ、disabled で 0.38)
  - **(d) `icon` を流用し `iconShape="avatar"`** — 意味が混ざる
- (3) chip set
  - **(e) `ChipSet` を新設**(roving tabindex + 矢印キー、Home / End)
    ```tsx
    <ChipSet aria-label="Filters">
      <Chip variant="filter" label="Open" /> <Chip variant="filter" label="Closed" />
    </ChipSet>
    ```
  - **(f) 作らない**(各 chip が個別の Tab 停止のまま、レイアウトは利用者の flex)

**推奨**: **(a) + (c) + (e)**。理由: (a) は同一コンポーネント内で API を揃えるため、(c) は MUI と同名で意味が明確なため、
(e) は m3 のキーボード要件を満たす受け皿がないと Chip 側の「境界キーを chip set へ伝播」が機能しないため。
ChipSet のロールは実装時の spec で確定する(起案者の傾き: APG Toolbar パターン — chip のボタン意味と `aria-pressed` を保てる。
m3 ラベル表の `gridcell` は remove ボタン付き input chip で 2 つのフォーカス先を扱うときに再検討)。

**影響**: すべて非破壊(追加・新規)。VRT: 選択 input / avatar / ChipSet のストーリーを追加。対象: Chip、新規 ChipSet。

### B36: ChipSet の単一 / 複数選択と filter chip の trailing icon(`endIcon`)

- **Issue**: #438
- **状態**: 決定(2026-10-13・#438 の API 案どおり。ARIA は実装時に下記で確定)
- **背景**: m3 chips/guidelines「filter chip は、1つを選ぶと set 内の他の chip が自動で解除されるように設定できる」
  「segmented button・radio button・単一選択メニューの代わりになる」。trailing icon は「filter chip では任意で、
  **メニューを開く**か chip を削除する」「filter chip はさらなる絞り込みのメニューを開ける」(menus/guidelines にも
  「メニューは filter chip から開ける」)。現状 `ChipSet` は矢印キーのロービングだけで選択モデルがなく、Chip の
  trailing は `removable` の × だけ。Compose には chip group の選択モデルがない(`FlowRow` + 呼び出し側の状態)。
  `FilterChip(trailingIcon)` は chip 全体のクリック面の中のスロット(Chip.kt:635–665、`SelectableChip` は
  `Role.Checkbox` — Chip.kt:3258)、余白は `ContentPadding` 8 + arrangement 8(Chip.kt:2241–2269)、色は
  `FilterChipTokens.*TrailingIconColor` = 非選択 on-surface-variant / 選択 on-secondary-container / disabled
  on-surface 0.38(FilterChipTokens.kt:179–210)。ドロップダウン矢印の回転は
  `ExposedDropdownMenuDefaults.TrailingIcon` の `rotate(if (expanded) 180f else 0f)`(ExposedDropdownMenu.kt:462–463)。

**選択肢**

- (1) 選択モデル
  - **(a) `ChipSet` に B13(ButtonGroup)/ B17(List)と同じ形を追加**
    ```tsx
    <ChipSet aria-label="Size" selectionMode="single" value={size} onChange={(e, v) => setSize(v)}>
      <Chip variant="filter" label="Small" value="s" />
      <Chip variant="filter" label="Medium" value="m" />
    </ChipSet>
    ```
    `selectionMode: 'none'(既定) | 'single' | 'multiple'`、値は single = `string | null`・multiple = `string[]`、
    `selectionRequired`(B13 と同じ)。`value` を持つ filter / input chip を set が管理し、chip 側の `selected` /
    `defaultSelected` は無視、chip の `onChange(event, selected)` は引き続き発火(Button の B13 実装と同じ)
  - **(b) 現状維持(各 chip を手で配線)** — 単一選択の排他性が支援技術に伝わらない
- (2) single の ARIA(APG)
  - **(c) Radio Group パターン**: set = `role="radiogroup"`、chip = `role="radio"` + `aria-checked`、選択中の chip が
    Tab 停止、←/→/↑/↓(折り返し)と Home / End でフォーカス移動と同時に選択
  - (d) Toolbar のまま `aria-pressed` — 排他であることが伝わらない(トグルボタンは独立した状態を表す)
  - (e) Listbox / option — option の中に remove ボタン等の操作要素を置けず(removable filter chip と両立しない)、
    m3 が web の chip に `listbox` を挙げていない
- (3) multiple の ARIA
  - **(f) 現行の Toolbar + `aria-pressed` のトグル chip を維持**(APG Toolbar はトグルボタンを含められる。
    ロービング・remove への矢印移動も現行どおり)
- (4) trailing icon
  - **(g) `endIcon?: ReactNode`(A5 の `startIcon` / `endIcon` 語彙)**: filter chip のみ、primary の `<button>` の
    内側に装飾(`aria-hidden`)として描く(Compose と同じく chip 全体が1つのクリック面)。開いているかは
    `Menu` が trigger に付ける `aria-expanded="true"` を CSS で読み 180° 回転 — Chip 側に `open` prop を足さない。
    `removable` のときは remove ボタンが trailing を占めるので無視
  - (h) 別のクリック可能な trailing ボタン — m3 の「メニューを開く」は chip の主アクションで足り、Tab / 矢印の
    停止点が増えるだけ

**決定**: **(a) + (c) + (f) + (g)**。理由: (a) はライブラリ内の選択グループ(ButtonGroup・List)と同じ形で書けるため。
(c) は m3 が単一選択 chip を「radio button の代わり」と位置づけ、APG で排他的な単一選択を伝えるのが radio group で
あり、B13 の single(radiogroup / radio)とも一致するため。(f) は複数選択では各 chip が独立したトグルで、既存の
toolbar の意味とキー操作を変えずに済むため(非破壊)。(g) は Compose `FilterChip(trailingIcon)` の構造どおりで、
Menu との合成が `trigger` だけで成り立つため。補足:

- 回転は SplitButton の chevron と同じく FastSpatial のスプリングで遷移させる(Compose の ExposedDropdown は
  瞬時。ライブラリ内のメニュー矢印の見え方を揃える判断。reduced motion では spatial トークンが 0ms)
- single で `value` を持たない chip(assist 等)は set の選択に入らず、通常のボタンのまま
- Menu の trigger にする chip は `selected` を controlled にすることを推奨(uncontrolled だとクリックのたびに
  選択がトグルする)— ドキュメントで案内
- docs/audits/chip.md 軽微欄の「chip set 内のロール(gridcell)は CH10 で再判断」「ドロップダウン矢印は将来の
  API 候補」は本裁定で置き換え(gridcell は採らない: grid パターンは chip の button 意味と `aria-pressed` を失う)

**影響**: 非破壊(既定 `selectionMode` なし = 現行どおり、`endIcon` は新規 prop)。VRT: `ChipSetSelection` /
`FilterEndIcon` / `FilterMenu` ストーリーを追加(既存ストーリーは不変)。対象: Chip、ChipSet。

---

## List と SwipeToDismiss

### B17: List の選択を支援技術へ公開

- **Issue**: #225(LS4)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `selected` は見た目(`data-selected`)だけで `aria-selected` 等がない。`role` prop は内側の `<div>`、`aria-*` は `<li>` に
  落ちるため、利用者が自力で `role="option" aria-selected` を足すと axe `aria-allowed-attr`。m3 は web の単一 / 複数選択リストを
  container `listbox` + item `option`(selected)と明記。Compose は項目全体に RadioButton / Checkbox ロール。

**選択肢**

- **(a) List レベルの選択モデル → `listbox` / `option`**
  ```tsx
  <List selectionMode="single" value={id} onChange={(e, v) => setId(v)} aria-label="Account">
    <ListItem value="a" headline="Personal" />
    <ListItem value="b" headline="Work" />
  </List>
  ```
  `ul role="listbox"`(multiple は `aria-multiselectable`)+ `li role="option" aria-selected`、矢印キー移動(LS8)
- **(b) 項目レベル(Compose 流)**: `ListItem selected` → `role="radio"` / `aria-checked`、`checked` → `role="checkbox"`
  - 利点: Compose と同構造。欠点: m3 の web 表記(listbox / option)と異なる、グループの `radiogroup` 付与を利用者が担う
- **(c) 最小修正**: `role` と `aria-*` を同じ要素に着地させ、ロールは利用者が組む
  - 利点: 小さい。欠点: 正しい組み方を利用者が知っている必要がある

**推奨**: **(a)**、加えて (c) の「`role` と `aria-*` を同じ要素に」も同時に直す。理由: m3 が web の役割を明示しており、
選択グループの A2 / A4 と同じ `value` / `onChange(event, value)` で書けるため。option の中に操作要素(trailing の Checkbox /
Switch 等)は置けない旨を JSDoc に明記(それらは選択モードではなく multi-action リスト)。

**影響**: 非破壊(既定 `selectionMode` なし = 現行どおり)。VRT: なし(ARIA のみ)。対象: List / ListItem(B21 と連動)。

### B18: Expressive リストの形・segmented・既定の見た目

- **Issue**: #224(LS3)+ 横断「baseline と Expressive のどちらを既定にするか」
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 は List を Expressive(推奨)と baseline(「Not recommended」)に分ける。実装は baseline のみ(角丸 0 固定、
  segmented なし)。Compose の既定 `ListItem` は Expressive の形(4 / 12 / 16dp のモーフ)、`SegmentedListItem` で segmented
  (surface container・2dp gap・外側 16dp)。

**選択肢**

- **(a) Expressive の形を既定 + `variant="standard" | "segmented"`**(baseline に戻す手段は持たない)
  ```tsx
  <List variant="segmented">…</List>   // index / count は List が導出
  ```
- **(b) baseline を既定、Expressive は opt-in(`expressive` prop 等)**
  - 利点: 既存の見た目が変わらない。欠点: m3 が非推奨とする方を既定にする
- **(c) (a) + baseline の逃げ道(`shape="baseline"` 等)**
  - 利点: 移行の安全弁。欠点: 非推奨の見た目を API として恒久化

**推奨**: **(a)**。standard の container は透明のまま。理由: m3 が Expressive を推奨し Compose の既定もそれで、
standard では角丸は状態レイヤー / 選択背景が出たときにしか見えないため既存画面への影響が小さい。モーフのばねは
B2 の FastSpatial、reduced motion は B3(即時)。

**影響**: 見た目の変更(選択行・hover の角丸)。VRT: `Interactive` の選択行が 16dp 角に、segmented ストーリー追加
(`update-vrt-baselines`)。対象: List / ListItem。

### B19: SwipeToDismiss のライフサイクル(通知タイミング・reset・プログラム dismiss)

- **Issue**: #293(SW4 + SW5)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `onDismiss` がリリース直後(退場アニメ前)に発火し、ストーリーでは行が即 DOM から消える。dismiss 後に戻す手段・
  プログラムで dismiss する手段がなく、ジェスチャも有効なまま(再度 `onDismiss` が発火し得る)。Compose は settle 後に
  `onDismiss`、`reset()` / `dismiss(direction)`、dismiss 後はジェスチャ無効。m3 は「スワイプには代替操作を」。

**選択肢**

- 通知タイミング(全案共通で確定したい): `onDismiss(direction)` は **退場の `transitionend` 後**(reduced motion では即時)
- 状態の持ち方
  - **(a) controlled / uncontrolled の `dismissed`**(A4)
    ```tsx
    const [dismissed, setDismissed] = useState<SwipeDismissDirection | null>(null)
    <SwipeToDismiss dismissed={dismissed} onDismissedChange={setDismissed}
      onDismiss={(dir) => remove(id)} />
    // Cancel: setDismissed(null) → 元の位置へ戻るアニメ / 代替ボタン: setDismissed('end-to-start') → 退場アニメ
    ```
  - **(b) MUI 流の `action` ref**(MUI `ButtonBase` / `Popover` の `action` prop)
    ```tsx
    const actions = useRef<SwipeToDismissActions>(null)
    <SwipeToDismiss action={actions} />  // actions.current.reset() / .dismiss('end-to-start')
    ```
    - 利点: 稀な操作だけ命令型で軽い。欠点: 状態が外から見えず A4 の原則から外れる
  - **(c) 両方**

**推奨**: **通知タイミングの修正 + (a)**。dismiss 中・dismiss 後はジェスチャ無効。理由: A4(stateful prop は controlled /
uncontrolled)に沿い、confirm / cancel フローも代替ボタンからの dismiss も同じ 1 つの state で書けるため。

**影響**: `onDismiss` の発火タイミング変更(退場後になる — 同期発火に依存した利用者には挙動変更)。API は追加。
VRT: 既存なし、代替ボタンのストーリーを追加。対象: SwipeToDismiss。

### B20: スワイプ方向ごとの背景

- **Issue**: #294(SW6)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: `background` は静的な ReactNode で方向も進捗も知らない。Compose は state(`dismissDirection` / `targetValue` /
  `progress`)で左右別の背景を描くよう KDoc で勧める。

**選択肢**

- **(a) render 関数 `background={({ direction, target, progress }) => …}`**
  - 利点: 最も柔軟。欠点: ドラッグ中に毎フレーム再レンダー
- **(b) CSS フックのみ**: ルートに `data-direction` / `data-target`、進捗を CSS 変数で公開
  - 利点: 再レンダーなし。欠点: 中身(アイコン・文言)を方向で変えるのは CSS だけでは不便
- **(c) 方向別の静的スロット `startToEndBackground` / `endToStartBackground`**(既存 `enableStartToEnd` / `enableEndToStart`
  と同じ語)+ (b) の CSS フック
  ```tsx
  <SwipeToDismiss startToEndBackground={<ArchiveBg />} endToStartBackground={<DeleteBg />}>…</SwipeToDismiss>
  ```

**推奨**: **(c)**(`background` は両側共通の既定として残す)。理由: 典型用途(左右で別アクション)を宣言的に書け、
閾値到達時の色変化は CSS フックで再レンダーなしに表現できるため。

**影響**: 非破壊。VRT: 静止状態は背景が隠れるので差分なし。対象: SwipeToDismiss。

### B21: List の中で list 構造を壊さない

- **Issue**: #295(SW7)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 推奨の `<List><SwipeToDismiss><ListItem/></SwipeToDismiss></List>` が `ul > div > div > li` になり、実ブラウザ axe で
  `list` / `listitem` 違反。

**選択肢**

- **(a) `component` prop(`component="li"`)で root を li に、ListItem 側も非 li にできるようにする**
  - 利点: 明示的。欠点: 利用者が 2 箇所を正しく組む必要、ポリモーフィック型(B5 の横断論点)に踏み込む
- **(b) ドキュメントのみ**(`<li>` の中に置け)
  - 利点: 実装 0。欠点: ListItem は常に `<li>` なので現状は正しく組めない
- **(c) context で自動**: List の中の SwipeToDismiss は root を `<li>` で描き、その中の ListItem は `<div>` で描く
  - 利点: 推奨の書き方のまま正しくなる。欠点: context の暗黙挙動

**推奨**: **(c)**。理由: 推奨の書き方を変えずに WCAG 1.3.1 を満たせ、利用者が構造を意識しなくてよいため。B17 の
`option` ロールや `aria-selected` も外側の `<li>` に載せる(ListItem が context でそれを受け渡す)。List 構成の axe テストを追加。

**影響**: DOM 構造のみ変化(List 内で使った場合)。VRT: 間隔が変わらないことを PR で確認。対象: SwipeToDismiss / ListItem。

---

## ナビゲーション・FAB

### B22: ナビ項目の選択時アイコン(`selectedIcon`)

- **Issue**: #174(NB6、NavigationBar / NavigationRail 共通)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 は選択中を塗り(filled)アイコン、その他を outlined にするよう求める。項目は `icon` 1 つだけで、親の値から全項目を
  描き直さないと実現できない。

**選択肢**

- **(a) `selectedIcon?: ReactNode`**(Switch / IconButton と同名。未指定は `icon` にフォールバック)
  ```tsx
  <NavigationBarItem value="home" icon={<HomeOutlined />} selectedIcon={<Home />} label="Home" />
  ```
- **(b) render 関数 `icon={(selected) => …}`**(Compose のラムダに近い)
  - 利点: 柔軟。欠点: A5 で維持した `selectedIcon` の慣習と不一致
- **(c) 現状維持**(利用者が親の値で切替)

**推奨**: **(a)**。理由: A5 で「状態別アイコンは `selectedIcon`」と決めた命名がそのまま使えるため。

**影響**: 非破壊。VRT: ストーリーを filled / outlined の組に更新するとベースライン変更(NavigationBar/Default、
NavigationRail/*)。対象: NavigationBar / NavigationRail。

### B23: モーダルの展開 NavigationRail

- **Issue**: #180(NR6)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: rail は `collapsed` / `expanded` のみで、expanded は常にコンテンツの横。m3 は Expanded layout に Modal、
  Expanded behavior に「Hide when collapsed」を持つ。Compose `ModalWideNavigationRail(hideOnCollapse)`(スクリム 0.32、
  Escape / スクリムで閉じる)。

**選択肢**

- **(a) `modal?: boolean` + `hideOnCollapse?: boolean` + `onClose`**(A3 のモーダル系、`useModal` を使用)
  ```tsx
  <NavigationRail variant={open ? 'expanded' : 'collapsed'} modal hideOnCollapse
    onClose={() => setOpen(false)} value={route} onChange={…}>…</NavigationRail>
  ```
- **(b) `variant` に `'modal'` を追加**(`'collapsed' | 'expanded' | 'modal'`)
  - 利点: prop が増えない。欠点: modal は「展開時のレイアウト」で折りたたみ状態と直交するのに 1 軸に押し込む
- **(c) 別コンポーネント `ModalNavigationRail`**(Compose 流)— 1 コンポーネント方針に反する

**推奨**: **(a)**。理由: 開閉(`variant`)とレイアウト(`modal`)が直交したまま表現でき、A3 のモーダル系 `onClose` と整合するため。
影は m3 どおり level 2(Compose は Level2 を適用しないが面が重なるため site に従う — 監査の裁定どおり)。

**影響**: 非破壊。VRT: 開いた modal のストーリー追加(G4 に従い open 状態で撮る)。対象: NavigationRail。

### B24: FabMenu — トグルの名前を固定、medium / large 対応

- **Issue**: #203(FM4)、#208(FM9)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 開くとトグルの `aria-label` が `closeAriaLabel`("Close menu")に入れ替わる(`aria-expanded` と二重)。APG / m3 /
  Compose は名前固定 + 状態を別に伝える。トグルは 56dp・tonal 配色固定で、m3 / Compose の medium(80)/ large(96)がない。

**選択肢**

- (1) 名前
  - **(a) `closeAriaLabel` を deprecated にして無視**(開閉とも `ariaLabel`、状態は `aria-expanded`。dev 警告、v2 で削除)
  - **(b) 即削除**(型から消す — 破壊的)
  - **(c) 現状維持**
- (2) サイズ・配色
  - **(d) `size?: 'regular' | 'medium' | 'large'`(Fab の語彙、A1)+ `tonal?: boolean`(A6、既定 true)**
    ```tsx
    <FabMenu size="large" color="primary" tonal={false} ariaLabel="Create" icon={<Add />}>…</FabMenu>
    ```
  - **(e) 56dp 固定のまま**

**推奨**: **(a) + (d)**。理由: 名前固定は a11y 上の正解で、prop を残せば型の破壊を避けられるため。サイズ / 配色は Fab と
同じ語彙で追加するだけで済むため。

**影響**: (a) は読み上げのみ変化(型は非破壊)、(d) は非破壊。VRT: medium / large ストーリーを追加。対象: FabMenu。

---

## AppBar・Toolbar

### B25: AppBar / Toolbar のスクロール連動

- **Issue**: #233(AB1)、#243(TL5)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: どちらもスクロールを観測しない。m3: AppBar はスクロールで container を surface-container に、隠す / 再表示、
  medium / large は small へ畳む。Toolbar は画面外へ退避、floating は 1 つの主アクションへ畳む。Compose は
  `pinned` / `enterAlways` / `exitUntilCollapsed` / `exitAlways` の scroll behavior。

**選択肢**

- **(a) フック + 状態 prop**(MUI `useScrollTrigger` 流。コンポーネントは表示状態だけを受け取る)
  ```tsx
  const scrolled = useScrollTrigger({ target, threshold: 0 })
  <TopAppBar scrolled={scrolled} />
  ```
  - 利点: 疎結合・テスト容易。欠点: collapse の連続値(`collapsedFraction`)まで利用者が配線
- **(b) コンポーネントが観測**: `scrollBehavior="pinned" | "enterAlways" | "exitUntilCollapsed"` + `scrollTarget`(既定 window)
  - 利点: 1 行で仕様どおり。欠点: 制御の余地が少ない
- **(c) 二層**: 状態 prop(TopAppBar `scrolled` / `collapsed` / `hidden`、Toolbar `expanded` / `defaultExpanded` /
  `onExpandedChange` / `hidden`)を正とし、その上に (b) の便利 prop を同じ内部フックで提供
  ```tsx
  <TopAppBar variant="large" scrollBehavior="exitUntilCollapsed" scrollTarget={contentRef} />
  <Toolbar variant="floating" scrollBehavior="exitAlways" />
  ```

**推奨**: **(c)**。理由: 典型用途は (b) の 1 行で済み、特殊な連動(独自スクロール容器・外部状態)は状態 prop で制御でき、
A4 の controlled / uncontrolled とも合うため。

- `scrollBehavior` 指定時のみ `position: sticky; top: 0`(上書き可)。未指定なら現行どおり
- 画面外の項目は `inert` でフォーカス順から外す。スクリーンリーダー向けに常に展開を保つ手段は JSDoc で案内
- Toolbar の FAB 合成は内蔵しない(m3「他プラットフォームでは各コンポーネントを個別に追加」)
- 色遷移・スナップは reduced motion で即時(B3)。色変化のみで影は付けない(監査の裁定)

**影響**: 非破壊(既定は常時表示・展開)。VRT: 既存不変、スクロールストーリーを追加。対象: TopAppBar / Toolbar。

### B26: AppBar の Expressive 構成(flexible・subtitle・配置)

- **Issue**: #238(AB6)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: variant は baseline の `small` / `center` / `medium` / `large` のみ、subtitle なし。m3 は baseline medium / large を
  「Not recommended — flexible を使う」とし、配置(leading / centered)は全 variant の構成、center-aligned は「small に統合」。
  Compose は `MediumFlexibleTopAppBar` / `LargeFlexibleTopAppBar` と `titleHorizontalAlignment`。

**選択肢**

- variant
  - **(a) `mediumFlexible` / `largeFlexible` を追加**(baseline も残す)
    - 利点: 非破壊。欠点: 非推奨の方が短い名前を持ち続ける
  - **(b) `medium` / `large` を flexible に置き換え**(baseline medium / large は廃止)
    - 利点: 仕様の推奨が既定。欠点: 見た目の破壊的変更(高さ・タイポ)
- 配置
  - **(c) `titleAlignment?: 'start' | 'center'` を追加し、`variant="center"` は `variant="small" titleAlignment="center"` の
    deprecated エイリアスとして 1 リリース維持**(A7 と同じ移行法)
  - **(d) `variant="center"` のまま**(medium / large では中央配置できない)
- subtitle: **`subtitle?: ReactNode`**(small = LabelMedium、medium flexible = LabelLarge、large flexible = TitleMedium、
  色 on-surface-variant)は全案共通

```tsx
<TopAppBar variant="large" title="Inbox" subtitle="3 unread" titleAlignment="center" />
```

**推奨**: **(b) + (c) + `subtitle`**。理由: Expressive ライブラリとして仕様の推奨を既定にすべきで、配置は m3 / Compose とも
「variant ではなく構成」になっているため。v1 後の最初の破壊的変更バッチ(マイグレーションガイド付き)で行う。

**影響**: 破壊的(medium / large の見た目、`variant="center"` の deprecated 化)。VRT: Medium / Large のベースライン変更と
subtitle / centered ストーリー追加(`update-vrt-baselines`)。対象: TopAppBar。

### B27: BottomAppBar の扱い

- **Issue**: 横断(appbar / toolbar 監査の軽微欄)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: m3 は「Bottom app bar(not recommended)。docked toolbar を使う」。Compose の `BottomAppBar` は非推奨ではない。

**選択肢**

- **(a) JSDoc で「新規には `Toolbar variant="docked"` を推奨」と案内、deprecated 化は v2 の API 整理で再判断**
- **(b) 今 `@deprecated`**
- **(c) 何もしない**

**推奨**: **(a)**。理由: B14 と同じ考え方で、存在は Compose に従い、推奨先は m3 に従って利用者に伝えるため。

**影響**: なし(ドキュメントのみ)。対象: BottomAppBar。

### B30: Search app bar(`TopAppBar variant="search"`)

- **Issue**: #393
- **状態**: 決定(2026-10-07・#393 の API 案どおり。実装時に補足事項を確定)
- **背景**: m3 の app bar 4 種のうち Search app bar だけがない。m3「search field instead of heading text」「icons inside and
  outside」「centered text」「opens the search view」。Compose は `AppBarWithSearch(state, inputField, navigationIcon,
  actions, colors, scrollBehavior)`(SearchBar.kt)で、入力欄は `SearchBarDefaults.InputField`、展開は別の
  `ExpandedDockedSearchBarWithGap` / `ExpandedFullScreenContainedSearchBar` に同じ `SearchBarState` を渡す。

**選択肢**

- **(a) `variant="search"` + `searchBar` スロット**(issue 案)
  ```tsx
  <TopAppBar
    variant="search"
    navigationIcon={<IconButton … />}
    actions={<Avatar />}
    searchBar={<SearchBar placeholder="Search product" startIcon={false} open={open} onOpenChange={setOpen}>{results}</SearchBar>}
  />
  ```
  - 利点: 単一コンポーネント + variant(API 方針どおり)、外側アイコンは既存 `navigationIcon` / `actions`、内側アイコン・
    開閉・値は SearchBar の既存 API をそのまま使う(状態モデルを増やさない)。Compose の `inputField` スロットと同じ構造
  - 欠点: SearchBar を合成する分コードが 1 段深い
- **(b) TopAppBar に検索専用 prop**(`searchValue` / `onSearch` / `searchPlaceholder` / `searchResults` …)
  - 利点: 1 要素で書ける。欠点: SearchBar の prop を二重に持つことになり、追加のたびに同期が必要
- **(c) 別コンポーネント `SearchAppBar`** — Compose 流だが「variant で選ぶ」方針に反する

**決定**: **(a)**。補足:

- `titleAlignment="center"` → 検索欄のテキスト / placeholder を中央揃え(m3 Expressive の centered text)。center 用の
  タイトル grid は使わない
- `title` は**視覚的に隠した `<h1>`**(ページ見出しを支援技術に残す。省略時は見出しなし)、`subtitle` は描かない。
  m3 は見出しテキストの代わりに検索欄を置くとするため、見える見出しは出さない
- SearchBar 側に**非破壊の小さな追加**: `startIcon={false}` で内側の leading icon を消す(MUI `Alert icon={false}` と同じ慣習。
  テキストは 24dp から — m3 寸法図)、およびホスト用カスタムプロパティ `--md-search-bar-container-color` /
  `--md-search-bar-width` / `--md-search-bar-min-width` / `--md-search-bar-input-text-align`(IconButton の
  `--md-icon-button-*` と同じ契約方式)
- `scrollBehavior` / `scrolled` / `hidden` は他の variant と共通(単一行なので `exitUntilCollapsed` は `pinned` 相当)。
  検索ビューは SearchBar の docked contained view(~~full-screen レイアウトは未実装 — searchbar 監査の機能候補のまま~~ →
  B39 で SearchBar `layout="fullscreen"` を追加。search app bar の `searchBar` にもそのまま渡せる)

**影響**: 非破壊(新しい variant 値・新しい prop・SearchBar の追加のみ)。VRT: Search 系ストーリー追加。対象: TopAppBar,
SearchBar。数値と裁定は docs/audits/appbar.md「Search app bar」節。

---

### B39: SearchBar の full-screen レイアウト(`layout="fullscreen"`)

- **Issue**: #442
- **状態**: 決定(2026-10-13・#442 の API 案どおり。実装時に補足事項を確定)
- **背景**: m3 search/specs「two layout options: full-screen and docked」。SearchBar は docked のみだった(searchbar 監査の
  軽微欄・B30 で「full-screen は未実装」と記録)。Compose は full-screen を compact 画面の既定とし、
  `ExpandedFullScreenSearchBar`(SearchBar.kt:812、divided — 全画面に広がる面 + `HorizontalDivider`)と
  `ExpandedFullScreenContainedSearchBar`(SearchBar.kt:698、`@material3expressive` — 入力欄が畳んだ形のまま、divider なし)の
  2 種を持つ。どちらも全画面 dialog(`BasicEdgeToEdgeDialog`、:905)で、`FullScreenSearchBarScaffoldSample`
  (samples/SearchBarSamples.kt:118)は contained 版 + 展開時に leading を戻る矢印の IconButton(:277、「Back」)に差し替える。

**選択肢**

- **(a) `layout?: 'docked' | 'fullscreen'`**(issue 案・m3 の語「layout」)
  - 利点: m3 の用語どおり、将来の値(例: 画面幅で自動切替の `'auto'`)を足せる。variant 方式の API 方針と同じ「列挙 prop で選ぶ」形
- **(b) `fullScreen?: boolean`**(MUI `Dialog fullScreen` 風) — 2 値で閉じてしまい、拡張できない
- **(c) 別コンポーネント `FullScreenSearchBar`** — 「1 MD3 コンポーネント = 1 コンポーネント」の方針に反する

**決定**: **(a)**。補足:

- **既定は `'docked'`**(従来どおり・非破壊)。Compose の「compact では full-screen」は画面幅依存の推奨なので、自動切替はしない
  (利用側がメディアクエリで `layout` を選ぶ。docs に記載)
- **スタイルは contained(Compose `ExpandedFullScreenContainedSearchBar`)を採用**。理由: Compose の公式 sample と
  Expressive 版がこちら、本ライブラリの docked view も contained(`ExpandedDockedSearchBarWithGap`)を正としている
  (searchbar 監査「divided は Not recommended. Use contained」)。divided(全画面の面 + divider)は実装しない
- 数値(すべて Compose SearchBar.kt、`FullScreenSearchBarLayout` :3777 の `isContained = true` 分岐):
  面 = `fullScreenContainedSearchBarColor` = **surface-container-low**(:2037、TODO 付きの直値)・シェイプ none、
  入力欄 = 56dp の stadium のまま **surface-container-high**(`collapsedContainedSearchBarColor` :2031)、
  展開後の入力欄は上 **4dp**(`AppBarWithSearchVerticalPadding` :4165)・左右 **8dp**(`FullScreenExpandedHorizontalPadding` :4171)、
  結果は入力欄の **8dp** 下(`SearchBarVerticalPadding` :4181)から全幅・divider なし、window insets は `safeDrawing`
  (→ `env(safe-area-inset-*)`)
- モーション(`rememberContainedSearchBarState` :1674): 展開・収納とも **FastSpatial**。入力欄はバーの位置・幅から上端へ移動し、
  面は同じ progress で alpha 0→1(Compose は spatial の 1 本の animatable で alpha も駆動するので、opacity も fast-spatial
  トークンに揃えた — 記録)、結果は contentProgress(100ms・50ms 遅延・standard accelerate / 退出 100ms・standard decelerate、
  :4230 — docked view と同じ tween)。収納中は元のバーを隠す(AppBarWithSearch の `isVisible` :624 — 入力欄の二重表示を防ぐ)。
  reduced motion(B3)は位置を動かさず全体のフェードのみ(fast-effects)
- **前面化**: view は `popover="manual"` の top layer に出す(B4 と同じ仕組み)。`TopAppBar` の hide(`transform`)や祖先の
  `overflow` / `z-index` に閉じ込められないため。インラインに置く(ポータルなし)のでテーマのトークンは継承される
- **モーダル挙動**: `useModal`(focus trap・背景 inert・body スクロールロック・`onEscape`)。初期フォーカスは view の入力欄
  (`data-autofocus`)、閉じたらバーの入力へ戻す(起動元が外部ボタンならそこへ — useModal の既定。戻し先が失われた場合はバーの入力)
- **開くきっかけ**: クリック(Compose の「畳んだ入力欄のクリックで展開」)・入力・ArrowDown。**Tab でのフォーカスだけでは開かない**
  (モーダルが Tab 移動で開くと抜けられなくなる。Compose もキーボード操作時はフォーカス ≠ 展開)。docked はフォーカスで開く(従来どおり)
- **戻るボタン**: 展開中の leading は常に戻る矢印の `IconButton`(standard)。利用側の `startIcon`(`false` を含む)は畳んだバー
  だけに効く。名前は B1 に従い **`backLabel`**(既定 `'Back'` = Compose sample の contentDescription)。RTL では矢印を反転
- **ARIA**: バーの入力は `role="combobox"` + `aria-haspopup="dialog"` + `aria-expanded` + `aria-controls`(dialog)。
  view は `role="dialog"` `aria-modal="true"`(名前は `inputProps['aria-label']` か placeholder)、中の入力欄が結果に対する
  combobox(`aria-controls` = 結果、`aria-autocomplete="list"`)。`suggestionsLabel` の告知は dialog 内の live region から
- **イベントの対応**: `value` / `onChange` / `onSearch` / `onKeyDown` は view の入力欄にも効く(同じクエリの 2 つ目の表示)。
  `onFocus` / `onBlur` / `inputRef` / `name` はバーの入力のみ(view の入力はフォームに参加しない)

**影響**: 非破壊(新しい prop 2 つと型 `SearchBarLayout` の追加のみ。docked の DOM・見た目は不変)。VRT: SearchBar
`FullScreen` / `FullScreenOpen`、AppBar `SearchFullScreenOpen` の追加。対象: SearchBar(AppBar `variant="search"` は
合成した SearchBar に `layout="fullscreen"` を渡すだけで動く)。内部: `usePopupPosition` の top layer ヘルパーを export、
`internal/icons` に `ArrowBackIcon`。

---

## 表示系の a11y

### B28: Badge のアクセシブルラベルと非表示時の扱い

- **Issue**: #265(BG1 + BG2)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: dot badge は `role="status"` で名前なし、数値 badge は英語直書き `"{n} notifications"` の `aria-label`(上書き不可)。
  `role="status"` で全 badge が live region になるが、m3 / Compose とも求めていない。`visible={false}` でも AT に読まれる。
  m3「数えない badge は New notification と読む」、Compose サンプル「8 new notifications」。

**選択肢**

- ラベル
  - **(a) visually-hidden テキストで既定英語ラベル + `label` で上書き**(可視の数字は `aria-hidden`)
    ```tsx
    <Badge value={8} label="新着 8 件">…</Badge>   // 既定: "New notification" / "8 new notifications"
    ```
  - **(b) Badge は `aria-hidden`、ラベルはアンカー側(IconButton の `aria-label`)で利用者が付ける**(MUI ドキュメントの流儀)
    - 利点: 読み上げが 1 つにまとまる。欠点: 既定で何も伝わらず、利用者が忘れやすい
- live region
  - **(c) `role="status"` を廃止**(必要なら利用者がアプリ側で通知)
  - **(d) opt-in で残す**(`live` prop)
- 非表示: `visible={false}` は scale-out 後に `visibility: hidden`(AT からも消える)— 全案共通

**推奨**: **(a) + (c)**。ラベル prop 名は B1 の規約に従う(文字列 `label`。値依存の関数が必要なら `getLabel`)。理由: 既定で
m3 の読み上げになり、上書きで i18n でき、読まれない live region を撒かずに済むため。ナビ項目のバッジ(#175)も同じ文言を再利用。

**影響**: a11y ツリーのみ(読み上げの変更)。型は追加のみ。VRT: なし(visually-hidden はレイアウトに影響させない)。
対象: Badge、NavigationBar / NavigationRail のバッジ。

### B29: Divider を既定で装飾扱いに

- **Issue**: #267(DV1)
- **状態**: 決定(2026-09-30・推奨どおり)
- **背景**: 全 Divider が `<hr role="separator" aria-orientation>` で毎回「区切り」と読まれる。m3「Divider は装飾要素」、
  Compose は semantics なし。`<hr>` の `role="separator"` は冗長。

**選択肢**

- **(a) 既定 decorative(AT から隠す)+ `decorative={false}` で意味付き区切り**(Radix `Separator` の `decorative` と同名)
  ```tsx
  <Divider />                        // aria-hidden
  <Divider decorative={false} />     // <hr>(暗黙の separator)、縦のときだけ aria-orientation="vertical"
  ```
- **(b) 既定は意味付き(現状)、`decorative` で opt-in**(MUI Divider は `<hr>` のまま)
  - 利点: 挙動変更なし。欠点: m3 / Compose の「装飾」と逆
- **(c) prop を足さず、利用者が `role` / `aria-hidden` を渡す**

**推奨**: **(a)**。理由: 挙動はスペック(m3・Compose とも装飾)に従い、`decorative` は既存の Web 慣習(Radix)と同名で
意図が伝わるため。MenuDivider(`role="menu"` 内の separator)は対象外で現状維持。

**影響**: a11y ツリーのみ(区切りが読まれなくなる)。VRT なし。対象: Divider(SideSheet の `showDivider` 等の内部利用も含む)。

---

## シート

### B35: BottomSheet の standard variant と detent(部分展開 / 全展開)

- **Issue**: #437
- **状態**: 決定(2026-10-13・#437 の API 案を実装時に確定。同日、v1 では部分展開を opt-in とする互換条件を追加)
- **背景**: BottomSheet はモーダル・単一の高さのみだった。m3 は「Two variants: standard and modal」「Standard bottom sheets
  co-exist with the screen's main UI region」「preset positions from full-screen height to preview」「toggled between a
  collapsed and expanded state」。Compose は `ModalBottomSheet` / 非モーダルの `BottomSheet`(BottomSheet.kt)/
  `BottomSheetScaffold`(BottomSheetScaffold.kt:116、スクリムなし)と `SheetValue.Hidden / PartiallyExpanded / Expanded`
  (`skipPartiallyExpanded`)を持つ。SideSheet・NavigationDrawer は既に `variant: 'standard' | 'modal'`。

**選択肢**

- **(a) `variant` + `expanded` / `defaultExpanded` / `onExpandedChange(expanded)` + `skipPartiallyExpanded`**
  - 利点: 隠す / 出すは既存の `open` / `onClose`(A3)のまま、見えている間の 2 状態だけを boolean で持つ。Toolbar の
    `expanded` / `defaultExpanded` / `onExpandedChange` と同じ形(値のみのコールバック)。`skipPartiallyExpanded` は Compose と同名
  - 欠点: detent が 3 つ以上に増えたら別 prop が要る(Compose・m3 とも可視 detent は 2 つ)
- **(b) `detent: 'partial' | 'full'` / `onDetentChange`** — 拡張性はあるが、`open` と hidden の二重表現になりやすい
- **(c) Compose 流の `sheetState` オブジェクト** — Compose 専用の形で API 方針に反する

**決定**: **(a)**。補足:

- **`variant="standard" | "modal"`、既定 `'modal'`**(既存利用者の挙動を保つ)。standard はスクリム・フォーカストラップ・
  inert・スクロールロックなし(`useModal` を使わない)、`role="region"`(既定名 "Bottom sheet")、`aria-modal` なし。
  **最も近い position 指定祖先の下端に `position: absolute` で置く**(Compose `BottomSheetScaffold` の「scaffold 内の
  レイアウト」に相当。ビューポートに固定したい場合は fixed のコンテナに入れる)。standard はフォーカスが内側にあるときだけ
  Escape で `onClose(event, 'escapeKeyDown')`(Compose `BottomSheet` の `backHandlerEnabled` 既定 true に相当)
- **部分展開の高さ = `min(fullHeight / 2, sheetHeight / 2)`**(シートの半分、最大で画面 / コンテナの半分)。Compose の現行既定
  `ComposeMaterial3Flags.isBottomSheetPartiallyExpandedDeterministicEnabled = true`(ComposeMaterial3Flags.kt:114)での
  `calculatePartiallyExpandedOffset`(BottomSheet.kt:427-440、androidx commit `02b1dbca`, 2026-09-30)。CSS では
  ルートを size container にして `translateY(max(50%, 100% - 50cqh))` で表す(計測不要・SSR 安全)
  - **注意(TODO)**: このフラグには `// TODO: b/512076811` が付いており、Compose 側でまだ確定扱いではない。旧挙動(フラグ
    false)は「シートが画面の半分以下なら部分展開を自動で除外、ある場合は画面の 50% 位置」で、非推奨の
    `rememberModalBottomSheetState` / `rememberStandardBottomSheetState` は今も旧挙動を固定で渡す(ModalBottomSheet.kt:251、
    BottomSheetScaffold.kt:238)。m3.material.io は「preview」位置の高さを数値で規定していない。フラグが撤回・変更されたら
    本裁定を見直す
- **v1 では部分展開は opt-in**: **`skipPartiallyExpanded` の既定は `true`**(常に全展開で開き、ハンドルは従来どおり閉じる
  ボタン・既定ラベル "Close")。v1.1.0 以降の「v2 まで既定の挙動を壊さない」方針(本書冒頭の裁定条件)に従うため。
  `skipPartiallyExpanded={false}` を渡すと Compose の現行既定 — `show()` が PartiallyExpanded を優先する
  (SheetDefaults.kt:283-289)— どおり部分展開で開く(`defaultExpanded` 既定 false)。uncontrolled のシートは閉じるたびに
  初期 detent に戻る(`show()` 相当)。**既定を Compose どおり(部分展開が先)に切り替えるのは v2 の候補**(上記 TODO
  フラグの確定を待って判断する)
- **ドラッグ**: hidden / partial / expanded の 3 アンカー間でスナップ。Compose の `AnchoredDraggable` と同じ判定 —
  開始 detent から 56px(`PositionalThreshold`)を超えたら隣の detent、125px/s(`VelocityThreshold`)を超える fling は
  その方向で最も近い detent。hidden に達したら `onClose(event, 'drag')`
- **ドラッグハンドル(キーボード操作)**: 部分展開を有効にしたとき(`skipPartiallyExpanded={false}`)は
  **partial ↔ expanded をトグルするボタン**(`aria-expanded`、既定ラベル "Drag handle")。Compose `BottomSheet` のハンドルクリックは Expanded → 閉じる、`BottomSheetScaffold`
  (skipHiddenState)は Expanded → PartiallyExpanded で、Web では閉じる手段は Escape / スクリムに既にあるため、
  ハンドルは detent 専用(Scaffold 側の挙動)とした。既定(`skipPartiallyExpanded` = true)では従来どおり閉じるボタン
  (`'closeButton'`、既定ラベル "Close")
- **Escape(modal)は常に閉じる**。Compose の back(`settleToDismiss`)は Expanded → PartiallyExpanded だが、APG の
  モーダルダイアログでは Escape は閉じる操作のため Web の慣習を優先
- **reduced motion**(B3): detent 間の移動は空間移動なので即時(既存の `transition: none`)。JS 駆動のモーションはない

**影響**: 非破壊。型は追加のみ(`variant` / `expanded` / `defaultExpanded` / `onExpandedChange` /
`skipPartiallyExpanded`、`BottomSheetVariant`)、既定の挙動・見た目・ハンドルのラベルは従来どおり。部分展開の CSS
(size container + clip)も opt-in 時と standard だけに効かせ、既定の modal シートの描画は変えない。VRT: Default は
不変、PartiallyExpanded / Expanded / ControlledDetent / Standard を追加。対象: BottomSheet。
数値と裁定は docs/audits/modal-overlays.md「BottomSheet の standard variant と detent」節。
## フォーム入力

### B31: Select(exposed dropdown menu・非編集)

- **Issue**: #434(フェーズ 1。フェーズ 2 の autocomplete は同じ popup / option を共有して別途)
- **状態**: 決定(2026-10-13・#434 フェーズ 1 の実装で確定)
- **背景**: 最もよく使われるフォーム部品の select がない。m3「Menus can open from … text fields」「Text field dropdown
  menus」。Compose は `ExposedDropdownMenuBox` + read-only `TextField`(`menuAnchor(PrimaryNotEditable)`)+
  `ExposedDropdownMenu(matchAnchorWidth = true)` + `DropdownMenuItem` / `SelectableDropdownMenuItem` を利用者が組み立てる。
  数値と出典は docs/specs/select.md。

**選択肢**

- **(a) 専用の `<Select>` + `<Option>` 子要素**(MUI `Select` + `MenuItem`、Base UI / React Aria の `Select` + `Option` 形)
  ```tsx
  <Select label="Fruit" variant="outlined" name="fruit" value={v} onChange={(event, value) => setV(value)}>
    <Option value="apple" startIcon={<Icon />}>Apple</Option>
    <Option value="cherry" disabled>Cherry</Option>
  </Select>
  ```
  - 利点: 役割(combobox / listbox / option)と prop が素直に対応し、型も Select 専用にできる(`value: string`、
    `multiline` / `maxLength` のような TextField 専用 prop が混ざらない)。見た目は TextField の CSS を共有するので
    ずれない
  - 欠点: TextField とは別コンポーネントになる(prop 名は TextField と揃えて差を小さくする)
- **(b) `<TextField select>`**(MUI `TextField select` の形)
  - 利点: MUI の一部利用者には馴染みがある。欠点: TextField の型が `select` の有無で大きく分岐し、input 専用 prop
    (`type` / `multiline` / `maxLength` / `inputProps`)が select 時に無意味になる。MUI 自身も内部では `Select` に委譲している
- **(c) 子要素に既存の `MenuItem` を再利用**
  - 欠点: MenuItem は `role="menuitem"` の `<button>` で、フォーカスを受ける前提(roving tabindex)。select は
    `aria-activedescendant` でフォーカスを combobox に残すので、`role="option"` の別部品のほうが素直

**決定**: **(a)**。補足:

- **公開 API**: `variant`(`'filled' | 'outlined'`)、`label`、`value` / `defaultValue`(文字列、`''` = 未選択)、
  `onChange(event, value)`(A2。値が変わったときだけ。form reset では呼ばない)、`open` / `defaultOpen` /
  `onOpenChange`(A3)、`name` / `form` / `disabled` / `required`、`error` / `errorText` / `supportingText`、
  `startIcon`、`fullWidth`、`placeholder`、`id`(combobox に付く)、`inputRef`(隠しネイティブ input)。
  `ref` と残りの属性はルート(ref / A10 と同じ)、`aria-label` / `aria-labelledby` / `aria-describedby` は combobox へ
- **`Option`**: `value`(必須)、`disabled`、`startIcon`、`children`(ラベル。選択後はフィールドにそのまま表示)。
  `Select` の直下か Fragment の中に置く
- **フィールド**: TextField の見た目(`TextField.module.css`)を共有し、DOM は Select 側で組む(APG どおり `<div
  role="combobox">` にするため。readOnly の `<input>` にすると「読み取り専用」と読まれる)。末尾の `ArrowDropDown` は
  開いている間 180° 回転(Compose `TrailingIcon`)
- **a11y**: WAI-ARIA APG select-only combobox。フォーカスは開いても combobox に残し、`aria-activedescendant` で
  アクティブな option を示す。キー操作(矢印・Home / End・PageUp / PageDown・typeahead・Enter / Space・Alt+↑・
  Escape・Tab)は docs/specs/select.md。Tab は APG どおり「アクティブな option を確定して閉じ、次へ進む」。
  disabled な option はキー移動と typeahead で飛ばす
- **ポップアップ**: 共通ヘルパー(B4)で top layer に出し、フィールドと同じ幅、隙間なし(Compose `topToAnchorBottom`)。
  見た目は Compose の現行サンプル(Expressive: surface-container-low・16dp・44dp option・選択時 tertiary-container +
  チェック + 12dp)に従う。Compose の `ExposedDropdownMenu` 既定値(baseline の 4dp / surface-container)ではない
  理由は spec の SE1
- **フォーム**: 視覚的に隠したネイティブ `<input>`(`type="hidden"` ではない — `required` を制約検証に参加させるため)が
  `name` / `value` を運ぶ。form reset で uncontrolled は初期 `defaultValue` に戻る
- **見送り**: `multiple`(Compose の `ExposedDropdownMenu` にも m3 の menu ガイダンスにも複数選択がない。必要に
  なった時点で別途判断)、option のグループ / 区切り

**影響**: 非破壊(新規コンポーネント `Select` / `Option`、サブパス `m3-expressive-react/Select`)。VRT: Select の
ストーリー 6 件を追加。内部: `menuNavigation` の typeahead を、DOM フォーカスを使わない `matchTypeahead` に切り出した
(Menu / FabMenu の挙動は変わらない)。

### B42: Autocomplete(exposed dropdown menu・編集可)

- **Issue**: #434(フェーズ 2。フェーズ 1 の Select = B31 と listbox / option を共有)
- **状態**: 決定(2026-10-13・#434 フェーズ 2 の実装で確定)
- **背景**: m3「A menu can include a text field to filter options. This pattern is also known as autocomplete.」
  「Menu items ease into their new position as the menu is filtered.」。Compose は `ExposedDropdownMenuBox` +
  編集可能な `TextField`(`menuAnchor(PrimaryEditable)`)+ 末尾アイコン(`menuAnchor(SecondaryEditable)`)を
  利用者が組み立て、絞り込みは利用者のコード(`EditableExposedDropdownMenuSample`)。数値と出典は
  docs/specs/autocomplete.md。

**選択肢**

- **(a) 専用の `<Autocomplete>`**(MUI `Autocomplete` の prop 名)。選択肢は `options` 配列(文字列か
  `{ value, label, disabled }`)または Select と同じ `<Option>` 子要素
  ```tsx
  <Autocomplete label="Fruit" options={['Apple', 'Banana']} value={v} onChange={(event, value) => setV(value)} />
  <Autocomplete label="Mode" inputValue={text} onInputChange={(event, text) => setText(text)}>
    <Option value="train" startIcon={<TrainIcon />}>Train</Option>
  </Autocomplete>
  ```
  - 利点: MUI 利用者がそのまま書ける(`options` / `inputValue` / `onInputChange` / `freeSolo` / `filterOptions` /
    `noOptionsText`)。子要素の形は Select と同じなので、Select から書き換えやすい
  - 欠点: 選択肢の渡し方が 2 通りになる(アイコン付きは子要素、単純な一覧は配列)
- **(b) `<Select editable>`**(Compose の anchor type を prop にする形)
  - 欠点: Select の DOM は `<div role="combobox">`、編集可は `<input role="combobox">` で、キー操作・値のモデル
    (`inputValue`、`freeSolo`)も別物。1 コンポーネントに入れると型が `editable` で大きく分岐する
- **(c) MUI の `renderInput` / `getOptionLabel` / `isOptionEqualToValue` まで含めた汎用形**
  - 欠点: #434 は lean を求めている。値を文字列に限れば不要

**決定**: **(a)**。補足:

- **公開 API**: `variant`(`'filled' | 'outlined'`)、`label`、`options` / `children`(`Option`。`options` があれば
  そちらを使う)、`value` / `defaultValue`(文字列、`''` = 未選択。`freeSolo` では任意の文字列)、
  `onChange(event, value)`(A2。値が変わったときだけ)、`inputValue` / `defaultInputValue`(既定は
  `defaultValue` のラベル)/ `onInputChange(event, inputValue)`、`open` / `defaultOpen` / `onOpenChange`(A3)、
  `freeSolo`、`filterOptions(options, { inputValue })`(MUI と同じ引数の形。既定はラベルの部分一致・大文字小文字と
  アクセントを無視)、`noOptionsText`、`toggleLabel`(末尾ボタンの名前、既定 `'Toggle dropdown menu'` = Compose
  `Strings.ToggleDropdownMenu`。B1 の `*Label`)、`name` / `form` / `disabled` / `required`、`error` /
  `errorText` / `supportingText`、`startIcon`、`fullWidth`、`placeholder`、`id`(text input に付く)、`inputRef`
  (**表示中の text input**。Select の `inputRef` は隠し input だが、Autocomplete では利用者が触る input を指すほうが
  役に立つ)。`ref` と残りの属性はルート、`aria-label` / `aria-labelledby` / `aria-describedby` は input へ。
  内部状態は `useControllableState`
- **`Option`**: Select と同じ部品(`src/internal/listbox` に移した)。`textValue?: string` を追加: 入力欄に入る
  文字列と絞り込みの対象(既定は children のテキスト)。Select では無視
- **a11y**: WAI-ARIA APG editable combobox with list autocomplete(自動選択なし)。`<input role="combobox"
  aria-autocomplete="list" aria-expanded aria-controls aria-activedescendant>`、フォーカスは常に input。
  入力で開き(アクティブ option なし)、↓ / ↑ で開く・移動(端で折り返す)、Alt+↓ はアクティブなしで開く、
  Enter はアクティブな option を確定、Escape は開いていれば閉じ、閉じていれば入力と値をクリア(APG)。
  Compose `SecondaryEditable` に合わせ、末尾の矢印は `tabindex="-1"` の `<button>`(`aria-expanded`)。
  キー表は docs/specs/autocomplete.md
- **絞り込み**: 一致なしは閉じる(Compose サンプル)。`noOptionsText` を渡したときだけ inert な 1 行を出す
  (MUI の既定 'No options' は採らない)。入力が選択中のラベルのままなら全件を出す(MUI `inputPristine`)
- **確定のタイミング**: `freeSolo` なしは、blur で一致しない入力を選択中のラベルに戻し、入力を空にすると値も空に
  する(MUI `clearOnBlur`)。`freeSolo` は Enter と **blur** で入力を値として確定する(MUI は blur で確定しない
  ——`autoSelect` 相当を既定にした。フォーム送信される値と表示を一致させるため)
- **motion**: m3「ease into their new position」を FLIP で実装(残る option は DefaultSpatial で移動、新たに出る
  option は DefaultEffects でフェードイン)。reduced motion(B3)では動かさない
- **共有**: listbox / `Option` / 有効 option の移動ヘルパーを `src/internal/listbox/` に切り出し、Select もそれを
  使う(Select の DOM・挙動・見た目は不変。option トークンの定義場所がルートから listbox に移っただけ)
- **見送り**: `multiple`(チップ)、非同期読み込み、グループ、クリアボタン(Escape でクリアできる)、一致部分の
  強調表示(Compose サンプルは下線)

**影響**: 非破壊(新規コンポーネント `Autocomplete`、サブパス `m3-expressive-react/Autocomplete`、`Option` に
`textValue` を追加)。VRT: Autocomplete のストーリー 9 件を追加。Select のストーリーは変化なし。

## 入力系

### B37: TextField のラベル位置(上置き・常時縮小)

- **Issue**: #439
- **状態**: 決定(2026-10-13・#439 の API 案どおり。実装時に補足事項を確定)
- **背景**: TextField はフローティングラベルしかない。Compose は `TextFieldLabelPosition`(TextFieldDefaults.kt:2241)で
  `Inside(isAlwaysMinimized, …)`(:2301、filled の既定 — TextField.kt:212)・`Cutout(isAlwaysMinimized, …)`(:2346、
  outlined の既定 — OutlinedTextField.kt:160)・`Above(alignment)`(:2384)を持つ(`Attached` は deprecated)。
  textfield 監査の「機能追加の候補」に挙がっていた。

**選択肢**

- **(a) `labelPlacement?: 'floating' | 'above'` + `shrinkLabel?: boolean`**(issue 案)
  ```tsx
  <TextField label="Email" labelPlacement="above" placeholder="you@example.com" />
  <TextField label="Amount" shrinkLabel prefixText="$" />
  ```
  - 利点: `labelPlacement` は HeroUI(旧 NextUI)Input と同じ Web 慣習の語、`shrink` は MUI `InputLabel shrink` と同じ語。
    `Inside` / `Cutout` は variant で決まるため `'floating'` 1 語にまとめられ、Compose の区別を利用者に見せずに済む
  - 欠点: `above` と `shrinkLabel` の組み合わせは意味を持たない(下記のとおり無視)
- **(b) 1 つの prop に 3 値**(`labelPlacement: 'floating' | 'shrunk' | 'above'`)
  - 利点: 無意味な組み合わせが型で出ない。欠点: 「位置」と「縮小するか」という別軸を 1 語に混ぜ、Compose の
    `isAlwaysMinimized`(Inside / Cutout 共通のフラグ)とも対応がずれる
- **(c) Compose 流のオブジェクト**(`labelPosition={{ type: 'inside', alwaysMinimized: true }}`)— API 方針に反する

**決定**: **(a)**。補足:

- `labelPlacement="above"`(Compose `Above`): ラベルはコンテナの外の上に、常に縮小状態(`showExpandedLabel` = false、
  TextFieldImpl.kt:1962)。書体は bodySmall に完全に補間(`lerp(bodyLarge, bodySmall, 1)`、:1951 — 太さ・字間も
  body-small)、余白は start / end / bottom 4dp(`AboveLabelHorizontalPadding` / `AboveLabelBottomPadding`、:424・
  :2237–2240)、最小行高 16dp(`MinFocusedLabelLineHeight`)。y = 0・コンテナ全幅で start 揃え(アイコン分は
  ずらさない、:1154–1162)、コンテナはその下(:1136)。コンテナは**ラベルなしと同じレイアウト**
  (`contentPaddingWithoutLabel` = 16dp 四方、TextFieldDefaults.kt:476 / :1374)で、**outlined の notch は描かない**。
  placeholder / prefix / suffix は空・非フォーカスでも表示(:2068 / :2083)。ラベルは引き続き `<label htmlFor>`
  (クリックで入力へフォーカス、`required` の `*` は aria-hidden)。色は従来のラベルと同じ状態別トークン
  (focus = primary、error、disabled 38%)。`alignment` は公開しない(start 固定 — 必要になれば別途)
- `shrinkLabel`(Compose `Inside` / `Cutout(isAlwaysMinimized = true)`): フローティングラベルを常に縮小位置に置き、
  outlined は notch を常に開く。placeholder / prefix / suffix は空・非フォーカスでも表示。`label` がないとき、
  および `labelPlacement="above"` のときは効果なし(above は常に縮小)
- RTL: 上置きラベルは論理プロパティ(`padding-inline` / `text-align: start`)のみで追加ルール不要。RTL ルールが要る
  場合は `[dir='rtl']`(#428 の方針、`:dir()` は Lightning CSS で `dir` 属性を無視するため使わない)
- DatePickerField は TextField(outlined)を包むので、**同名の `labelPlacement` / `shrinkLabel` を素通し**する
  (フォーム内で他のフィールドと揃えるため)。ポップアップはルート基準なので上置きラベルでも位置は変わらない
- 既定(`'floating'`、`shrinkLabel` なし)の DOM・CSS は不変(既存ストーリーはピクセル同一)

**影響**: 非破壊(追加 prop のみ)。VRT: `LabelAbove` / `ShrinkLabel` ストーリー追加。対象: TextField, DatePickerField。
## ジェスチャー

### B32: PullToRefresh(新規コンポーネント)

- **Issue**: #441
- **状態**: 決定(2026-10-13・#441 の API 案をもとに実装時に確定)
- **背景**: m3 loading-indicator overview は「Used for pull-to-refresh interactions」「Loading indicators are used in the
  pull-to-refresh behavior」とし、本ライブラリの LoadingIndicator(contained・determinate)はそのために存在するが、
  pull-to-refresh 本体がなかった。Compose は `PullToRefreshBox(isRefreshing, onRefresh, state, indicator, enabled,
  threshold, content)` + `Modifier.pullToRefresh`(nested scroll で子のスクロールの余りを受け取る)と、
  `PullToRefreshDefaults.Indicator`(円形矢印)/ `LoadingIndicator`(Expressive・`ContainedLoadingIndicator`)の 2 種。
  数値は docs/specs/pull-to-refresh.md。

**選択肢**

- **(a) 自身がスクロールコンテナになる `<PullToRefresh>`**(採用)
  ```tsx
  <PullToRefresh refreshing={loading} onRefresh={reload} style={{ height: 480 }}>
    <List>{items}</List>
  </PullToRefresh>
  ```
  - 利点: `scrollTop === 0` の判定対象が一意(ルート)。`ref` / `onScroll` / `className` がそのままスクロール要素に付く。
    インジケーターをルート内の sticky アンカーに置けるので、Compose と同じく上端でクリップされ、スクロールしても動かない
  - 欠点: 高さ(または flex / grid のトラック)を利用者が与える必要がある。ページ全体(`window`)のスクロールは対象外
- **(b) スクロール可能な子を包むラッパー(子の scroll 要素を探す)**
  - 利点: 既存のスクロール要素をそのまま使える。欠点: 「どれがスクロール要素か」を推測するか `scrollRef` を受ける必要があり、
    インジケーターの配置(子の外側の overlay)もレイアウトに依存する
- **(c) `usePullToRefresh()` フックのみ** — 柔軟だが見た目(インジケーター)を利用者が組む必要があり、他コンポーネントと揃わない

**決定**: **(a)**。ただし子孫に入れ子のスクロール要素がある場合も考慮し、ジェスチャー開始時にポインター位置の要素から
ルートまでの**すべての**スクロール要素が上端にあるときだけ引っ張りを開始する(入れ子のリストでも誤発火しない)。

API:

| prop | 型 / 既定 | 内容 |
|---|---|---|
| `refreshing` | `boolean`(省略可) | Compose `isRefreshing`。controlled。省略時は `onRefresh` が返す Promise の解決まで refreshing(uncontrolled — A4) |
| `onRefresh` | `() => void \| Promise<unknown>` | しきい値を超えて離したときに呼ぶ |
| `indicator` | `'loading' \| 'circular'` / `'loading'` | `loading` = `PullToRefreshDefaults.LoadingIndicator`(48dp・contained・Level0)、`circular` = `Indicator`(40dp・surfaceContainerHigh・Level2・矢印 → スピナー)。既定は Expressive 側(B2 と同じ考え方) |
| `disabled` | `boolean` / `false` | Compose `enabled = false`。進行中の refreshing 表示は残す |
| `threshold` | `number` / `80` | px。Compose `PositionalThreshold` 80dp。指の移動量 × 0.5(`DragMultiplier`)がこれを**超えた**ら発火 |
| `refreshingLabel` | `string` / `'Refreshing'` | live region の文言(B1: prop ごとのラベル) |

挙動:

- 入力は touch(非 passive の `touchmove` で、引っ張り中はネイティブのスクロール / オーバースクロールを止める)と
  mouse / pen(Pointer Events + pointer capture)。8px の touch slop(SwipeToDismiss と同じ)を超えて下向きに動いたら開始、
  上向き・横向きならスクロールに譲る。実際に引っ張った後のクリックは子に届けない
- インジケーターの位置と進捗は Compose の式そのまま: `distanceFraction` = しきい値までは線形、超えると
  `t − t²/4`(t ≤ 2)の張力、最大 2。位置は `distanceFraction × 80 − 高さ`(`IndicatorMaxDistance` は threshold を
  変えても 80 固定 — Compose と同じ)
- 引っ張り中は determinate(loading: 円 → SoftBurst のモーフ、しきい値超えで `−(p−1)×180°` 回転 / circular: 矢印付きの円弧、
  しきい値未満は alpha 0.3)、refreshing 中は indeterminate。両者は DefaultEffects でクロスフェード
- 戻り / しきい値への移動は Compose `Animatable.animateTo` 既定の `spring()`(バウンスなし・MotionScheme キーではない)
  なので duration / easing トークン(`duration-medium1` + `easing-standard`)。クロスフェードと alpha は DefaultEffects
- **reduced motion(B3)**: インジケーターは指に追従して動かない。しきい値位置に固定し、引っ張り量に応じて不透明度だけ
  上げる(フェードのみ)。refreshing 中もその位置に表示。進捗の形の変化(determinate)は残すが、しきい値超えの回転はしない
- **アクセシビリティ**: ジェスチャーはキーボードから届かない。ルートに refreshing 中 `aria-busy="true"`、ルートの**外**
  (busy 領域の外)に `role="status"` の visually hidden な live region を置き `refreshingLabel` を読む。インジケーター自体は
  `aria-hidden`(読み上げは live region に一本化)。**アプリは必ず見えるリフレッシュ操作(ボタン等)も用意する**こと
  (JSDoc・サイトに明記)。スタイル用に `data-indicator` / `data-refreshing` / `data-pulling` / `data-disabled` と
  `--md-pull-to-refresh-progress` を出す(B20 の SwipeToDismiss と同じ方式)

**影響**: 非破壊(新規コンポーネント・新しい subpath `m3-expressive-react/PullToRefresh`)。VRT: `Components/PullToRefresh` の
Default / Refreshing / Circular を追加。
## Menu

### B33: Menu の選択項目(単一 / 複数)と supporting text

- **Issue**: #435
- **状態**: 決定(2026-10-13・実装時に確定)
- **背景**: m3 menus/guidelines「Single-select menus can have one item selected at a time」「Multi-select menus can have many
  selected items. They stay open until the person dismisses the menu」。Compose は `SelectableDropdownMenuItem`
  (`Role.RadioButton`、Menu.kt:705 / :726)と `CheckableDropdownMenuItem`(`Role.Checkbox`、:463 / :484)を持ち、すべての
  item に `supportingText`(:393 / :472 / :714)、選択時に leading icon を差し替える `selectedLeadingIcon` /
  `checkedLeadingIcon` がある。現状は `selected` が常に `menuitemcheckbox` で、選択すると必ず閉じる。

**選択肢**

- **(a) `MenuGroup` に選択モデル**(B13 ButtonGroup と同型)
  ```tsx
  <MenuGroup label="Sort by" selectionMode="single" value={sort} onChange={(e, v) => setSort(v)}>
    <MenuItem value="name" selectedIcon={<CheckIcon />}>Name</MenuItem>
    <MenuItem value="date" selectedIcon={<CheckIcon />} supportingText="Newest first">Date</MenuItem>
  </MenuGroup>
  ```
  - 利点: radio の集合が `role="group"` 単位で支援技術に伝わる(APG の menuitemradio はグループ内で排他)。B13 / B17 と
    同じ `selectionMode` + `value` / `onChange(event, value)` の語彙。欠点: 選択項目にはグループが要る
- **(b) item 単位の `type="radio" | "checkbox"`**
  - 利点: グループ不要。欠点: 排他の範囲が DOM 上で表現されず、状態は利用者がすべて手配線する
- **(c) 現状維持(`selected` = checkbox のみ)** — m3 の single-select と「開いたまま」を表現できない

**決定**: **(a)**。補足:

- `selectionMode: 'none'(既定) | 'single' | 'multiple'`。値の型は single = `string | null`、multiple = `string[]`
  (B13 と同じ判別 union)。item の `selected` を明示した場合はグループの値より優先(item 単位の controlled)。
  `selectionMode` のないグループやグループ外の `selected` は従来どおり `menuitemcheckbox`(非破壊)
- single は radio の意味: 選択中の item を再度押しても外れない(`onChange` も呼ばない)
- 閉じるかどうか: `closeOnSelect` を **item と group の両方**に置き、item > group > 既定の順で決める。既定は
  multiple なら `false`(m3「stay open until dismissed」)、それ以外は `true`。MUI に同名の prop はないが Autocomplete の
  `disableCloseOnSelect` と同じ考え方を肯定形で持つ
- `selectedIcon`(A5 / B22 と同名): 選択中は `startIcon` を置き換える。`startIcon` がなければ選択時に幅 0 → アイコン幅へ展開
  (Compose `AnimatedVisibility` の expandHorizontally + fade、Menu.kt:2071 — FastSpatial / FastEffects)。展開前もアイコン
  と文字の間隔は残る(Compose の `MenuArrangement` と同じ)
- `supportingText`: ラベルの下に BodyMedium(Compose `LabelWithSupportingText`、Menu.kt:2252-2261 /
  `SegmentedMenuTokens.ItemSupportingTextFont`)。色は `StandardMenuTokens.ItemSupportingTextColor` = on-surface-variant
  (Compose の出荷実装は色を指定せずラベル色を継承するが、トークン = 仕様を優先)、選択時はラベルと同じ選択色。支援技術には
  ラベルを名前、supporting text を説明(`aria-describedby`)として出す
- **padding**: vertical variant は既存のとおり外側 4dp inset(`DropdownMenuSelectableItemPadding`、Menu.kt:2381)と縦 12dp
  (`MenuDefaults.SelectableItemVerticalPadding`、MenuDefaults.kt:863)。supporting text があると外側に縦 2dp を足す
  (`DropdownMenuSelectableItemWithSupportTexPadding`、Menu.kt:2382)。横は **SegmentedMenuTokens の leading / trailing
  16dp・between 12dp を維持**し、`MenuDefaults.DropdownMenuSelectableItemContentPadding`(precision pointer フラグ既定オフ時の
  横 12dp)と `itemHorizontalArrangement`(8dp)は採らない — トークン(= m3 vertical menu の仕様値)を Defaults より優先
  (要オーナー確認: m3.material.io の vertical menu specs で横 padding を目視確認したい)。baseline は 12dp のまま、supporting
  text のある 2 行 item だけ縦 12dp
- **baseline の selected 色**: これまで baseline は selected を描かなかった(監査 menu.md: Compose の `MenuTokens.ListItemSelected*`
  は未使用の dead token)。単一選択を baseline でも使えるようにしたので、m3 baseline specs と `MenuTokens`(:34-41)、
  material-web `md-menu-item` の selected(secondary-container / on-secondary-container)を採用する
- baseline の `MenuGroup` は面(背景・影・角丸)を持たず、項目のグループ化とラベルだけを担う(vertical では従来どおり面)

**影響**: 非破壊(prop 追加のみ)。見た目: baseline で `selected` を付けていた item に secondary-container の色が付く。VRT:
新ストーリー(SingleSelect / VerticalMultiSelect)のみ。対象: Menu(MenuGroup / MenuItem)。

### B34: Menu のサブメニューとコンテキストメニュー

- **Issue**: #436
- **状態**: 決定(2026-10-13・実装時に確定)
- **背景**: m3 menus/guidelines「On web, menus can open submenus」「Submenus should open next to the parent menu item without
  overlapping it」「Note: Submenus are not currently available on Jetpack Compose」「The corner shape changes to show which
  submenu has focus」。context menu は menus/overview「usually open with a secondary click」。Compose には実装がないため、
  挙動は WAI-ARIA APG の menu パターン、見た目とモーションは material-web `md-sub-menu` を参照する。

**選択肢(サブメニュー)**

- **(a) `<MenuItem submenu={<>…items…</>}>`**
  - 利点: 親 item とサブメニューが 1 要素で対応し、variant / color / 閉じ方を親から継承できる。新しいコンポーネントが増えない
  - 欠点: サブメニュー自体に任意の prop(独自の `aria-label` 等)を渡せない(名前は親 item から付く)
- **(b) `MenuSub` / `MenuSubTrigger` / `MenuSubContent`(Radix 型)** — 柔軟だが 3 部品が増え、MUI 系の利用者には馴染みが薄い
- **(c) `Menu` を入れ子にする(`<Menu trigger={<MenuItem/>}>`)** — `trigger` は外部ボタン向けの設計で、menuitem に
  `aria-haspopup` 等を載せる経路・閉じ方・フォーカス管理が二重になる

**選択肢(コンテキストメニュー)**

- **(a) `Menu anchorPosition={{ top, left }}`(MUI Popover の `anchorPosition` と同じ形)+ `onContextMenu` レシピ**
- **(b) `<ContextMenu>` ラッパー(右クリック / Shift+F10 / ContextMenu キーを内部で処理)** — 1 MD3 コンポーネント = 1
  コンポーネントの方針から外れ、ラップ対象の要素の扱い(子に props を注入するか、`<div>` で包むか)という新しい API 判断が要る

**決定**: サブメニュー **(a)**、コンテキストメニュー **(a)**。補足:

- **キーボード(APG)**: 親 item で ArrowRight(RTL は ArrowLeft)/ Enter / Space → 開いて先頭 item へ。サブメニュー内で
  ArrowLeft(RTL は ArrowRight)/ Escape → そのサブメニューだけ閉じて親 item へ(md-sub-menu の open / close キーと同じ、
  sub-menu.ts:384-416。Escape が 1 段だけ閉じるのも :340)。↑↓ / Home / End / typeahead はそのサブメニュー内だけで動き、
  Tab はメニュー全体を閉じる。サブメニュー内の item を選ぶとメニュー全体が閉じて trigger にフォーカスが戻る。RTL 判定は
  JS(`getComputedStyle().direction`)、CSS は `[dir='rtl']`(`:dir()` は使わない)
- **ARIA**: 親 item は `aria-haspopup="menu"` / `aria-expanded` / `aria-controls`、サブメニューは `role="menu"` で親 item
  を `aria-labelledby`。サブメニューは親 item の次の兄弟要素として描く(positional shape の `:first-of-type` を崩さない)
- **ホバー意図**: item に 400ms 留まると開き、item とサブメニューの両方から 400ms 離れると閉じる(md-sub-menu
  `hoverOpenDelay` / `hoverCloseDelay` の既定値、sub-menu.ts:56-61)。遅延が斜め移動の猶予を兼ねる。ホバーで開いた時は
  フォーカスを動かさない。値は公開 prop にしない(内部定数)
- **配置**: 親メニューの端の外側、上端を親 item に揃える(md-sub-menu anchor corner START_END / menu corner START_START、
  sub-menu.ts:48-52)。入らなければ反対側へ flip、縦は viewport 内に clamp(B4 の共通ヘルパーの `end` 側 — #476 で追加 — に
  上端揃えと仮想 anchor を追加)。gap は baseline 0、vertical は SegmentedGap 2dp
- **見た目とモーション(md-sub-menu を記録)**: サブメニューは親と同じメニュー面(baseline: surface-container / 4dp /
  Level2、vertical: MenuGroup の面)。md-sub-menu はサブメニューを `quick`(アニメーションなし、sub-menu.ts:153 / :208)で
  開閉するので、scale / fade のモーションは付けない。開いている間、親 item は強調表示を保つ(md-sub-menu は item を
  `selected` にする)— ここでは hover state layer 相当の色を保持し、vertical では m3 の「corner shape changes」に従って
  selected と同じ 12dp へ形を変える
- **コンテキストメニュー**: `anchorPosition` は viewport 座標(`clientY` / `clientX`)。指定時は点の下・後ろに開き、入らなければ
  上へ flip、viewport 内に clamp。`trigger` は省略可能になり、その場合は `open` を controlled で使い `aria-label` を付ける。
  閉じたらフォーカスは開く前にフォーカスされていた要素へ戻る。ドキュメントのレシピ: 対象要素の `onContextMenu` で
  `preventDefault()` して位置を保存する — 右クリック・長押し・Shift+F10・ContextMenu キーはすべて `contextmenu` イベントに
  なる。キーボード起動で座標が 0 のときは要素の矩形を使う

**影響**: 非破壊(prop 追加、`trigger` が任意になるだけ)。内部: `usePopupPosition` の `start` / `end` 側に縦の端揃え(`inlineAlign`)と仮想 anchor の
`getAnchorRect` を追加。VRT: 新ストーリー(Submenu / VerticalSubmenu / ContextMenu)のみ。対象: Menu(MenuItem)。
仕様メモは docs/audits/menu.md「B33 / B34 実装メモ」。

---

## 2026-10 スイープの小さな構成追加

### B41: FabMenu の配置・Toolbar の elevation・dismissible drawer・Carousel の幅(#444 の小項目)

- **Issue**: #444(トラッキング。TimePicker のホイール / vibrant / 横向き・ScrollField は **B43**、TextField tonal / secure、
  VerticalDragHandle は別途。#444 は開いたまま)
- **状態**: 決定(2026-10-13)
- **背景**: 2026-10-09 の m3.material.io / Compose androidx-main スイープで見つかった、優先度の低い構成の不足のうち
  小さな 4 件。いずれも既存 API の語彙で足せる。

**決定**

1. **FabMenu `horizontalAlignment?: 'start' | 'center' | 'end'`(既定 `'end'`、既存の見た目は不変)**
   - Compose `FloatingActionButtonMenu(horizontalAlignment: Alignment.Horizontal = Alignment.End)`
     (FloatingActionButtonMenu.kt:120)。項目列とボタンを同じ alignment で置き(:181 / :186)、各項目も列内で
     揃え(:299)、項目の幅リビールも同じ端を基準にする(:390 — `End` は trailing 端から、`Start` は leading 端から、
     `CenterHorizontally` は中央から開く)
   - prop 名は Compose と同じ。値は Web の論理方向(`start` / `end`、RTL で鏡映)。`'end'` のときは `data-alignment`
     を出さず、既存の DOM / CSS をそのまま使う(既存ストーリーはピクセル不変)
   - close ボタンは alignment に関係なく FAB の footprint の上端 trailing 角に固定する。Compose の
     `ToggleFloatingActionButton(contentAlignment = Alignment.TopEnd)`(:450)は menu の alignment と独立した引数で、
     既定は TopEnd のため。これを変える prop は足さない(必要になったら別途)
2. **Toolbar `disableElevation?: boolean`(既定 false、floating のみ有効)**
   - m3 toolbars guidelines「The elevation on floating toolbars can be removed if on a visually distinct background」。
     Fab の `disableElevation` と同名(前例あり)。docked はもともと影がないので、`data-disable-elevation` は floating
     のときだけ出す
   - toolbar 監査(docs/audits/toolbar.md 軽微欄)の「`style` / `className` で外せるので prop は不要」は本裁定で
     superseded(監査側に相互参照を追記)
3. **NavigationDrawer `variant="dismissible"`**(Compose `DismissibleNavigationDrawer`、NavigationDrawer.kt:489)
   - 現行の構造に素直に収まるので実装した。standard と同じインラインの `<aside>`(Surface —
     `DismissibleDrawerSheet` の既定 `DrawerDefaults.standardContainerColor`、:737)を `open` で出し入れする。
     scrim・focus trap・`useModal` なし
   - Compose は content を drawer の offset 分だけずらす(:581 `contentX = sheet.width + offset`)。Web では閉じた
     drawer を負の `margin-inline-start`(自身の幅)で inline-start 側へ逃がし、flex / grid の隣の兄弟が空いた幅を
     使う — content は覆われず押される。利用側は drawer と content を横並びの行に置く(`overflow: hidden` 推奨)。
     content の子に drawer を取る API(Compose の `content` スロット)は足さない — standard / modal と同じく
     drawer はパネルだけを描く
   - モーション: 開き DefaultSpatial・閉じ FastEffects(:501–502、modal と同じ)。reduced motion は即時(B3 —
     閉じは spatial な性質を effects トークンで動かすので CSS で無効化)
   - フォーカス: 開いたら選択中(なければ先頭)の項目へ(Compose :513 `focusRequester.requestFocus()`)。
     マウント時点で開いているときは動かさない。Escape(drawer 内にフォーカスがあるとき、Compose :548)で
     `onClose(event, 'escapeKeyDown')`。閉じた drawer は `inert`(Compose は閉じた sheet を配置しない、:584–588)。
     フォーカスを持ったまま閉じたら、開く前にフォーカスがあった要素へ返す
   - `open` は modal と同じく controlled のみ(既定 false)。トグル側の `aria-expanded` / `aria-controls` は JSDoc と
     docs で案内する
4. **Carousel `itemWidth` の JSDoc**: 上限ではなく**目標値**であることを明記(Compose は androidx `98c93887a0` で
   `maxItemWidth` → `preferredItemWidth` に改名。carousel/Carousel.kt:85–90 multi-browse、:241–248 hero)。末尾では
   最後の項目が end に揃うよう配置がずれること(:224–232)、hero は 3 項目未満だと中央揃えにできず start 揃えのまま
   (carousel/Keylines.kt:229 `isCentered && itemCount >= 3`、Carousel.kt:234)も書いた。prop 名は変えない(`itemWidth`
   のまま — 型の破壊を避ける。挙動は既に Compose どおり)。m3 の寸法表の「最大幅を指定」は改名前の記述と見なす

**影響**: 非破壊(prop と variant 値の追加・JSDoc のみ)。既定値は不変、既存ストーリーはピクセル不変。VRT: FabMenu
`HorizontalAlignment` / `RightToLeftStart`、Toolbar `FloatingWithoutElevation`、NavigationDrawer `Dismissible` を追加。
対象: FabMenu、Toolbar、NavigationDrawer、Carousel。

---

### B43: TimePicker の vibrant・横向き・スクロールホイール + ScrollField(#444 の TimePicker 項目)

- **Issue**: #444(トラッキング。TimePicker の 3 項目。#444 は開いたまま)
- **状態**: 決定(2026-10-13)
- **背景**: timepicker 監査(docs/audits/timepicker.md 冒頭)は Compose の `Vibrant*` / `TimeScroll`(Expressive の opt-in)と
  横向きレイアウトを範囲外としていた。m3 time-pickers/specs の構成一覧は「Vertical orientation and horizontal orientation」を
  挙げ、Compose androidx-main は次を持つ(いずれも `TimePicker.kt` / `TimePickerDialog.kt` / `ScrollField.kt`):
  - vibrant: `TimePicker(state, shapes, colors = vibrantColors())`(:289)。`shapes` の有無(`orVibrant`、:4143)で
    寸法・形も切り替わるので、色だけの差ではない。色は `defaultVibrantTimePickerColors`(:684–709)/
    `defaultVibrantTimeInputColors`(:894–924)、形は `TimePickerShapes(timeFieldShape = CornerLarge, periodSelectorShape = CornerFull)`
    (:743)、寸法は `Vibrant*`(:1454–1478)、ダイアログは `VibrantTimePickerDialog`(TimePickerDialog.kt:140 — 見出しなし、
    `vibrantContainerColor = surfaceContainer` :416、`vibrantShape = CornerExtraLarge` :420、余白 12 :331–346)
  - 横向き: `TimePicker(layoutType = TimePickerLayoutType.Horizontal)`(:1436 / :1987 `HorizontalTimePicker`、
    :2383 `HorizontalClockDisplay`)
  - スクロール: `TimeScroll`(:423 / :454 → `TimeScrollImpl` :2230)= 2 つの `ScrollField`(ScrollField.kt:194 — 公開の
    `@material3expressive` コンポーネント。`VerticalPager` の無限ページ :64、ページ高さ `ScrollFieldHeight / 3` :261、
    既定高さ 200dp :357)。モード切替は `ScrollDisplayModeToggle`(TimePickerDialog.kt:481 — scroll ⇄ input、
    文言「Switch to scroll mode」strings.xml:124)

**選択肢**

- vibrant の API
  - **(a) `variant?: 'standard' | 'vibrant'`**(既定 `'standard'`)
  - (b) `colorScheme?: 'standard' | 'vibrant'` — Compose の vibrant は色に加えて形(CornerLarge / CornerFull)・寸法
    (100×120 のフィールド等)・AM/PM の部品(ToggleButton)・ダイアログの余白と見出しまで変わるので、色の名前では範囲を
    言い表せない。また `ThemeProvider` の color scheme と紛らわしい
  - (c) Compose 流の別コンポーネント(`VibrantTimePicker`)— 1 コンポーネント方針に反する
- 横向き: **`orientation?: 'vertical' | 'horizontal'`**(既定 `'vertical'`)。Compose の既定は画面の縦横から自動判定
  (`defaultTimePickerLayoutType`)だが、Web ではコンテナと画面が一致しないので明示 prop にする(監査の軽微欄で
  保留にしていた「prop かコンテナクエリか」はこれで決着)
- スクロール: **`mode` に `'scroll'` を追加**(`TimePickerMode = 'dial' | 'input' | 'scroll'`)。Compose の
  `TimePickerDisplayMode.Scroll`(TimePickerDialog.kt:571)と同じ位置づけ
- ScrollField: **公開する**(`m3-expressive-react/ScrollField`)。Compose で公開の Expressive コンポーネントで、API が
  きれいに Web の語彙へ写せたため:`min` / `max` / `value` / `defaultValue` / `onChange(event, value)` / `pageStep` /
  `disabled` / `formatValue` / `getValueText`(+ 標準 HTML 属性)。Compose の index ベース(`itemCount` + `index`)は
  `min` / `max` の値ベースに、`field` スロットは `formatValue` に、`colors` は CSS(`--_*` トークン)に置き換えた

**決定**: 上記の (a) + `orientation` + `mode="scroll"` + 公開 `ScrollField`。補足:

1. **vibrant(`data-variant="vibrant"`、standard では属性を出さない)**
   - コンテナ: surface-container、CornerExtraLarge、余白 12(横向きは左右 24 — TimePickerDialog.kt:355)、内容とアクションの間 12
     (横向きは 24)。影は監査の裁定どおり `shadow-level3` のまま
   - 見出し: VibrantTimePickerDialog には title がない → **visually hidden で残す**(モーダルのダイアログ名に必要。表示はしない)
   - 時刻セレクタ: 100×120(縦向き 24h は 132 — :2459–2463)、CornerLarge、surface-container-lowest、選択時は primary の文字 +
     2dp primary 枠(:3105)、区切り 16 幅(:1460)、表示 → dial 12(`VibrantVerticalTimePickerGap`)、dial の下 0、
     dial は surface-container-lowest
   - AM/PM: ToggleButton 2 個(:2978 `ToggleItem`、`shapes != null` で常に新トグル)。丸(`calc(高さ / 2)`)→ 選択時・押下時
     12dp(`ToggleButtonShapes`、:2999)、FastSpatial で形を補間。未選択 surface-container-lowest / on-surface-variant、
     選択 primary-container / on-primary-container + 太字(:2868)。縦 56×120 で間 8(セレクタから 16、入力・スクロールの
     フィールドから 8)、横 216×40 で間 16(:2549–2560)。標準の tertiary + outline 枠(監査の裁定)は standard のみ
   - 入力: 100×120・display-large、surface-container-lowest、フォーカスで primary 2dp 枠 + primary 文字、未フォーカスは枠なし
     (:911–918)。「Hour」/「Minute」の supporting text は出さず、エラー時だけフィールドの下に出す(:3913
     `shapes == null || !isValid`、Compose と同じくレイアウトが伸びる)
2. **横向き(`data-orientation="horizontal"`、dial モードのときだけ)**
   - Compose `HorizontalTimePicker`: [時刻表示(セレクタ行 + 16 下に AM/PM 216×38、左右分割・1dp 区切り)] — 36 —
     [dial]。vibrant は間 52(`VibrantHorizontalTimePickerGap`)、AM/PM 216×40
   - dial は 256 固定(Compose の standard 横向きは画面の高さで 256 / 238 / 200 に縮む `ClockFaceSizeModifier`、:2007 —
     Web では利用側がコンテナを選ぶので縮めない)。アクション行は dial の 4 下(TimePickerDialog の landscape
     `landContentActionsPadding`)。見出しは縦向きと同じく上に置く(Compose landscape はタイトルを左上の空きに重ねる
     独自レイアウトだが、Web では列の上に置く方が単純で読み順も自然)
   - 24h の横向きセレクタは 96 幅(site トークン「Time selector 24h **vertical** container width」114 は縦向き専用、
     Compose も横向きは 96)
   - input / scroll モードには横向きがない(Compose の `TimeInput` / `TimeScroll` は `layoutType` を取らない)→
     `orientation` は dial だけに効く
3. **スクロール(`mode="scroll"`)**
   - Compose `TimeScrollImpl`: hour / minute の ScrollField を 100×120(`VibrantTimeFieldHeight` — 200dp の既定ではない)、
     区切り(vibrant 16 / standard 24)、AM/PM(vibrant 56×120・間 8 / standard は 52 幅の outline 枠を行の高さ 120 に)
   - Compose の `TimeScroll` は vibrant(`shapes` 必須)しかない。standard でも使えるようにし、そのときは
     **配置はスクロールの寸法のまま、色と AM/PM の部品だけ standard**(コンテナ surface-container-high、tertiary + outline)。
     Compose の `orVibrant` を standard 側に倒すと高さ 120 のフィールドの横に 72 の AM/PM が並ぶ不揃いな形になるため
   - 12h の hour は 1–12 で循環(12 → 1 で AM/PM は変わらない、:2236–2258)、24h は 0–23。名前は「Select hour」/
     「Select minutes」(Compose `contentDescription`)、値の読み上げは `getHourLabel` / `getMinuteLabel`(「7 o'clock」)
   - モード切替: scroll では keyboard アイコン(`switchToInputLabel`)、そこから入った input では SwipeVertical アイコン +
     **`switchToScrollLabel`(既定「Switch to scroll mode」)** で scroll へ戻る(Compose `ScrollDisplayModeToggle`)。
     dial から入った input は従来どおり dial へ戻る。見出しは「Select time」(strings.xml の `m3c_time_scroll_dialog_title`)
4. **ScrollField**
   - 見た目: 既定 100×200(幅は Compose に既定がないので TimePicker の 100 を採用)、ShapeDefaults.Large、
     surface-container-lowest。中央の値は DisplayLargeEmphasized(57/64・Medium・字間 0 — TypeScaleTokens)・on-surface、
     ほかは DisplayMedium・outline(`ScrollFieldDefaults.Item`、:426–461)で、サイズと色を FastSpatial で補間(Compose と同じ
     キー)。値の高さは常に 200/3(`PageSize.Fixed`)。disabled は container / content とも 38%
   - ARIA: `role="spinbutton"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-valuetext`。Compose は
     progress(無限ページの番号)と stateDescription で出しているが、Web では値そのものの spinbutton が正しい
   - キーボード(APG spinbutton): **ArrowUp = +1 / ArrowDown = −1**(循環)、PageUp / PageDown = `pageStep`(既定 5。
     TimePicker は hour 3 / 24h 6、minute 5)、Home / End = min / max。Compose は Down = 次のページ(+1)だが、
     spinbutton の役割の約束(上で増える)を優先した。ホイールはスクロールと同じ向き(下へ回すと +1)
   - ポインタ: ホイールは 1 ノッチ 1 値(トラックパッドの細かい delta は 50px ごとに 1 値)、`passive: false` でページを
     スクロールさせない。ドラッグは Compose の pager と同じく途中で値が変わり、離すと最寄りへスナップ、fling は最寄りから
     **最大 1 値**(foundation `PagerDefaults.flingBehavior` の `PagerSnapDistance.atMost(1)`)。隣の値のタップでそこへ
     スクロール(各項目の `clickable`、ScrollField.kt:271)
   - モーション: スナップは pager の `spring()`(motion scheme のキーではない)なので `duration-medium1` / `easing-standard`
     のトゥイーン(PullToRefresh と同じ扱い)。reduced motion では即時(B3)
   - 外からの `value` の変更は最短経路でアニメーションなしにジャンプ(Compose `scrollToOption`)

**影響**: 非破壊(prop・mode 値・新規コンポーネントの追加のみ)。既定値は不変で、standard の DOM 属性も CSS も
従来の値のまま(既存ストーリーはピクセル不変 — 変更前後の Storybook を同じブラウザで撮って一致を確認)。VRT:
`Components/TimePicker` の Vibrant / VibrantInputMode / Horizontal / VibrantHorizontal / ScrollMode / VibrantScrollMode、
`Components/ScrollField` の Default / CustomRange / Disabled を追加。対象: TimePicker、ScrollField(新規)。
### B44: TextField / Select の tonal スタイル・secure field・VerticalDragHandle(#444 の残り)

- **Issue**: #444(トラッキング。TimePicker のホイール / vibrant / 横向きと ScrollField は別途。#444 は開いたまま)
- **状態**: 決定(2026-10-13)
- **背景**: 2026-10-09 スイープで残った、TimePicker 以外の 3 件。Compose の出典は androidx-main の
  `TextFieldDefaults.kt`・`SecureTextField.kt`・`DragHandle.kt`・`tokens/DragHandleTokens.kt`。
  drag handle の数値は docs/specs/drag-handle.md。m3.material.io にはどれもコンポーネントの寸法表がない
  (tonal は Compose の Expressive 追加、drag handle は layout の foundations にあるだけ)ため、Compose を正とする。

**選択肢**

1. tonal スタイル
   - **(a) `tonal?: boolean`**(Fab / FabMenu の `tonal` と同じ形 — A6・B24)。`variant`(filled / outlined)と
     直交し、どちらにも付く
   - (b) `variant="tonal"` — Compose は filled 用(`TextFieldDefaults.tonalColors()`)と outlined 用
     (`OutlinedTextFieldDefaults.tonalColors()`)の 2 つを持つので、1 つの variant 値では片方しか表せない
   - (c) `shape="rounded"` を別 prop に分ける — Compose の `roundedShape` は「Expressive style の推奨」で
     tonal と対で使う前提。今は分ける需要がない
2. secure field
   - **(a) レシピを文書化**(`type="password"` + `endIcon` に `IconButton` のトグル)
   - (b) `passwordToggle` のような prop — TextField が IconButton に依存し、トグルの文言 prop(B1 の
     `*Label`)も増える。Compose の `SecureTextField` 自身もトグルを持たず、サンプルが `trailingIcon` に
     置いている(SecureTextField.kt:66 `@sample PasswordTextField`、:137 `trailingIcon`)
3. VerticalDragHandle
   - **(a) 新規 `DragHandle`(`src/components/DragHandle/`)、値ベースの window splitter**
     (`value` / `defaultValue` / `onChange(event, value)` + `min` / `max` / `step`)
   - (b) 見た目だけの部品 + `onDrag(deltaX)` — キーボード操作と `aria-valuenow` を利用者が組む必要があり、
     APG の window splitter を満たしにくい

**決定**: すべて **(a)**。

1. **TextField / Select `tonal?: boolean`(既定 false、`@experimental`)**
   - 上流はまだ `TODO(b/448727879)`(TextFieldDefaults.kt:76・:751・:1002・:1639 — 実トークン待ち)。
     JSDoc に `@experimental` を付け、docs にも「仕様確定時にマイナーで見た目が変わりうる」と明記する
   - 形: `roundedShape` = **CornerMedium 12dp**(TextFieldDefaults.kt:75、outlined は :1001)。filled も
     4 隅すべて丸める(indicator がないため)
   - filled(`tonalColors()`、:510 / :748–833): container **SurfaceContainer**(error 時 **ErrorContainer**、
     disabled は SurfaceContainer の 38%)、indicator は全状態 **Transparent**(描かない)、focus 時の
     ラベルは **OnSurfaceVariant のまま**(primary にしない)、error のラベル・trailing icon・supporting は
     Error、supporting は OnBackground
   - outlined(`tonalOutlinedTextFieldColors`、:1395 / :1636–1719、androidx f06c082512): container
     **Transparent**、枠は error 以外の全状態で **OutlineVariant**(disabled も)、error は Error。focus での
     2dp 化は Compose でも色と独立(`focusedBorderThickness`)なので残す。KDoc「This should be used in
     conjunction with `TextFieldLabelPosition.Inside`」(:1392。filled 側も :507 で同じ)に従い、**ラベルは container の内側**
     (filled と同じ浮上位置・余白)に置き、notch は作らない。`labelPlacement="above"` はそのまま使える
   - hover は Compose にない状態(`TextFieldColors` に hover スロットがない — textfield 監査)。filled は
     m3 の hover state layer を残し、outlined は枠とラベルの色を変えない(hover の色変化が focus より
     強く見えるのを避ける)
   - Select も TextField の CSS(`TextField.module.css`)をそのまま共有しているので同じ `tonal` を足す。
     DatePickerField への素通しは今回は行わない(必要になれば B37 と同じ形で追加)
   - **注意(オーナー確認)**: filled tonal は indicator もラベル色の変化もないため、focus の目印は
     ほぼキャレットだけになる(Compose どおり)。WCAG 2.4.7 の観点で気になる場合は、focus 時に限り
     枠を出す等の Web 側の調整を別途判断する
2. **secure field はレシピ(新しい prop なし)**
   - `type="password"` + `autoComplete="current-password" | "new-password"`。Compose の
     `textObfuscationMode`(既定 `System`、:143)・`KeyboardType.Password` / autocorrect 無効(:388)は
     ブラウザ / OS の password 入力がそのまま担う
   - トグルは `IconButton variant="standard" toggle`(`selected` = 表示中、`selectedIcon` =
     visibility_off)。名前は **"Show password" で固定**し、状態は `aria-pressed` で伝える(名前と
     `aria-pressed` を両方切り替えない)。`aria-controls` は input の id。クリックしても input に
     フォーカスは移らない(#414 の挙動)
   - TextField の `type` の JSDoc、Storybook の `Password` ストーリー(初期表示はピクセル同一)、
     docs の「Password (secure) field」節に記載
3. **`DragHandle`(Compose `VerticalDragHandle`、DragHandle.kt:73)**
   - API: `value` / `defaultValue`(px、既定 `min`)/ `onChange(event, value)`(A2・ドラッグ中の毎移動と
     キー操作ごと、値が変わったときだけ)、`onDragStart` / `onDragEnd(event, value)`(ポインタードラッグ
     1 回につき 1 度)、`min`(0)/ `max`(100)/ `step`(1)/ `shiftStep`(10、MUI Slider と同名)、
     `paneSide?: 'start' | 'end'`(既定 start — 値が表す pane が handle のどちら側か。論理方向で RTL は
     反転)、`getAriaValueText`(MUI Slider と同名)、`disabled`。`ref` と残りの属性はルート
     (`aria-label` / `aria-labelledby` / `aria-controls` もここ)
   - 名前は `DragHandle`(1 コンポーネント = 1 MD3 コンポーネント)。Compose に横向きはないので
     `orientation` は持たない(`aria-orientation="vertical"` 固定)
   - 見た目(DragHandleTokens / `VerticalDragHandleDefaults`): 通常 4×48dp・Outline・CornerFull、
     pressed / dragged 12×52dp・OnSurface・CornerMedium、優先順位 dragged > pressed > 通常
     (DH:91–122)。Compose どおり**アニメーションなし**で切り替える(reduced motion の追加ルール不要)。
     ホストは `ContainerWidth` 24dp 幅、48dp のタッチターゲット(`minimumInteractiveComponentSize`)、
     state layer は capsule に clip(`ripple()`、DH:125)、FocusRing も capsule に合わせる
   - a11y(WAI-ARIA APG window splitter): `role="separator"`・フォーカス可能・`aria-valuenow` /
     `aria-valuemin` / `aria-valuemax`。キーは ←/→(`step`、Shift で `shiftStep`)、PageUp / PageDown
     (`shiftStep`)、Home / End(min / max)、↑/↓(拡大 / 縮小)。APG の任意キー Enter(折りたたみ /
     復元)と F6 は、pane の構成をアプリが持つため実装しない。名前がないと dev 警告(pane と同じ名前を
     付けるよう案内)
   - pressed はポインター押下(Compose `pressable`、DH:346–358)、dragged は最初の横移動から
     (Compose は呼び出し側の draggable の `DragInteraction`、DH:82)
   - disabled は Compose にない Web 側の追加: `aria-disabled`、タブ順から外す、capsule を
     on-surface 38%
   - Compose の pane 側の挙動(`material3-adaptive` の `paneExpansionDraggable`・アンカー)は参照範囲外。
     handle は値を報告するだけで、pane の幅はアプリが適用する

**影響**: 非破壊(prop の追加と新規コンポーネント `DragHandle`・新しい subpath `m3-expressive-react/DragHandle`)。
既定値は不変、既存ストーリーはピクセル不変(`Password` は toggle 化したが初期状態の見た目は同じ)。VRT: TextField
`Tonal`、Select `Tonal`、DragHandle `Default` / `Disabled` / `ListDetail` を追加。対象: TextField、Select、DragHandle。
textfield 監査(docs/audits/textfield.md 軽微欄)の「機能追加の候補」の SecureTextField / tonal / roundedShape は
本裁定で対応済み(監査側に相互参照を追記)。

---

## Phase A 裁定への追補

### A10 追補: 選択コントロールの `style` はルートへ(2026-10-12・#421)

- **Issue**: #421
- **状態**: 決定(2026-10-12)
- **背景**: A10 は Checkbox / Radio / Switch の `{...rest}` の着地先を native `<input>` のまま残した(name / value のフォーム
  配線のため)。`className` はルートに付くが、`style` は裁定されておらず `rest` 経由で visually hidden の `<input>` に
  落ちていた(`style={{ marginLeft: 13 }}` が input に付き、見た目に効かない)。Slider・TextField・SearchBar は両方ルート。
- **決定**: **`style` は `className` と一緒にルート要素に付ける**。それ以外の `{...rest}`(`name` / `value` / `aria-*` /
  イベント等)は A10 どおり input のまま。あわせて Checkbox の `error` は input に `aria-invalid="true"` を出す
  (明示の `aria-invalid` が優先)。
- **影響**: 非破壊(input に付いていた `style` は見た目に効いていなかった)。VRT なし。対象: Checkbox・Radio・Switch。

---

## Tabs

### B40: Tabs のインラインアイコン(leading icon)とバッジ

- **Issue**: #443(docs/audits/tabs.md の機能候補)
- **状態**: 決定(2026-10-13・#443 の API 案どおり。実装時に補足事項を確定)
- **背景**: Tab はアイコンをラベルの上に積む形(64dp)しかなく、バッジのスロットもない。Compose には
  `LeadingIconTab`(Tab.kt:152 — `Row` で `.height(SmallTabHeight)`(:172)= `PrimaryNavigationTabTokens.ContainerHeight` 48dp(:417-418)、
  `.padding(horizontal = HorizontalTextPadding)` 16dp(:423)、アイコンとテキストの間 `TextDistanceFromLeadingIcon` 8dp(:187・:441)
  — androidx-main)があり、テキスト / アイコンの Tab は `Modifier.badgeBounds()`(Tab.kt:110、Badge.kt:223-238)で
  タブの上端・終端を BadgedBox の配置の限界(ruler)として渡す。BadgedBox は anchor の大きさだけを報告し、バッジは
  レイアウト幅を取らない(Badge.kt:96-128。dot = `BadgeOffset` 6dp、数字 = 12dp 内側 / 14dp 下 — :206-218)。
  m3 tabs anatomy「Badge (optional)」、寸法表「テキストとバッジの間 4dp」。

**選択肢**

- アイコン位置
  - **(a) `iconPosition?: 'top' | 'start'`**(MUI `Tab iconPosition` と同名。MUI の `bottom` / `end` は m3 / Compose にないので持たない)
  - (b) `variant="leading-icon"` — `variant` は Tabs 側の primary / secondary と紛らわしい
  - (c) 別コンポーネント `LeadingIconTab`(Compose 流)— 1 コンポーネント方針に反する
- バッジ
  - **(d) `badge?: ReactElement<BadgeProps>`**(`<Badge>` 要素をそのまま渡す。値・`max`・`size`・`visible`・`label` は Badge の API)
  - (e) NavigationBar と同じ `badge?: ReactNode` + `badgeLabel`(内容を Tab が描く)— Badge の `max` / `visible` / アニメーションを
    二重に持つことになる

**決定**: **(a) + (d)**。補足:

- `iconPosition="start"`: 高さ 48dp(`data-with-icon` の 64dp を上書き)、アイコンとラベルの間 8dp。アイコン + 間 + ラベルを
  1 つのコンテンツ箱にまとめ、primary indicator はその幅に合わせる(Compose `matchContentSize` が `LeadingIconTab` の Row 全体を測るのと同じ)。
  既定 `'top'` は従来どおり(DOM・見た目とも変化なし)
- バッジの配置:
  - アイコンあり(top / start とも): 子なしの Badge の anchor をアイコンの上端・終端の角に置き、Badge 自身の BadgedBox オフセット
    (dot は角の内側、数字は 12dp 内側 / 下端がアイコン上端 + 14dp)をそのまま使う。ほかのコンポーネントのバッジと同じ位置
  - テキストのみ: ラベルの **4dp 後ろ、ラベルの縦中央**(m3 寸法表)。
  - どちらも**レイアウト幅を取らない**(BadgedBox と同じ)ので、ラベルはタブ中央のまま、indicator はラベル / アイコンの幅のまま
    (`[data-tab-content]` にバッジを含めない)。テキストのみのバッジはラベルの右に張り出す — ラベルが省略表示になるほど
    狭いタブでは 16dp の padding を越えうる(Compose の `badgeBounds` 相当の押し戻しはしない。実用幅では起きない)
  - m3 寸法表の「積み上げアイコンへの重なり 6dp」は dot の `BadgeOffset` 6dp と一致。数字バッジは Compose BadgedBox
    (12dp / 14dp)に従う(Badge コンポーネントの既存の裁定のまま)
- アクセシビリティ: 描画されたバッジは AT から隠し、その文言(Badge の `label`、既定は B28 の "New notification" /
  "{n} new notifications"、`visible={false}` なら無し)を**ラベルの後ろ**に visually-hidden で足す → 名前は
  「Inbox 3 new notifications」(m3 badges/accessibility、NavigationBar #175 と同じ)。文言は Badge と共通の内部ヘルパー
  (`src/internal/badgeLabel.ts`)で求め、Badge の表示と食い違わない。`aria-label` で名前を付けたアイコンのみのタブでは
  内容からの名前が使われないので、バッジの内容も `aria-label` に含める(ドキュメントに記載)

**影響**: 非破壊(prop の追加のみ。既存ストーリーは DOM・CSS とも不変)。VRT: `Components/Tabs` の LeadingIcons /
WithBadges を追加。対象: Tab(Badge は内部ヘルパーへの切り出しのみ、出力不変)。

---

### B51: 仕様に根拠がないため見送る要望(#496・#501・#502)

- **Issue**: #496・#501・#502(利用側アプリの報告 docs/redesign/07-md3.md §7 由来)
- **状態**: 決定(2026-10-15・スペックファーストの原則で判定)
- **調査**: m3.material.io(2026-10-15、TOKEN_TABLE revision 2026-10-13_06-10-19)と Compose androidx-main を確認

**#496 フォーカス可能な無効ボタン(`aria-disabled`)**

- m3: icon buttons の accessibility のキーボード表は「Tab — Focus lands on (non-disabled) icon button」
  「Space or Enter — Activates the (non-disabled) icon button」で、無効なボタンは Tab で飛ばす前提。
  フォーカス可能な無効状態は menus の「Disabled menu items can receive focus but aren't selectable」だけで、
  ボタンには定義がない
- Compose: `Button` / `IconButton` の `enabled = false` は `clickable(enabled = false)` でフォーカスもクリックも外す。
  フォーカス可能な無効の概念はない
- **決定**: 実装しない。無効の理由を伝えたい場合は、ボタンの近くの補助テキスト、または包む要素に
  Tooltip を付ける方法をドキュメントで案内する

**#501 Menu の `onAction(value)`**

- m3: menus は「Selecting an option」で閉じる挙動と単一・複数選択(B33)を定めるが、集約ハンドラーの API はない
- Compose: `DropdownMenuItem(onClick)` ごとの処理で、メニュー単位のハンドラーはない(閉じるのも呼び出し側)
- **決定**: 実装しない。データから組み立てるメニューは、各 `MenuItem` の `onClick` で `value` を渡すか、
  選択グループ(B33 `MenuGroup selectionMode` の `onChange(event, value)`)を使う

**#502 Tooltip の表示遅延**

- m3: 「Both plain and rich tooltips disappear 1.5 seconds after navigating away from the target region」
  (消える遅延のみ)。表示までの遅延の定義はない
- Compose: `BasicTooltip` はポインター Enter で即 `show()`、キーボードフォーカスでも即表示。
  遅延はタッチの長押し(`longPressTimeoutMillis`)と、非 persistent の表示時間 `TooltipDuration` 1500ms のみ
- 現状: 消える遅延は `HIDE_DELAY_MS = 1500` で m3 と一致、フォーカスでの表示は 1.4.1 で `:focus-visible` のときだけに修正済み
- **決定**: 表示遅延は追加しない(m3・Compose とも即表示)

## 本書で扱わなかった判断候補(次回以降)

監査の軽微欄で「API 判断」とされたが Issue 化されていないもの。必要になった時点で別途提案する。

- ポリモーフィック `component` prop のライブラリ全体方針(B5・B21 から派生 — Button / NavigationBarItem / ListItem / Card)
- IconButton: `aria-label` を型で必須にするか、`selectedAriaLabel` 指定時に `aria-pressed` を出さないか(iconbutton 監査)
- Badge: MUI `showZero` 相当(現状は 0 を表示。利用者は `value` を `undefined` にすれば消せる)
- ProgressIndicator: `aria-valuetext`(「50%」)、track / stop indicator を消す公開手段
- Carousel: full-screen レイアウト(Compose に公開 API がないため追加しない方針)

## 実施方針(裁定後)

- 非破壊の項目(追加 prop・新規コンポーネント・ドキュメント)は裁定後すぐ個別 PR 可
- 破壊的・既定値変更の項目(B6 の TimePicker `mode`、B12、B18、B19 のタイミング、B26)は 1 つのマイルストーンにまとめ、
  マイグレーションガイドに記載
- VRT ベースラインが変わる PR は `update-vrt-baselines` ラベルで CI に再生成させる(ローカル再生成はしない)
