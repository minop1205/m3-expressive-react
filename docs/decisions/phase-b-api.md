# Phase B — 公開 API 判断の提案(2026-09-30・**全項目 未決**)

コンポーネント別 spec 監査(`docs/audits/*.md` — 多くは PR #162〜#296 で追加中)で `api-design` ラベルが付いた
Issue 30 件(#301 を含む)と、監査の軽微欄で「横断判断」として持ち越された論点をまとめた**提案書**。本書の「推奨」は起案者の案であり、
**すべての項目がユーザー判断待ち**。裁定後に各項目を「決定」に書き換え、`phase-a-api.md` と同じ決定記録として扱う。

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
| B1 | 横断(#265 #251 #161 ほか) | 組み込み文言の i18n | **prop ごとのラベル(`*Label` / `get*Label`)を正とし、`LocaleProvider` は後から既定値供給として追加** | なし | 未決(ユーザー判断待ち) |
| B2 | 横断(button B5・nav 監査) | 既定の motion scheme | **expressive を既定、`ThemeProvider motionScheme="standard"` で切替** | 挙動のみ(bounce 量) | 未決(ユーザー判断待ち) |
| B3 | 横断(PI5・CR4 ほか) | reduced motion の方針 | **状態遷移は即時/フェードのみ、不定進捗だけ最小の動きで継続** | 挙動のみ | 未決(ユーザー判断待ち) |
| B4 | 横断(#259 #54) | ポップアップ位置決めの共通化 | **内製の `src/internal` ヘルパー(flip + clamp)+ Popover API の top layer** | なし(内部) | 未決(ユーザー判断待ち) |
| B5 | #217 #301 #247 | 操作可能な面(リンク化・入れ子の操作要素・Carousel 項目) | **`href` → `<a>` / `onClick` → ボタン。入れ子は ListItem = 内部で主アクションと `trailing` を兄弟に、Card = `CardActionArea` / `CardActions` を追加** | ListItem の DOM のみ | 未決(ユーザー判断待ち) |
| B6 | #161 #168 | ピッカーの OK / Cancel と dialog 構成 | **組み込みアクション行 + `onAccept`(下書き/確定モデル)+ `open` 指定でモーダル表示** | TimePicker `mode` のみ(下記) | 未決(ユーザー判断待ち) |
| B7 | 横断 | ピッカー確定と Snackbar host の共通パターン | **仕組みは共通化しない。語彙(`reason`)と内部プリミティブだけ共有** | なし | 未決(ユーザー判断待ち) |
| B8 | #169 | TimePicker 24 時間制 | **`ampm?: boolean`(MUI X)、既定は `locale`(既定 `'en-US'`)から導出** | なし | 未決(ユーザー判断待ち) |
| B9 | #251 | Snackbar host(キュー・自動消去) | **`SnackbarProvider` + `useSnackbar().show()`(Promise を返す)、`Snackbar` は見た目部品のまま** | なし | 未決(ユーザー判断待ち) |
| B10 | #253 | 長い action を別行に | **`actionOnNewLine?: boolean`(自動判定なし)** | なし | 未決(ユーザー判断待ち) |
| B11 | #257 #261 | rich tooltip の操作性と persistent | **action 付き rich は非モーダル `role="dialog"`、`persistent?: boolean` を追加** | a11y ロールのみ | 未決(ユーザー判断待ち) |
| B12 | #259 | rich tooltip の既定配置 | **rich は `bottom` 既定(plain は `top` のまま)** | 既定値変更(VRT) | 未決(ユーザー判断待ち) |
| B13 | #281 | ButtonGroup の選択モデル | **`selectionMode` + `value` / `defaultValue` / `onChange(event, value)` + `selectionRequired`** | なし | 未決(ユーザー判断待ち) |
| B14 | 横断(SG 軽微欄) | SegmentedButton の存廃 | **維持 + JSDoc / Storybook で ButtonGroup を案内(`@deprecated` は付けない)** | なし | 未決(ユーザー判断待ち) |
| B15 | #213 | アイコンのみセグメント | **option に `ariaLabel`、アイコンは選択時も残す(check + icon)** | なし(見た目は新ストーリーのみ) | 未決(ユーザー判断待ち) |
| B16 | #184 #185 #189 | input chip の選択・avatar・ChipSet | **filter と同じ選択 API / `avatar` prop / `ChipSet` 新設** | なし | 未決(ユーザー判断待ち) |
| B17 | #225 | List の選択を支援技術へ | **`List selectionMode` + `value` → `listbox` / `option` + `aria-selected`** | なし(追加) | 未決(ユーザー判断待ち) |
| B18 | #224 | Expressive リストの形・segmented・既定の見た目 | **Expressive の形を既定、`variant="standard" \| "segmented"`** | 見た目(VRT) | 未決(ユーザー判断待ち) |
| B19 | #293 | SwipeToDismiss のライフサイクル | **`onDismiss` は退場後、`dismissed` の controlled / uncontrolled で reset / プログラム dismiss** | タイミングのみ | 未決(ユーザー判断待ち) |
| B20 | #294 | 方向別の背景 | **`startToEndBackground` / `endToStartBackground` + `data-*` / 進捗 CSS 変数** | なし | 未決(ユーザー判断待ち) |
| B21 | #295 | List 内での list 構造 | **context で自動: List 内の SwipeToDismiss が `<li>`、中の ListItem は `<div>`** | DOM のみ | 未決(ユーザー判断待ち) |
| B22 | #174 | ナビ項目の `selectedIcon` | **`selectedIcon?: ReactNode`(Switch / IconButton と同名)** | なし | 未決(ユーザー判断待ち) |
| B23 | #180 | モーダル NavigationRail | **`modal` + `hideOnCollapse` + `onClose`(useModal ベース)** | なし | 未決(ユーザー判断待ち) |
| B24 | #203 #208 | FabMenu の名前固定とサイズ | **`closeAriaLabel` を deprecated(無視)/ `size` + `tonal` を追加** | 実質なし(prop は残す) | 未決(ユーザー判断待ち) |
| B25 | #233 #243 | AppBar / Toolbar のスクロール連動 | **状態 prop(`scrolled` 等)+ 便利 prop `scrollBehavior` / `scrollTarget` の二層** | なし | 未決(ユーザー判断待ち) |
| B26 | #238 | AppBar の flexible・subtitle・配置 | **`medium` / `large` を flexible に置換、`subtitle`、`titleAlignment`、`variant="center"` は deprecated エイリアス** | あり(見た目・型) | 未決(ユーザー判断待ち) |
| B27 | 横断(AB / TL 軽微欄) | BottomAppBar の扱い | **JSDoc で `Toolbar variant="docked"` を案内、deprecated 化は v2 で再判断** | なし | 未決(ユーザー判断待ち) |
| B28 | #265 | Badge のラベルと非表示時の扱い | **visually-hidden の既定英語ラベル + `label` で上書き、`role="status"` 廃止、非表示時は AT からも隠す** | a11y のみ | 未決(ユーザー判断待ち) |
| B29 | #267 | Divider を既定で装飾扱いに | **既定 decorative(AT から隠す)+ `decorative={false}` で意味付き区切り** | a11y のみ | 未決(ユーザー判断待ち) |

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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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

### B5: 操作可能な面 — Card / ListItem / CarouselItem の起動要素と入れ子の操作要素

- **Issue**: #217(CD2 — リンクカード)、#301(Card / ListItem の入れ子操作要素 — axe `nested-interactive`)、#247(CR5 — Carousel 項目)
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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

### B8: TimePicker の 24 時間制

- **Issue**: #169(TP9)
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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

---

## ボタン系の選択

### B13: ButtonGroup の選択モデル

- **Issue**: #281(BGR7)
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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

---

## List と SwipeToDismiss

### B17: List の選択を支援技術へ公開

- **Issue**: #225(LS4)
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
- **背景**: m3 は「Bottom app bar(not recommended)。docked toolbar を使う」。Compose の `BottomAppBar` は非推奨ではない。

**選択肢**

- **(a) JSDoc で「新規には `Toolbar variant="docked"` を推奨」と案内、deprecated 化は v2 の API 整理で再判断**
- **(b) 今 `@deprecated`**
- **(c) 何もしない**

**推奨**: **(a)**。理由: B14 と同じ考え方で、存在は Compose に従い、推奨先は m3 に従って利用者に伝えるため。

**影響**: なし(ドキュメントのみ)。対象: BottomAppBar。

---

## 表示系の a11y

### B28: Badge のアクセシブルラベルと非表示時の扱い

- **Issue**: #265(BG1 + BG2)
- **状態**: 未決(ユーザー判断待ち)
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
- **状態**: 未決(ユーザー判断待ち)
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
