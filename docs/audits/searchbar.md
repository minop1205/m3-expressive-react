# SearchBar 監査レポート(2026-09-30)

Phase B Tier 2。3ソースを突き合わせた:

1. **m3.material.io/components/search/specs** + **/accessibility** + **/guidelines** — Playwright MCP でトークン
   テーブル2セット(Search - Bar / Search - View)を全展開して取得、寸法表・本文・a11y(キーボード表・ラベル要件)を抽出
2. **Compose androidx-main** — `SearchBar.kt`(`SearchBar` / `AppBarWithSearch` / `ExpandedFullScreenSearchBar` /
   `ExpandedFullScreenContainedSearchBar` / `ExpandedDockedSearchBar` / `ExpandedDockedSearchBarWithGap` /
   `SearchBarDefaults` / `SearchBarState`)、`SearchBarTokens`・`SearchViewTokens`、`ElevationTokens`・`ScrimTokens`・
   `FilledTextFieldTokens`、`MotionScheme`・`StandardMotionTokens`・`ExpressiveMotionTokens`、`TextFieldDefaults`
3. **実装** — `src/components/SearchBar/SearchBar.tsx`, `SearchBar.module.css`, テスト(13件、全通過)・ストーリー。
   寸法・色は Storybook(`components-searchbar--search-view`)で `getComputedStyle` / `getBoundingClientRect` を実測。
   ARIA と キーボードは一時テスト(コミットしていない)で確認

前提: 実装は「docked レイアウトのみ」。full-screen レイアウト・`AppBarWithSearch`・avatar は未実装(軽微欄の機能追加候補)。
M3 Expressive では divided(baseline)スタイルは「Not recommended. Use contained」なので、docked view は
**contained スタイル**(= Compose `ExpandedDockedSearchBarWithGap`)を正として照合した。

## 結論サマリ

**一致している(修正不要)**:

- **バーの寸法**: 高さ 56、最大幅 720、シェイプ full(stadium)、左右パディング 16、アイコン 24、アイコンと入力の間 16
  (入力の開始 x = 16 + 24 + 16 = 56 — site baseline の 16/16 と contained の 4 + 48 タップ領域 + 4 のどちらでも 56)
- **バーの色**: container surface-container-high、入力 on-surface、placeholder(supporting text)on-surface-variant、
  leading icon on-surface、trailing icon on-surface-variant(site・Compose トークン・Defaults すべて一致)
- **タイポグラフィ**: 入力・placeholder とも body-large
- **elevation**: バーは 0(Compose `SearchBarDefaults.TonalElevation/ShadowElevation = Level0`。site の 6dp は下記裁定)
- **docked view の色**: surface-container-high(site の docked 配色図・Compose とも)
- **disabled の中身**: 入力・placeholder・アイコン = on-surface 38%(Compose `inputFieldColors()` の disabled と一致)
- **挙動**: Enter で `onSearch(value)`(Compose `ImeAction.Search` → `onSearch(text)`)、単一行、フォーカスで view を開く
  (Compose のタッチモードの「フォーカス = 展開」)、Escape で閉じる、外側クリックで閉じる(Compose の popup の
  `onDismissRequest`)、閉じてもクエリ文字列は保持(ただし Chromium では Escape で消える — SB4d)
- **構造・a11y**: `role="search"` ランドマーク + `<input type="search">`(site の iOS「Search field」相当)、
  placeholder「Search」が a11y 名のフォールバックになる(site「hinted search text を a11y ラベルに」、Compose の
  contentDescription「Search」と同じ)、`inputProps` による searchbox 個別命名、controlled/uncontrolled(value・open)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| SB1 | **`startIcon` の枠が常に `aria-hidden` で 24px 固定** | `<span aria-hidden="true">{startIcon ?? <SearchIcon />}</span>`。ナビゲーション用の IconButton(戻る・メニュー)を渡すと、フォーカスできるボタンが a11y ツリーから消える(axe `aria-hidden-focus` 相当)、48dp のボタンが 24px 枠からはみ出す | site guidelines「leading は**ナビゲーション用 icon button** か非機能の検索アイコン」、a11y「初期フォーカスは leading icon button に来ることがある」「icon button はその指針どおりにラベル付け」。Compose の leading slot は 48dp ボックス(`minimumInteractiveComponentSize`)。→ `aria-hidden` は既定グリフだけに付け、slot はインタラクティブな子を許容する(48dp、contained の leading space 4) | 中(a11y) |
