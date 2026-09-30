# LoadingIndicator 監査レポート(2026-09-30)

Phase B。`src/components/LoadingIndicator/` の `LoadingIndicator`(`variant: 'uncontained' | 'contained'`、`value?`(0..1、省略で
indeterminate)、`size?`(既定 48)、`color?` / `containerColor?`)を3ソースで突き合わせた:

1. **m3.material.io/components/loading-indicator/specs** + **/guidelines** + **/accessibility** — Playwright MCP で token-viewer
   (セットは「Loading indicator」の1つだけ)を expand_all で取得。曖昧な色は token 行の詳細(md.sys → md.ref)で確認。寸法図
   (uncontained / contained)を `=w1400` で取得して読んだ
2. **Compose androidx-main** — `LoadingIndicator.kt`(`LoadingIndicator` / `ContainedLoadingIndicator` の determinate / indeterminate、
   `LoadingIndicatorDefaults`、`calculateScaleFactor`、`processPath`、定数)、`MaterialShapes.kt`(使用する8形状)、
   `tokens/LoadingIndicatorTokens.kt`(v0_7_0)。`ComposeMaterial3Flags.kt` に関連フラグなし
3. **実装** — `LoadingIndicator.tsx`、`LoadingIndicator.module.css`、テスト(7件、全通過)、ストーリー4話(Indeterminate / Contained /
   Determinate / Sizes)。Storybook(dev)で rAF ごとの `transform` を2秒間サンプリング(121フレーム)、reduced motion、forced colors、
   実ブラウザ axe-core 4.10.2(全4話、違反なし)
4. **既存の実測メモ** — 形状は公式 Material 3 Design Kit(Figma、file `HGpxtTV71335KHrmUiiubb`)の7ベクター(`Steps=1..7`)から
   128 点の等角半径でトレースしたもの、モーションは m3.material.io の参照動画から実測したもの(ループ ≈ 4.7s = 7 × ~0.67s、
   hold ~350ms + morph ~300ms、+90° キック、global ~4666ms / 回転)。**このコンポーネントの形状とモーションは公式 Figma / m3 の
   動画を Compose の既定より優先する**という過去の判断があり、本監査でもそれに従う(形状の相対サイズを揃えない件は再指摘しない)

**共有実装について**: `Ripple` / `FocusRing` / `useModal` は使わない(非インタラクティブ)。ProgressIndicator とは**コードを共有しない**
(easing・rAF ループとも独自)。モーションは全て JS の rAF(毎フレーム `setState` で path 文字列と `transform` を更新)、CSS は色のみ。
VRT は reduced motion で撮るため **indeterminate は SoftBurst の静止フレームで写り、モーションの差は VRT に出ない**。

**前提 — 決定済み事項**: `color` / `containerColor` を生の CSS 文字列で受ける契約は Phase A の **A6**(「グラフィック系の明示的例外として維持」)
で決定済み。数値 px の `size` は **A1** で維持。どちらも再指摘しない。Compose の `LoadingIndicator` / `ContainedLoadingIndicator` の2分割は
`variant` prop に畳まれている(CLAUDE.md の API 方針どおり)。

## 結論サマリ

**一致している(修正不要)**:

- **寸法**: 全体 **48dp**、shape container **38dp**(site 寸法図「the size is 48dp while the shape container is 38dp」、Compose
  `ContainerWidth/Height` 48 / `ActiveSize` 38)。実装 `VIEWBOX` 48・`ACTIVE_RADIUS` 19
- **拡縮**: 既定 48、`size` で任意に拡縮し **container と active の比率を保つ**(site「The ratio between the container and the active
  indicator stays the same when resizing」、24〜240dp)。実装は viewBox ごと拡縮するので比率一定
- **色 uncontained**: active = **primary**(site `#6750A4`、Compose `ActiveIndicatorColor`)
- **色 contained**: container = **primary-container**(site `#EADDFF` → md.sys.color.primary-container)、active =
  **on-primary-container**(site `#4F378B` → md.sys.color.on-primary-container / primary30、Compose `ContainedActiveColor`)
- **container 形状**: **円**(site「The container is a circle」、token Fully rounded、Compose `ContainerShape = CornerFull`)
- **形状の列**: **SoftBurst → Cookie9 → Pentagon → Pill → Sunny → Cookie4 → Oval** の7形状を循環(site「a looping shape morph sequence
  composed of seven unique Material 3 shapes」、Compose `IndeterminateIndicatorPolygons` と同順)
- **モーションの cadence**: 1形状あたり **650ms**(Compose `MorphIntervalMillis` 650、実測で morph 開始間隔 650〜667ms)、global rotation
  **4666ms / 360° linear**(Compose `GlobalRotationDurationMillis`)、各 morph で **+90°**(Compose `QuarterRotation`)、回転 =
  `global + 累積 + 進捗 × 90`(Compose `progress * 90 + morphRotationTargetAngle + globalRotation`、時計回り)。spring の overshoot を
  回転に残す点も Compose と同じ
