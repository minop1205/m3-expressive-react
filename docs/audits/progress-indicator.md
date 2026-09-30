# ProgressIndicator 監査レポート(2026-09-30)

Phase B。`src/components/ProgressIndicator/` の `LinearProgressIndicator` / `CircularProgressIndicator`
(`value?: number`(0..1、省略で indeterminate)、`thickness?: number`(既定 4)、`shape?: 'flat' | 'wavy'`、circular のみ `size?: number`(既定 48))
を3ソースで突き合わせた:

1. **m3.material.io/components/progress-indicators/specs** + **/guidelines** + **/accessibility** — Playwright MCP で token-viewer を取得。
   上段 viewer のセットは「Progress Indicator - Common」「Progress indicator - Linear」「Progress indicator - Circular」の3つで、全セットを
   切り替えて expand_all。下段の「Baseline tokens」viewer(`[Deprecated] Progress indicator - Circular` 等)は廃止セットなので対象外。
   寸法図4枚(wave の amplitude / wavelength 定義、linear 寸法、circular 寸法)を `=w1400` で取得して読んだ
2. **Compose androidx-main** — `ProgressIndicator.kt`(flat linear / circular、`ProgressIndicatorDefaults`、indeterminate の keyframes と定数)、
   `WavyProgressIndicator.kt`(`WavyProgressIndicatorDefaults`、amplitude tween)、実際の描画を持つ `internal/LinearWavyProgressModifiers.kt` /
   `internal/CircularWavyProgressModifiers.kt`、`internal/AccessibilityUtil.kt`、tokens(`ProgressIndicatorTokens` v0_4_0、
   `LinearProgressIndicatorTokens` / `CircularProgressIndicatorTokens` v0_7_0、`MotionTokens`)。tokens ディレクトリを contents API で列挙 —
   wavy / expressive 専用の token ファイルはない。`ComposeMaterial3Flags.kt` に progress 関連フラグなし。keyframes の `using` の意味は
   animation-core `AnimationSpec.kt` の KDoc(「Adds an Easing for the interval **started with** the just provided timestamp」)で確認
3. **実装** — 2コンポーネント + `ProgressIndicator.module.css`、テスト(25件、全通過)、ストーリー10話。Storybook(dev)で
   `getBoundingClientRect` 実測、`dir="rtl"`、`emulateMedia({ forcedColors: 'active' })`、`reducedMotion: 'reduce'` での時間差比較、
   実ブラウザで axe-core 4.10.2(全10話、違反なし)。jsdom の axe テストも通過

**共有実装について**: 両コンポーネントとも `Ripple` / `FocusRing` / `useModal` は使わない(非インタラクティブ)。linear と circular は
`cubicBezier` / `standardEasing` / `emphasizedAccelerateEasing` / `clampProgress` を**それぞれ複製**して持つ(共有モジュールではない)。
circular は **flat indeterminate だけ CSS `@keyframes`**、wavy indeterminate と wavy の phase / amplitude / progress は JS の rAF(毎フレーム
`setState`)。linear は flat / wavy とも indeterminate を JS rAF で駆動する。VRT は reduced motion + `animations: 'disabled'` で撮るため、
**モーションの差は VRT に出ない**(CSS アニメーションは初期キーフレーム、JS は reduced-motion 分岐の固定フレームで写る)。

**前提 — API の形**: MUI(`LinearProgress` / `CircularProgress`)・Compose とも linear / circular は別コンポーネントで、本実装もそれに倣う。
flat / wavy は Compose の `LinearWavyProgressIndicator` 等の別コンポーネントではなく `shape` prop で選ぶ(CLAUDE.md の API 方針どおり)。
数値 px の `size` / `thickness` は Phase A の A1 で維持と決定済み — 再指摘しない。

## 結論サマリ

**一致している(修正不要)**:

- **色**: active indicator = **primary**、track = **secondary-container**、stop indicator = **primary**(site Common セット、Compose
  `ProgressIndicatorTokens`)。実装 `--_active-indicator-color` / `--_track-color`
- **形**: active / track / stop とも **fully rounded**(site Shape、Compose `CornerFull` + `StrokeCap.Round`)
- **linear 寸法**: thickness **4**(既定)/ 8、active と track の間の gap **4**、stop indicator **4dp の円**、stop の trailing space
  **4dp 時 0 / 8dp 時 2**(site 寸法図・token、Compose `drawStopIndicator` の `((height - stop)/2).coerceAtMost(6)` = 0 / 2)。
  実測: 4dp で track 開始 = indicator 終端 + 4px、stop 4×4 が右端