| SB2a | **hover / pressed の state layer がない** | バーに Ripple がない(hover で何も変わらない) | site トークン: hover state layer on-surface **0.08**、pressed on-surface **0.10**(States 節の「Pressed (ripple)」)。Compose は描かない — 下記裁定 | 低 |
| SB2b | **フォーカスインジケーターがない** | input は `outline: none`、FocusRing もない。キーボードでフォーカスしてもキャレット以外の変化がない | site トークン: focus indicator **secondary・3dp・offset 2dp**。Compose もキーボード操作時はバー形状のフォーカスリング(`ripple(focusRingShape = shape, enableFocusIndication = true)`)を描く → FocusRing(`:focus-visible` 時) | 中(a11y) |
| SB3a | **`role="searchbox"` に `aria-expanded`** | children があると input に `aria-expanded` を付ける。searchbox では許可されない属性で、view を開いた状態の axe で **`aria-allowed-attr` 違反**(既存の axe テストは view なしのみで未検出) | 開閉する popup を持つ input は **`role="combobox"`**(`type="search"` の input に許可されたロール)+ `aria-expanded` + `aria-controls`(view の id)+ `aria-haspopup` | 中(a11y) |
| SB3b | **候補・結果の表示が読み上げられない** | live region も状態説明もない | site a11y「Autosuggest: 候補・結果が現れたらスクリーンリーダーが変化を告知しなければならない」。Compose は展開時に `stateDescription = "Suggestions below"` を付ける → 展開時に告知(例: 視覚的に隠した「Suggestions below」の live region / `aria-describedby`) | 中(a11y) |
| SB4a | **矢印キーで結果に移動できない** | 未対応(Tab でしか結果に行けない) | site a11y キー表「Arrows: 結果項目間を移動」。Compose はキーボード操作時 `DirectionDown` で候補へフォーカスを移す → ArrowDown で view 内の最初の項目へ、上下矢印で項目間、先頭で ArrowUp なら input に戻る | 中(a11y) |
| SB4b | **結果にフォーカスがあると Escape が効かない** | Escape は input の `onKeyDown` だけで処理 | view 内のどこからでも Escape で閉じ、input にフォーカスを戻す(Compose は popup 内の Back で collapse、APG combobox の Escape) | 中(a11y) |
| SB4c | **フォーカスが外に出ても view が開いたまま** | 閉じるのは Escape と外側 `mousedown` のみ。Tab で抜けると開いたまま(一時テストで確認) | ルート外へのフォーカス移動(`focusout` の `relatedTarget` がルート外)で閉じる。Compose の docked view は focusable popup で、外に出る = dismiss | 低(a11y) |
| SB4d | **1回目の Escape でクエリが消える** | Chromium の `type="search"` ネイティブ動作で、view を閉じると同時に値が空になり `onChange` も発火(Storybook で実測: `abc` → Escape → `""`) | view が開いているときの Escape は**閉じるだけ**(`preventDefault`)。APG combobox「Escape: popup を閉じる。popup が出ていないときに限り、任意でクリア」。Compose も collapse でテキストを消さない | 低 |
| SB4e | **IME 変換確定の Enter で `onSearch` が発火** | `event.key === 'Enter'` だけを見ている(`isComposing: true` の keydown でも発火を一時テストで確認) | `event.nativeEvent.isComposing`(と `keyCode 229`)のときは無視。日本語入力では変換確定のたびに検索が走る | 中 |
| SB5a | **docked view がバーから 4px 離れる** | `top: calc(100% + 4px)` | **2dp**(site `contained docked bar results gap` 2dp、Compose `dockedDropdownGapSize = 2.dp`) | 低(VRT 差分なしの見込み) |
| SB5b | **contained スタイルなのに divider がある** | view の先頭に outline の 1px 線 | contained(gap あり・12dp の結果コンテナ)には **divider なし**(site「divided スタイルでは divider が区切る」、Compose `ExpandedDockedSearchBarWithGap` に divider なし)。divider は divided(28dp の一体コンテナ)専用 | 低 |
| SB5c | **結果の高さが固定 320px 上限・最小なし** | `.results { max-height: 320px }` | 最小 **240dp**、最大 **画面高の 2/3**(site contained 寸法表「Min: 240dp, max: 2/3 of screen height」、Compose `DockedExpandedTableMinHeight = 240.dp`・`DockedExpandedTableMaxHeightScreenRatio = 2/3`。with-gap の 1/2 は下記裁定) | 低 |
| SB5d | **docked view に scrim がない** | なし(背後のコンテンツがそのまま) | site guidelines「Docked opens a list below the search bar, **with a scrim covering main content**」、Compose with-gap は `ScrimTokens` scrim @ **0.32**、scrim のクリックで閉じる | 低 |
| SB5e | **開閉モーションがない** | `display: none` ↔ `block` の即時切り替え | Compose with-gap: dropdown が −height/2 から滑り込み(展開 `DefaultSpatial` / 収納 `FastSpatial` spring)、中身は 100ms フェード(50ms 遅延、standard accelerate/decelerate)。CSS では短い translate + opacity で近似、`prefers-reduced-motion` で無効化 | 低 |
| SB6 | **最小幅がない** | `min-width` 未指定(ルートは `width: 100%; max-width: 720px`) | **360dp**(site「Width Min: 360dp, max: 720dp」、Compose `SearchBarMinWidth = 360.dp`) | 低(VRT 差分なしの見込み — ストーリーは 720 幅) |
| SB7 | **キャレットの色** | ブラウザ既定(= `color` の on-surface) | **primary**(Compose `inputFieldColors().cursorColor = FilledTextFieldTokens.CaretColor`。site にトークンなし=矛盾なし) | 低 |