- **morph spring**: damping ratio **0.6**(Compose `spring(0.6, 200)`)。実装は固有角振動数 16.7(stiffness ≈ 279 相当)の固定長ステップ
  応答 — 実測した参照動画の cadence に合わせた意図的な調整(裁定参照)
- **determinate の形状列**: Circle → SoftBurst の1段 morph(Compose `DeterminateIndicatorPolygons`)。ただし回転は LI1
- **a11y**: `role="progressbar"`、determinate で `aria-valuemin=0` / `aria-valuemax=1` / `aria-valuenow`、indeterminate で value 属性なし
  (site a11y「It should use the progress bar accessibility role」、Compose `progressBarRangeInfo` / `progressSemantics()`)。ストーリーは
  `aria-label` 付き。axe は jsdom・実ブラウザとも違反なし
- **forced colors**: SVG の `fill` は Chromium の forced colors で上書きされず、形状・container とも表示が残る(実測)
- **HTML 属性パススルー / ref**: `{...rest}` と ref はルート `<svg>`

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| LI1 | **determinate の回転方向と量が違う(開始の円の位相も)** | `rot = value * 90`(**時計回り 90°**)、morph 元は半径 0.88 の等角サンプル円(位相なし) | Compose determinate: `rotate(-progressValue * 180)`(ソース注記「Rotate counterclockwise」)= **反時計回り 180°**、morph 元は `MaterialShapes.Circle` を **18°(360/20)回転**したもの(「for smoother morphing to soft-burst」)。site は determinate を記述しない(矛盾なし) | 低 |

Issue: LI1 → #274

**VRT への影響**: LI1 は `Determinate` ストーリー(`value=0.6`、時計回り 54° → 反時計回り 108°)の baseline が変わる。indeterminate の
モーション(cadence・spring・scale)は VRT では見えない。

**軽微(判断・記録のみ)**:

- **morph 中の scale pulse(最大 1.1 倍)**: 実装は morph 中に `1 + 0.1 · sin(π·t)` で拡大する(実測 maxScale 1.1)。Compose は scale を
  **掛けない**(`processPath` の `scaleFactor` は形状を container に収める固定係数。indeterminate のコメント「We scale the drawing to
  simulate some bounciness」は古く、該当コードはない)。m3 の参照動画由来かどうかは記録がなく未検証 — 参照動画を再計測して判断する
- **hold → morph の順序**: 実装は「350ms 静止 → 300ms morph」、Compose は「650ms ごとに spring を開始(約 300ms で閾値 0.1 に到達し、
  残りは静止)」。定常状態では位相がずれるだけで見え方は同じ。Compose は閾値到達時に次の形状へ snap するので最大 10% の跳びがある
  (実装は shape を [0,1] に clamp して跳びなし)
- **形状の相対サイズ**: Compose は全形状に共通の `calculateScaleFactor`(回転してもはみ出さない最小倍率)× 38/48 を掛け、各形状は
  `normalized()`。実装は Figma ベクターの実寸半径(SoftBurst 0.91、Cookie4 0.88、Oval 0.94 …)。過去の判断(Figma 優先、相対サイズを
  保つ)どおりで、再指摘しない。determinate の円(半径 0.88)は Figma に対応物がない推定値
- **reduced motion**: indeterminate は SoftBurst の静止画になる(実測で変化なし)。site / Compose とも規定なし(Compose は
  `InfiniteAnimationPolicy` のみ)。静止した loading indicator は「何も起きていない」ように見える懸念があり、回転だけ残す等の方針は
  ProgressIndicator の同件(progress-indicator.md 軽微欄)と揃えて決めること
- **accessible name の強制なし**: site は用途を説明するラベルを必須とするが、ラベルなしでも axe 4.10 は違反を出さない(実ブラウザで確認)。
  JSDoc で明示する程度
- **determinate の存在**: site guidelines は loading indicator を「short, indeterminate wait time」向けとし、「Don't transition a loading
  indicator into a progress indicator」。determinate は Compose(pull-to-refresh の引っ張り量表示)由来で、site に記述はない。
  維持してよいが、JSDoc で用途(pull-to-refresh 等のジェスチャ量)を示すとよい
- **uncontained の container token**: site には「Loading indicator container color = **secondary-container**」の行があるが、Compose の
  token にも実装にも対応物がない(uncontained は `containerColor = Color.Unspecified`)。裁定参照
- **Compose は container shape で clip する**: uncontained でも 48dp の円で clip。実装は `overflow: visible` だが scale 1.1 でも半径
  約 19.6 < 24 で、はみ出しはない
