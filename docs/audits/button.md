# Button 監査レポート(2026-07-17)

Phase B パイロット監査。3ソースを突き合わせた:

1. **m3.material.io/components/buttons/specs** — Playwright MCP でトークンテーブル10セット
   (Color×5, Size×5)を全展開して取得
2. **Compose androidx-main** — `Button.kt` / `ToggleButton.kt` / `ButtonDefaults` /
   `*ButtonTokens.kt`(v0_11_0)/ `StateTokens` / `MotionScheme`
3. **実装** — `src/components/Button/Button.tsx`, `Button.module.css`, テスト・ストーリー

## 結論サマリ

**一致している(修正不要)**: 高さ(32/40/56/96/136)、square シェイプ(12/12/16/28/28)、
pressed シェイプ(8/8/12/16/16)、round=calc(height/2)、タイポグラフィ対応
(labelLarge/labelLarge/titleMedium/headlineSmall/headlineLarge)、S〜XL のパディングと
アイコンサイズ、outline 幅(1/1/1/2/3)、Filled/Tonal/Elevated の全カラー(トグル含む)、
state layer 0.08/0.10/0.10、elevation(elevated: rest L1・hover L2・disabled 0 /
filled・tonal: rest L0・hover L1)、native button による Enter/Space 操作、`aria-pressed`。

**要修正(両ソース一致 = CONFIRMED)**:

| # | 発見 | 実装 | あるべき値 | 深刻度 |
|---|---|---|---|---|
| B1 | XS のパディングとアイコン間隔 | 16px / gap 8px | **12dp / gap 4dp**(site: 12-4-12、Compose: `ExtraSmallContentPadding`=12, spacing=4 ハードコード) | 中 |
| B2 | **トグル選択時のシェイプ変化が未実装** | selected でシェイプ不変 | round(未選択)→ square(選択)。square 始まりなら逆。Compose `ToggleButtonShapes.checkedShape` = SelectedContainerShapeSquare(S=12dp)。優先度 pressed > checked > default | 高(Expressive の主要モーション欠落) |
| B3 | Outlined の label/icon/state-layer 色 | `primary` | **`on-surface-variant`**(Expressive で変更。site: #49454F、Compose OutlinedButtonTokens v0_11_0 全状態)| 中(視覚差分あり) |
| B4a | disabled container 不透明度 | on-surface **12%** | on-surface **10%**(site 0.1、Compose v0_11_0 0.10)| 低 |
| B4b | Outlined disabled の枠線色 | on-surface 12% | **outline-variant @ 0.1**(Compose `outlinedButtonBorder(enabled=false)`。site も outline-variant)| 低 |
| B5 | 押下シェイプモーフのばね | `cubic-bezier(0.34,1.4,0.5,1)` 250ms(強めのオーバーシュート) | site トークン: damping **0.9** / stiffness **1400** ≒ 約120-150ms・ごく僅かなオーバーシュート。Compose の通常 Button は DefaultEffects(1.0/1600、バウンスなし・意図的)。トグルのみ FastSpatial(Expressive: 0.6/800 = 明確なバウンス) | 低 |

**軽微(判断・記録のみ)**:

- **min-width**: 実装 64px、Compose `MinWidth` = **58dp**(site に記載なし)。Compose 準拠なら 58px へ
- **text バリアントの md パディング 16px** は根拠なし(Compose の TextButton は 12,8,12,8 のみ定義。
  アイコン付きは 12,8,16,8)。lg/xl の text は通常値のままで妥当か要検討
- **トグルの pressed シェイプ**: Compose は 6dp ハードコード(通常 Button は 8dp)。トークン裏付けなし
  → 8dp のままで可
- **text バリアント + toggle**: 仕様上 text にトグルは存在しない。実装は許容して無スタイル。
  JSDoc に明記するか、dev 警告を出すか(現状維持でも実害小)
- テスト追加候補: Space キー活性化、トグルの controlled 固定(クリックしても変わらない)、
  disabled + toggle、B2 実装後の shape 状態

## ソース間の食い違い(スペック優先順位で裁定)

| 項目 | m3.material.io | Compose | 裁定 |
|---|---|---|---|
| disabled label 色 | on-surface @38%(#1D1B20) | **on-surface-variant** @38%(v0_11_0) | site 優先 → **on-surface 維持**(現実装のまま) |
| Text label 色 | Primary | トークンは on-surface-variant だが実装は primary(TODO コメント付き) | 両者実質一致 → **primary 維持** |
| 押下モーフのばね | 0.9 / 1400 | DefaultEffects 1.0 / 1600(バウンス抑止を明記) | site 優先 → 0.9/1400 相当。CSS 近似: 約150ms + ~2% オーバーシュート |
| FilledTonal disabled | 0.1 | legacy ファイル(FilledTonalButton が参照)は 0.12、新 TonalButtonTokens は 0.10 | site 優先 → 0.10 |

## 詳細対照表

### サイズ(spec = site と Compose 実装値が一致した確定値)

| | XS | S | M | L | XL |
|---|---|---|---|---|---|
| 高さ | 32 ✓ | 40 ✓ | 56 ✓ | 96 ✓ | 136 ✓ |
| leading/trailing | **12(実装16 ✗)** | 16 ✓ | 24 ✓ | 48 ✓ | 64 ✓ |
| icon-label gap | **4(実装8 ✗)** | 8 ✓ | 8 ✓ | 12 ✓ | 16 ✓ |
| icon | 20 ✓ | 20 ✓ | 24 ✓ | 32 ✓ | 40 ✓ |
| outline 幅 | 1 ✓ | 1 ✓ | 1 ✓ | 2 ✓ | 3 ✓ |
| typescale | labelLarge ✓ | labelLarge ✓ | titleMedium ✓ | headlineSmall ✓ | headlineLarge ✓ |

### カラー(バリアント別、全状態確認済み)

- **Filled** ✓ / トグル未選択(surface-container + on-surface-variant)✓ / 選択 ✓
- **Tonal** ✓ / 選択(secondary + on-secondary)✓
- **Elevated** ✓ / 選択(primary + on-primary)✓
- **Outlined**: 枠線 outline-variant ✓ / **label は on-surface-variant であるべき(B3)** /
  選択(inverse-surface + inverse-on-surface、枠線消滅)✓ — Compose では選択時の枠線消滅は
  幅→0 と色→transparent のスプリングアニメーション(実装は即時。低優先)
- **Text**: primary ✓(トグルなし ✓)

## パイロットで確立した監査手順(スキル化の素材)

1. **m3.material.io**: `browser_navigate` → 3s wait → `page.evaluate` で innerText 取得(構成・
   状態・シェイプモーフ・Measurements 節)。トークンテーブルは
   `button.active-token-set-button` クリック → メニュー(`[role="menuitem"]`)からセット選択 →
   `expand_all` クリック → token-viewer の innerText 抽出、を全セット分ループ
2. **Compose**: サブエージェントに raw.githubusercontent.com の `.kt` 取得を委譲
   (`Button.kt` 本体 + `tokens/Button*Tokens.kt` + `ShapeTokens`/`TypeScaleTokens`/
   `MotionScheme`)。トークン名だけでなく **ButtonDefaults の実装値**(TODO で上書きされた
   ハードコード)を必ず併記させる — トークンと実装が食い違う箇所が今回3件あった
3. **突き合わせ**: サイズ表 → シェイプ表 → カラー表(状態×トグル)→ 不透明度 → モーション →
   挙動(キーボード・ARIA)の順。食い違いはスペック優先順位
   (m3.material.io > Compose > material-web)で裁定し、裁定理由を残す
4. 修正は Issue 化して監査レポートとは別 PR で実施