Issue: SB1 → #143、SB2a/SB2b → #144(バーに Ripple/FocusRing を載せる同じ箇所)、SB3a/SB3b → #145(input の ARIA 配線)、
SB4a–e → #146(キー/フォーカスハンドラを書き直すため同梱)、SB5a–e → #147(docked view コンテナの作り直し)、SB6 → #148、SB7 → #149

**軽微(判断・記録のみ)**:

- **docked view の影**: 実装は `shadow-level3`。Compose の with-gap は影なし(scrim で分離)、site は view の elevation 6dp。
  SB5d で scrim を入れるなら影は不要になるが、6dp の解釈(下記裁定)が曖昧なので今回は記録のみ。SB5 の修正時に判断
- **disabled のコンテナ**: 実装は on-surface 4%(#10 で TextField の filled disabled に合わせた)。Compose は
  コンテナ色を変えない(surface-container-high のまま、中身だけ 38%)、site に disabled トークンなし。見た目の差は
  小さく、#10 の判断を覆す根拠が弱いので維持
- **キーボードでのフォーカスだけで開く**: Compose はキーボード操作時「フォーカス ≠ 展開」(入力か ArrowDown で展開)。
  Web の combobox はフォーカスで開くのも許容範囲(APG でも任意)。SB4a の ArrowDown 展開を足せば両立できる
- **interactive な `endIcon`**: trailing slot は padding なしで バーの 16px パディングの内側に置かれる。IconButton(48)を
  入れるとアイコン中心が端から 40px になり、site contained の「trailing space 4 + 48 タップ領域」(中心 28)とずれる。
  ストーリーは素のアイコン(非インタラクティブ)なので現状は正しい。SB1 の slot 整理と一緒に扱うのが自然
- **Expressive のマージン 24 → 12(フォーカス時)**: バーを置くペイン側のレイアウト(Compose `AppBarWithSearch` /
  `SearchBarAsTopBarPadding`)の話で、`width: 100%` のコンポーネント単体では扱わない
- **クリアボタン**: site「focused search は任意でクリアアイコンを出せる」— 任意。実装はネイティブのキャンセルボタンを
  CSS で隠しており、利用側が `endIcon` で足す。ドキュメントで例示するとよい
- **state layer の focus 0.10**: Ripple は hover/pressed のみ、focus は FocusRing が担う(ライブラリ全体の設計、
  Tabs 監査と同じ)
- **Compose にあって実装にないもの**(機能追加の候補、今回は対象外): full-screen レイアウト(compact の既定。contained
  は surface-container-low の全画面 + 8dp パディング、divided は 72dp ヘッダー + divider)、`AppBarWithSearch`
  (スクロールで surface-container-highest に変わる)、avatar(30dp)、スクロールで隠れる挙動、predictive back
- テスト追加候補: view を開いた状態の axe(SB3a を検出できる)、ArrowDown/Escape/Tab-out(SB4)、IME Enter(SB4e)、
  focused / open 状態のストーリー(cross-cutting 監査の「focused/active story なし」)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| バー / view の elevation | `container elevation` **6dp**(同じ表の `surface tint layer color` は warning=非推奨マーク付き) | トークンは Level3(6dp)だが Defaults は `TonalElevation = ShadowElevation = Level0`(TODO なし、トークン未参照) | 6dp は tint による**トーナル elevation** の名残で、現在は surface-container-high の色ロールがその役割を担うと判断(CLAUDE.md「site 行の鮮度を疑う」)→ **バーは 0 を維持**。view の影は軽微欄 |
| hover / pressed の state layer | on-surface 0.08 / 0.10 | 描かない(フォーカスリングのみ) | site 優先 → **実装する(SB2a)**。TextField 監査の hover と同じ扱い |
| フォーカスインジケーター | secondary 3dp、offset 2dp | キーボード操作時にバー形状のフォーカスリング(`InsetRing` 設定時) | 描く点は一致 → **FocusRing を付ける(SB2b)**。太さ・色は site の値(ライブラリの FocusRing 既定と同じ) |
| docked 結果の最大高さ(contained) | 画面高の **2/3** | with-gap は **1/2**(`DockedExpandedWithGapTableMaxHeightScreenRatio`)、divided は 2/3 | site 優先 → **2/3(SB5c)** |
| full-screen ヘッダーの高さ(divided) | 72dp | トークン 72 だが実装は 56 + 上下 8 | full-screen は未実装なので対象外(記録のみ) |
| divider の色 | outline(#79747E) | `SearchViewTokens.DividerColor = Outline` | 一致。CLAUDE.md の「outlined は outline-variant」は Button 系の枠の話で、Search の divider には当てはまらない。ただし contained では divider 自体を消す(SB5b) |
| docked のスタイル | contained(expressive、推奨)/ divided(「Not recommended. Use contained」) | 両方あり(`ExpandedDockedSearchBarWithGap` / `ExpandedDockedSearchBar`) | 本ライブラリは Expressive 対象 → **contained を正**とする。実装は 12dp・gap あり(contained)と divider(divided)の混在なので SB5 で contained に揃える |

## 詳細対照表

### 寸法(site 寸法表・トークン / Compose 実装値 / 実装の実測)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| バーの高さ | 56 | 56(`InputFieldHeight`) | 56 ✓ |
| バーの幅 | 360–720 | `sizeIn(360, 720)` | 〜720(**最小なし ✗ SB6**) |
| バーのシェイプ | Circular | CircleShape | full(9999px)✓ |
| 左右パディング | baseline 16 / contained 4(+48 タップ領域)、アイコンなし 16 | 48dp アイコンボックス、アイコンを内側へ 4 オフセット | 16 ✓(leading アイコン x = 16) |
| アイコンと入力の間 | baseline 16 / contained 4(タップ領域から) | — | 16 ✓(入力開始 x = 56) |
| アイコン | 24 | 24 | 24 ✓ |
| avatar | 30(タップ領域 48) | トークンのみ | 未実装 |
| docked のバーと結果の間 | 2(contained) | 2(`dockedDropdownGapSize`) | **4 ✗(SB5a)** |
| docked 結果のシェイプ | 12(contained)/ 28(divided の一体コンテナ) | 12(`dockedDropdownShape`)/ 28(`dockedShape`) | 12 ✓(contained として) |
| docked 結果の高さ | min 240、max 画面の 2/3 | min 240、max 2/3(with-gap は 1/2) | **max 320・min なし ✗(SB5c)** |
| divider | divided のみ 1dp | divided のみ | **contained なのにあり ✗(SB5b)** |

### カラー(light)

| 要素 | site | Compose(Defaults) | 実装 |
|---|---|---|---|
| バー container | surface-container-high | surface-container-high | ✓(実測 rgb(236,230,238)) |
| 入力 | on-surface | on-surface | ✓ |
| placeholder | on-surface-variant | on-surface-variant | ✓ |
| leading icon | on-surface | on-surface | ✓ |
| trailing icon | on-surface-variant | on-surface-variant | ✓ |
| キャレット | — | primary | **on-surface ✗(SB7)** |
| hover / pressed state layer | on-surface 0.08 / 0.10 | なし | **なし ✗(SB2a)** |
| focus indicator | secondary 3dp offset 2 | フォーカスリング | **なし ✗(SB2b)** |
| docked view container | surface-container-high | surface-container-high | ✓ |
| divider | outline | outline | ✓(ただし SB5b で削除) |
| scrim | 「scrim covering main content」 | scrim @ 0.32 | **なし ✗(SB5d)** |
| disabled 中身 | — | on-surface 38% | ✓ |
| disabled container | — | 変えない | on-surface 4%(軽微欄) |

### モーション

| 項目 | Compose | 実装 |
|---|---|---|
| docked(with-gap)展開 | dropdown が −height/2 から、`DefaultSpatial`(standard 0.9/700、expressive 0.8/380) | **なし ✗(SB5e)** |
| docked(with-gap)収納 | `FastSpatial`(0.9/1400、expressive 0.6/800) | **なし ✗** |
| 中身のフェード | in: 100ms・50ms 遅延・(0.3,0,1,1) / out: 100ms・(0,0,0,1) | **なし ✗** |
| reduced motion | — | JS アニメーションなし(SB5e の実装時に対応) |

### a11y・キーボード(site accessibility ページ + Compose セマンティクス)

| 要件 | 実装 |
|---|---|
| Tab / Shift+Tab で要素間を移動 | ネイティブ ✓ |
| Space / Enter で検索フィールドを入力状態に | ネイティブ input ✓ |
| 矢印で結果項目間を移動 | **✗(SB4a)** |
| hinted text を a11y ラベルに | placeholder がフォールバック名 ✓(`inputProps` で個別命名も可) |
| 候補・結果の出現を告知 | **✗(SB3b)** |
| 開閉状態の ARIA | **searchbox に aria-expanded(axe 違反)✗(SB3a)** |
| leading/trailing icon button のラベル・フォーカス | **leading slot が aria-hidden ✗(SB1)**、trailing は利用側 ✓ |
| Escape で閉じる | input からのみ ✓ / **結果からは ✗(SB4b)**、**値も消える ✗(SB4d)** |
| フォーカスが外れたら閉じる | **✗(SB4c)** |
| Enter で検索 | ✓ / **IME 確定でも発火 ✗(SB4e)** |
| 48dp タッチターゲット | バー全体 56 ✓、leading slot は 24 固定(SB1) |

## 手順メモ(今回わかったこと)

- m3.material.io のトークン表で、shape・elevation の値は既定の「preview」表示だと SVG のプレビューだけで文字が出ない。
  token-viewer の `visibility` ボタン(`textContent.trim() === 'visibility'`)を押すと、`rounded_corner 12dp` や
  `layers 6dp` のような値の文字列に切り替わる。`token` 要素の `.token-value-wrapper` の `innerText` を読むとよい
- Search のように複数ページ(specs / accessibility / **guidelines**)に仕様が散っているコンポーネントでは、guidelines の
  挙動記述(「docked は scrim を伴う」など)がトークン表にない要件を持つ
- `type="search"` の Escape はブラウザが値を消す。Escape を扱う入力系コンポーネントは実ブラウザで確認すること
  (jsdom では再現しない)

## 修正時の判断(2026-09-30、#143 #144 #147 #148 #149)

- **slot(SB1)**: leading / trailing とも 48dp の slot(Compose の `minimumInteractiveComponentSize` ボックス)。バーの
  左パディングを 4 + slot 48 + gap 4 にしたので、既定グリフの位置(x = 16)と入力の開始(56)は従来と同じ。trailing も
  同じ構成(`endIcon` がないときだけ右パディング 16)で、素のアイコンの位置は変わらず、IconButton を入れても中心が端から 28。
  `aria-hidden` は既定の検索グリフだけに付ける。利用側が渡した装飾アイコンは自分で `aria-hidden` を付ける(JSDoc に記載)
- **state layer(SB2a)**: バーに Ripple(`--md-ripple-color` = on-surface)。slot 内の操作要素(IconButton)に hover
  している間はバーの state layer を隠し、ボタン自身の state layer だけを見せる(二重表示の回避)
- **フォーカスインジケーター(SB2b)**: FocusRing の `ring` を `composes` してバー全体に表示。テキスト入力はポインターで
  フォーカスしても `:focus-visible` に一致するため、ポインター押下を追跡して**キーボード(と programmatic)フォーカス時だけ**
  表示する(Compose もキーボード操作時のみ)
- **docked view の影(軽微欄)**: scrim で背景と分離するので `shadow-level3` を削除(Compose の with-gap と同じく影なし)
- **モーション(SB5e)**: Compose の spring を CSS で近似 — 展開はコンテナを上端から `clip-path` で開く(medium4・
  emphasized-decelerate ≈ DefaultSpatial)、収納は short4・emphasized-accelerate(≈ FastSpatial)、中身は 100ms フェード
  (展開時 50ms 遅延)。spring トークン(#319)が入ったら差し替える(TODO #314)。reduced motion(B3)では空間的な開閉を
  やめ、view は opacity のフェードのみ
- **位置決め**: ~~当面は従来どおりバー直下の `position: absolute`(+ `position: fixed` の scrim)。共通ヘルパー
  `usePopupPosition`(B4)への移行は #317~~ → #317 で移行済み: view は top layer でバー直下に固定(flip / clamp なし、
  幅はバーに一致、高さはバー下の余白を上限)、scrim はページ内に残す。判断理由は
  [phase-b-api.md B4 の実装メモ](../decisions/phase-b-api.md#b4-ポップアップ位置決めの共通化)

## 修正時の判断(2026-09-30、#145 #146)

- **ロール(SB3a)**: view(`children`)があるときだけ input を `role="combobox"`(`aria-expanded` / `aria-controls` =
  view の id / `aria-autocomplete="list"`)にする。view がない SearchBar は従来どおり `searchbox`。`children` は任意の
  コンテンツ(List + ListItem など)なので、listbox / option を強制する `aria-activedescendant` 方式ではなく、**実フォーカスを
  結果の項目に移す**方式(Compose の DirectionDown と同じ)を採用。`aria-haspopup` は付けない(implicit のまま)
- **告知(SB3b)**: 視覚的に隠した `role="status"` に、view が開いたときだけ `suggestionsLabel`(既定
  「Suggestions below」= Compose の stateDescription)を入れる。文言は B1 に従い prop で差し替える
- **キー操作(SB4a/b)**: input で ArrowDown → view が閉じていれば開く、開いていれば最初の項目へ。項目間は
  ArrowUp / ArrowDown / Home / End(無効な項目はスキップ、端で止まる)、先頭で ArrowUp → input。view 内の Escape → 閉じて
  input へフォーカスを戻す(戻したフォーカスで再び開かない)。利用側の `onKeyDown` が `preventDefault()` したキーは
  組み込み処理をしない
- **フォーカスアウト(SB4c)**: ルートの `focusout` で `relatedTarget` がルート外なら閉じる。ルート内のポインター押下
  (結果の非フォーカス領域・scrim)とウィンドウ切り替え(`document.hasFocus()` が false)は除外
- **Escape とクリア(SB4d)**: view が開いているときの Escape は閉じるだけ(`preventDefault` でネイティブのクリアを
  止め、`stopPropagation` で外側の dialog も閉じない)。閉じているとき(または view がないとき)はブラウザの
  `type="search"` のネイティブ動作に任せる(Chromium / Safari はクエリを消す)= APG「popup が出ていないときに限り任意でクリア」
- **IME(SB4e)**: `nativeEvent.isComposing` または `keyCode === 229` の Enter では `onSearch` を呼ばない