- **linear wavy**: amplitude **3**、wavelength determinate **40** / indeterminate **20**、container 高 **10**(4dp)/ **14**(8dp)
  (site token + 寸法図、Compose `WaveHeight` 10 と Béziers の制御点から 3dp)。実装 `getWavyHeight = thickness + 3 * 2`
- **wave の速度**: 1 wavelength / 秒(Compose `waveSpeed` 既定 = wavelength)。linear は determinate 40px/s・indeterminate 20px/s、
  circular は実 wavelength / s
- **wavy の amplitude**: progress **≤ 0.1 または ≥ 0.95 で 0**、それ以外で最大(Compose `indicatorAmplitude`)。変化は **500ms**、
  増加 **standard (0.2,0,0,1)** / 減少 **emphasized accelerate (0.3,0,0.8,0.15)**(Compose `Increasing/DecreasingAmplitudeAnimationSpec`)
- **circular**: thickness **4** / 8、gap **4**、wavy の amplitude **1.6**・wavelength **15**、vertex 数 `max(5, round(2πr / 15))`
  (site token、Compose `MinCircularVertexCount` 5)。12時から時計回り(site「from the top of the track, clockwise」)
- **linear indeterminate**: 周期 **1750ms**、line1 head 0 / 1000、tail 250 / 1000、line2 head 650 / 850、tail 900 / 850、easing
  **emphasized accelerate** — Compose の定数と完全一致。track は gap 付きの3区間(Compose と同じ構成)、stop なし
- **circular indeterminate の骨格**(wavy のみ): 周期 **6000ms**、global rotation **1080° linear**、sweep **0.1 ↔ 0.87**(ただし
  additional rotation のタイミングは PI5)
- **stop indicator は linear determinate のみ**(site「not used for indeterminate or circular」、Compose も determinate のみ)
- **track を progress 1 で消す / stop を progress 1 で消す**(Compose は track 区間長 0、stop は active に覆われる)
- **a11y**: `role="progressbar"`、determinate で `aria-valuemin=0` / `aria-valuemax=1` / `aria-valuenow`、indeterminate で value 属性なし
  (site a11y「progress bar accessibility role」、Compose `progressBarRangeInfo(0..1)` / `progressSemantics()`)。ストーリーは全て
  `aria-label` 付き。axe は jsdom・実ブラウザとも全10話で違反なし