- **パフォーマンス**: 毎フレーム 128 点の path 文字列を再生成して `setState`。実測 60fps(2秒で121フレーム)。多数同時表示は要観察

**CONFIRMED は LI1 の1件のみ**。寸法・色・形状列・cadence・a11y は一致。

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| uncontained の container color | token「Loading indicator container color」= secondary-container | token なし、uncontained は Unspecified | site の行は contained 以外で使う場面がない孤立 token。guidelines「It's not needed when … placed directly on a surface」→ **uncontained に container は描かない**(実装どおり) |
| size token のラベル | 「container width **38** / container height 48 / active indicator size **48**」 | `ContainerWidth` 48 / `ContainerHeight` 48 / `ActiveSize` 38 | site のラベル取り違え(寸法図と prose は 48 / 38)。**48 / 38**(実装どおり) |
| 形状の出典と大きさ | 7形状の列(形の詳細は Figma kit) | `MaterialShapes` の多角形を normalized + 共通倍率 | 過去の判断で **Figma kit の実寸**を採用済み(実装どおり) |
| morph spring | 参照動画の実測: hold ~350 + morph ~300ms | `spring(0.6, 200)` を 650ms ごと、閾値 0.1 | cadence 650ms・ζ 0.6 は一致。固有振動数の差(16.7 vs 14.1)は実測動画に合わせた調整として**実装どおり** |
| scale pulse | 未検証(実測メモに記載なし) | なし(古いコメントのみ) | 判断保留(軽微欄)— 参照動画の再計測で決める |
| determinate の回転 | 記述なし | 反時計回り `-p × 180` | Compose に従う(LI1) |
| reduced motion | 記述なし | InfiniteAnimationPolicy のみ | Web 固有の判断(軽微欄) |

## 詳細対照表

### 寸法・色・形状

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| 全体サイズ | 48(24〜240) | 48 | 48(`size`)✓ |
| shape container | 38 | `ActiveSize` 38 | 38(`ACTIVE_RADIUS` 19)✓ |
| 拡縮時の比率 | 一定 | —(固定サイズ) | viewBox 拡縮で一定 ✓ |
| uncontained active | primary | Primary | primary ✓ |
| contained container | primary-container | PrimaryContainer | primary-container ✓ |
| contained active | on-primary-container | OnPrimaryContainer | on-primary-container ✓ |
| container 形状 | 円(fully rounded) | CornerFull | `<circle r=24>` ✓ |
| 形状列(indeterminate) | 7形状ループ | SoftBurst, Cookie9, Pentagon, Pill, Sunny, Cookie4, Oval | 同順 ✓ |
| 形状列(determinate) | — | Circle(18° 回転)→ SoftBurst | 円(位相なし)→ SoftBurst(**LI1**) |

### モーション

| 項目 | 参照(site 動画実測 / Compose) | 実装 |
|---|---|---|
| 1形状あたり | ~650〜670ms / 650ms | 350 + 300 = 650ms(実測 650〜667)✓ |
| morph spring | ζ 0.6 / `spring(0.6, 200)` | ζ 0.6、ωn 16.7 の固定長応答 ✓(裁定) |
| morph ごとの回転 | +90° / +90° | +90°(overshoot は回転に残す)✓ |
| global rotation | ~4.7s / 4666ms linear | 4666ms linear ✓ |
| scale | 未検証 / なし | 最大 1.1(軽微) |
| determinate 回転 | — / `-p × 180`(反時計回り) | **`+p × 90` ✗ LI1** |
| reduced motion | — / — | 静止 SoftBurst(軽微) |
| VRT | — | reduced motion で静止フレーム — モーション差は写らない |

### a11y

| 項目 | site | Compose | 実装 |
|---|---|---|---|
| role | progress bar | progressSemantics / progressBarRangeInfo | `role="progressbar"` ✓ |
| 値 | — | determinate のみ 0..1 | determinate のみ min/max/now ✓ |
| 名前 | 用途のラベル必須 | — | 呼び出し側の `aria-label`(強制なし — 軽微) |
| 3:1 コントラスト | active と背景の間(container は不要) | — | primary / on-primary-container の既定色で成立。forced colors でも表示が残る ✓ |
| axe | — | — | jsdom / 実ブラウザとも違反なし ✓ |

## 手順メモ(今回わかったこと)

- loading indicator の specs は token セットが1つで、色 token 行をクリックすると詳細パネルに md.sys → md.ref が出る
  (`.token-value-color` を `page.evaluate` でクリック。`info` ボタンはこのページにはない)
- rAF 駆動のモーションは、`page.evaluate` 内で `requestAnimationFrame` を回して `transform` 属性をフレームごとに記録すると
  cadence(morph 開始間隔)と scale を数値で取れる — スクリーンショットより確実
- Compose の LoadingIndicator のコメントには古いもの(「coerced progress」「We scale the drawing」)がある。コードと突き合わせること