- **RTL**: flat linear(track・indicator・stop・indeterminate 区間)は `inset-inline-*` で正しく反転(実測: indicator 180–360、stop 0–4)。
  circular は反転しない(site「Circular progress indicators don't need to be mirrored」)
- **linear の幅**: 親幅いっぱい(site「should always span the width of the UI element」。Compose の 240dp は既定幅で token なし)
- **HTML 属性パススルー / ref**: `{...rest}` と ref はルート(`div` / `svg`)

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| PI1 | **circular の既定サイズが全構成で 48、stroke / gap が `size` に比例して拡縮する** | 固定 `viewBox="0 0 48 48"` を `size`(既定 48)へ拡大縮小。実測: flat 既定の外径 **48**、`size={24}`(CircularSmall)で stroke **2px**・gap 2px。wavy は半径 `(48 - t)/2` の外側へ amplitude 1.6 を足すので stroke が 48 の箱から約 1.6px はみ出す(`overflow: visible`) | site 寸法図: flat 4dp **40** / flat 8dp **44** / wavy 4dp **48** / wavy 8dp **52**(token `circular size` 40、`size with wave` 48)。Compose `CircularProgressIndicatorTokens.Size` 40 / `WaveSize` 48。thickness は dp(Compose の `strokeWidth` / `gapSize` は直径と無関係)。wavy は `size - stroke` に収めて描く | 中 |
| PI2 | **wavy linear が RTL で反転しない** | wavy の SVG path は物理 x(左端基準)で計算。実測 `dir="rtl"` + wavy determinate 0.3: track は左側 0–248 に正しく出るが、**wave も左 2–106 に描かれ track と重なる**(右端が空)。indeterminate wavy は active path(左基準)と track 区間(`insetInlineStart` で反転)がずれる | site guidelines「Linear progress indicators should be mirrored horizontally for … RTL」。Compose は RTL で wavy linear を `rotate(180f)` で描き、stop も `scaleX = -1` で反転 | 中 |
| PI3 | **forced colors で flat linear が完全に消える** | track / indicator / stop / indeterminate 区間が全て `background-color` の `<span>`。`forced-colors: active` で全て Canvas(実測 `rgb(255,255,255)`、スクリーンショットは空白)。wavy の SVG path と circular の SVG は残る(ブランド色のまま) | site a11y「The active indicator … provides visual contrast of at least 3:1」「the end of the track must be easy to identify」(stop indicator)。WCAG 1.4.11 は forced colors 下でも適用 → `@media (forced-colors: active)` で active / stop を `CanvasText`、track を `GrayText` 等に | 中 |
| PI4 | **低い progress で active indicator が「点」にならない** | flat linear は `width: p%`。実測 `value=0.005`(360px 幅): indicator **1.8 × 4px** の細片、track は 4px 離れて開始 | site guidelines「At low percentages … this should appear as a **dot**」。Compose は round cap の端を `[sw/2, width - sw/2]` に収めるので progress > 0 で最低でも thickness 径の円、gap も `min(p, gapFraction)` で progress に合わせて縮む | 低 |
| PI5 | **circular indeterminate のモーションが Compose と違う(flat は別アニメ、rotation の段差がない)** | flat: CSS `@keyframes` 13点の近似で周期 **6.183s**、sweep 0.15–0.85、最大は周期の約65%。wavy: 周期 6000 / 1080° は一致だが、追加回転 90° を **1500ms かけて** emphasized decelerate で回す(`ADDITIONAL_ROTATION_DURATION_MS = 1500` = delay と同値なので静止区間がない)、sweep は伸縮とも standard easing | Compose(flat / wavy 共通の `circularIndeterminate*AnimationSpec`): 6000ms、global 0→1080° linear、追加回転は **300ms で +90° → 1500ms まで静止**(×4)、sweep 0.1 → 0.87(3000ms)→ 0.1(6000ms)。site はタイミングを規定しない。→ flat / wavy を1つのドライバに統一 | 低 |

Issue: PI1 → #269、PI2 → #270、PI3 → #271、PI4 → #272、PI5 → #273

**VRT への影響**: PI1(circular 全話の寸法)と PI5(indeterminate の固定フレームが変わる — flat は CSS アニメの初期キーフレーム、wavy は
reduced-motion 時の 30% 地点)は既存 baseline が変わる。PI2 / PI3 / PI4 は既存ストーリーに現れない(RTL・forced colors・低 progress の
ストーリーがない)ので、修正 PR でストーリーを足すこと。モーションそのもの(PI5 の時間変化、wave の流れ、amplitude の tween)は
VRT では見えない。

**軽微(判断・記録のみ)**:

- **reduced motion の挙動が不統一**: `prefers-reduced-motion: reduce` で linear(flat / wavy)・circular wavy は固定フレームに止まるが、
  **flat circular indeterminate は CSS アニメが回り続ける**(`animation-duration: 6s` にしているだけ。実測で dashoffset が変化)。
  止めた indeterminate は「進んでいない determinate」に見える懸念もある(site / Compose とも reduced motion を規定しない。Compose は
  `InfiniteAnimationPolicy` のみ)。「回転は残し、伸縮・wave を止める」等の方針を PI5 の修正で決めること
- **arbitrary thickness の stop offset**: CSS は `data-thickness='8'` の時だけ `inset-inline-end: 2px`。Compose は
  `((thickness - 4) / 2).coerceAtMost(6)`(6dp なら 1、12dp なら 4)。stop 径も Compose は `min(4, thickness)`(thickness < 4 で縮む)
- **circular の gap が低 progress で縮まない**: 実装は常に `(4 + thickness) / circumference`、Compose は `min(sweep, gapSweep)`。
  PI4 と同じ規則なので同じ修正で揃えるとよい(円は round cap で点にはなる)
- **determinate の progress アニメーション**: flat は CSS transition **400ms standard**(`medium4`)、wavy は JS **600ms standard**。
  Compose は内部でアニメーションせず、呼び出し側向けの推奨値が flat = spring(no-bouncy, very low)、wavy = `tween(500, linear)`。
  Web 慣習として内蔵 transition は妥当だが、flat / wavy で値が違う点は揃えたい
- **aria の値域 0..1**: Compose と同じだが、MUI は 0..100。スクリーンリーダーは `aria-valuetext` がないと「0.5」と読む場合がある。
  `aria-valuetext`(「50%」)を付けるかは判断事項
- **accessible name の強制なし**: site は「describes the purpose」ラベルを必須とするが、ラベルなしでも axe 4.10 は実ブラウザで違反を
  出さなかった(`aria-progressbar-name` が発火しない)。JSDoc / ストーリーで明示する程度
- **`aria-busy`**: 読み込み中の領域側に付ける属性で、indicator の責務ではない。ドキュメントで案内するのみ
- **track / stop を消す手段がない**: site は「ボタン内では active をラベル色にし track を外す」「3:1 を満たせば stop を外してよい」。
  Compose は `trackColor` / `drawStopIndicator` 引数。本実装は CSS 変数(`--_track-color` 等 — private)しかない。公開手段は API 判断
- **パフォーマンス**: rAF ごとに `setState` → React 再レンダー(wavy linear は path 文字列を毎フレーム再生成)。60fps を実測で維持
  (LoadingIndicator と同様)。多数同時表示時のコストは要観察だが現状は問題なし
- **circular flat indeterminate の track**: Compose `circularIndeterminateTrackColor = Transparent`(track なし)、実装は track を描く(裁定参照)
- **component token 名**: `--_track-color` / `--_active-indicator-color` は Compose の part 名に沿っている。`--_gap-size` / `--_surface-color` は
  定義だけで未使用(gap は TSX で 4 をハードコード)

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| circular flat indeterminate の track | guidelines「Indeterminate progress indicators **move along a fixed track**」 | `circularIndeterminateTrackColor = Color.Transparent`(wavy indeterminate は SecondaryContainer) | site が上位 → **track を描く**(実装どおり) |
| waveform と size の関係 | 「The waveform should scale with the size so the proportions look the same」 | wavelength は dp 固定(vertex 数が半径で増える)、amplitude は star の `innerRadius 0.75` なので**半径に比例** | 厚み・gap は dp 固定(PI1)。wave の拡縮方法は PI1 の修正時に判断(site の意図は「比率を保つ」) |
| wave amplitude token | linear 3 / circular 1.6(token 表) | `ActiveWaveAmplitude` token は**どこからも参照されない**。linear は Bézier の制御点から 3dp(幾何的に一致)、circular は star 形状由来 | 数値は site の **3 / 1.6** を採用(実装どおり) |
| stop の trailing space | token 0(4dp)/ 2(8dp、廃止セット) | token `StopTrailingSpace` 0、実装は `((h - stop)/2).coerceAtMost(6)`(`TODO b/401511176`) | 4 / 8dp では一致 → **0 / 2**。任意 thickness は Compose の式(軽微欄) |
| 8dp(thick)の token セット | `[Deprecated] Linear - thick` / `Circular - thick`(廃止) | token なし(thickness は引数) | 寸法図(8dp の 44 / 52 / trailing 2)は現行の「configurable thickness」の見本として採用 |
| site の thick token のラベル | 「thick height 8 / thick active indicator thickness **14** / thick with wave height 8」 | — | ラベルの取り違え(寸法図は高さ 8、wave 高 14、thickness 8)。寸法図を採る |
| circular の sweep / rotation の easing | 記述なし | `90f at 300 using EmphasizedDecelerate` は `using` の意味上 300→1500ms の**静止区間**に掛かり、0→300ms の回転は既定(linear)。sweep も伸び(0→3000ms)は linear、縮み(3000→6000ms)が standard | Compose の**実挙動**(字義どおり)に合わせる。ソースのコメント(「90 degrees in 500ms」「360 degrees in 6 seconds」)は古い — 定数を採る(PI5) |
| determinate の progress アニメ | 記述なし | 内蔵なし、推奨 spring(flat)/ tween 500 linear(wavy) | Web は内蔵 transition を維持(軽微欄) |
| linear の既定幅 | 親幅いっぱい、40dp 未満に置かない | `LinearIndicatorWidth` 240dp(token なし) | Web は **100%**(実装どおり) |

## 詳細対照表

### Linear 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| thickness(既定 / 例) | 4 / 8(configurable) | `ActiveThickness` 4(`LinearStrokeCap` Round) | 4 / 任意 ✓ |
| 高さ flat / wavy | 4 / 10(8dp: 8 / 14) | `Height` 4 / `WaveHeight` 10 | t / t + 6 ✓ |
| gap | 4 | `TrackActiveSpace` 4 | 4 ✓ |
| stop 径 / trailing | 4 / 0(8dp: 2) | 4 / `(h-4)/2` ≤ 6 | 4 / 0・2 ✓(任意 t は軽微) |
| 低 progress | 点になる | round cap で最小 thickness 径 | **細片 ✗ PI4** |
| wave amplitude / wavelength | 3 / 40(indet 20) | 幾何 3 / 40(20) | 3 / 40(20)✓ |
| 幅 | 要素幅いっぱい | 240(既定) | 100% ✓ |
| RTL | 反転 | 反転(`rotate(180f)`) | flat ✓ / **wavy ✗ PI2** |

### Circular 寸法(dp)

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 外径 flat 4 / flat 8 | 40 / 44 | `Size` 40 | **48 / 48 ✗ PI1** |
| 外径 wavy 4 / wavy 8 | 48 / 52 | `WaveSize` 48 | 48(+1.6 はみ出し)/ 48 **✗ PI1** |
| stroke / gap | 4dp / 4dp(dp 固定) | dp 固定 | **`size` に比例 ✗ PI1**(24 で 2px) |
| wave amplitude / wavelength | 1.6 / 15 | star 形状 / 15 | 1.6 / 15 ✓ |
| 範囲 | 24〜240 | — | 任意 ✓ |

### 色・形

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| active indicator | primary | Primary | primary ✓ |
| track | secondary-container | SecondaryContainer | secondary-container ✓ |
| stop | primary | Primary | primary ✓ |
| 形 | fully rounded | CornerFull / Round cap | 全て round ✓ |
| forced colors | 3:1(a11y) | — | **flat linear 消失 ✗ PI3** |

### モーション

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| linear indeterminate | 伸縮しながら track を移動 | 1750ms、head/tail の delay・duration、EA | 完全一致 ✓ |
| circular indeterminate 周期 / global | — | 6000 / 1080° linear | wavy ✓ / **flat 6.183s CSS ✗ PI5** |
| 追加回転 | — | 90° を 300ms + 1200ms 静止 ×4 | **1500ms 連続 ✗ PI5** |
| sweep | — | 0.1 → 0.87 → 0.1 | wavy ✓(easing 差)/ **flat 0.15–0.85 ✗ PI5** |
| wave 流速 | — | 1 wavelength / s | ✓ |
| amplitude tween | — | 500ms standard / EA | ✓ |
| determinate progress | — | 推奨 spring / tween 500 | 400ms CSS / 600ms JS(軽微) |
| reduced motion | — | InfiniteAnimationPolicy のみ | linear・wavy は停止、**flat circular は回る**(軽微) |
| VRT | — | — | reduced motion + animations disabled で撮影 — モーション差は写らない |

### a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| role | progress bar | progressBarRangeInfo / progressSemantics | `role="progressbar"` ✓ |
| 値 | — | 0..1 | min 0 / max 1 / now(determinate のみ)✓(valuetext は軽微) |
| 名前 | 用途を説明するラベル必須 | — | 呼び出し側の `aria-label`(強制なし — 軽微) |
| TalkBack 用の縦方向 bounds 拡張 | — | linear に 10dp(`IncreaseVerticalSemanticsBounds`) | Android 固有 — 対象外 |
| axe | — | — | jsdom / 実ブラウザとも違反なし ✓ |

## 手順メモ(今回わかったこと)

- progress indicators の specs は token-viewer が2つ(上段が現行の3セット、下段「Baseline tokens」は `[Deprecated]` の旧セット)。
  現行 Linear / Circular セット内にも `[Deprecated] … thick` フォルダが混ざる — 8dp の値は寸法図で確認すること。thick の token ラベルは
  取り違えがある
- Compose の wavy の本体は `WavyProgressIndicator.kt` ではなく `internal/LinearWavyProgressModifiers.kt` /
  `internal/CircularWavyProgressModifiers.kt`。`ActiveWaveAmplitude` token は未参照で、amplitude は幾何から出る
- Compose の `keyframes { v at t using E }` の easing は **t から始まる区間**に掛かる(animation-core の KDoc)。コメントの意図と
  実挙動がずれることがあるので、定数と `using` の位置で読むこと
- forced colors の検証は `emulateMedia({ forcedColors: 'active' })` + computed `background-color` で十分。`background-color` で描いた線は
  Canvas に潰れ、SVG の `fill` / `stroke` は Chromium では残る
- 固定 `viewBox` + `width={size}` の SVG は stroke も拡縮される — 属性値ではなく `size / 48` を掛けた実効値で比べること
