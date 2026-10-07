# 選択コントロール監査レポート(2026-07-19)

Tier 1 監査。**Checkbox / Radio / Switch** をファミリーとして一括監査。
ソース: ① m3.material.io(checkbox / radio-button / switch 全トークン展開)② Compose androidx-main
(Checkbox.kt 14_1_0 / RadioButton.kt v0_117 / Switch.kt v0_210 + Defaults + MotionScheme)③ 実装+テスト。

## 冒頭の重要な訂正

横断監査(2026-07-15)は「Checkbox/Radio/Switch は FocusRing 不使用 → キーボードフォーカス表示が
欠落の疑い」としたが、**誤り**。3つとも FocusRing の CSS を各モジュールに複製し
`:has(.input:focus-visible)` で駆動しており、**キーボードフォーカス表示は健在**。同様に
state layer 40dp・hover 0.08 / pressed 0.10・48dp タッチターゲット(オーバーサイズの不可視
native input)・フォーム送信(name/value)・Space トグル・Radio の矢印キー移動(同一 name 時)も
**すべて正しく機能している**。アーキテクチャ(native input + CSS `:has()`)は堅実で、
sibling プリミティブがポインタ/フォーカスを観測できないという制約への合理的な回避策だった。

## 結論サマリ

**一致(修正不要)**: Checkbox 18dp/角2dp/outline 2dp(Compose 出荷実装は legacy 20dp だが
フラグ裏の修正版とトークンと site は 18dp — 実装は既に正しい側)/ Radio 外輪 20dp・2dp・
ドット visual 10dp(Compose 実装値と一致)/ Switch トラック 52×32・outline 2dp・ハンドル
16/24/24/28dp・アイコン 16dp・disabled(track 0.12, handle 0.38, selected handle surface 不透明)/
Switch のホバー時ハンドル色シフト(primary-container / on-surface-variant — **Compose 未実装だが
site 準拠で実装済み**)/ Checkbox の error 状態(Compose には API 自体が無いが site トークン準拠で
実装済み)/ 全コンポーネントの色トークン(rest 状態)。

**要修正(CONFIRMED)**:

| # | 対象 | 発見 | 深刻度 |
|---|---|---|---|
| SC1 | Checkbox | **indeterminate が視覚のみ**: native input の `indeterminate` を設定せず `aria-checked="mixed"` も無い — スクリーンリーダーには通常のチェックボックスに見える。Compose は ToggleableState 三値で正しく公開 | **高**(a11y) |
| SC2 | 3つ共通 | **押下リップル(拡張円)が無い**(state layer のフェードのみ)。site は「Pressed (ripple)」、Compose も `ripple(bounded=false, radius=20dp)` を全てに付与。制約: 現行 Ripple プリミティブは親要素のイベントを監視するが、オーバーサイズ input がイベントを奪うため 40dp レイヤーに置けない → **Ripple にリッスン対象を指定できる API を追加**して採用する | 中 |
| SC3 | 3つ共通 | FocusRing の CSS が**3ファイルに複製**(プリミティブ含め4コピー)— SC2 と同時にプリミティブ参照へ集約 | 中(保守性) |
| SC4 | Checkbox / Radio | **インタラクション時の色シフト未実装**: unselected の outline(Checkbox)/ icon(Radio)は hover/focus/press で on-surface-variant → **on-surface** に、pressed の state layer 色は**次状態の色に反転**(unselected 押下=primary、selected 押下=on-surface)— site が明示。Compose は未実装(乖離をフラグ済み)だが優先順位で site が勝つ | 低 |
| SC5 | Checkbox / Switch | **【2026-10-07 Switch 部分は撤回 — #373】** オーナー裁定(web アダプテーション)により Switch のつまみは material-web に合わせる: スライド 300ms backOut・押下時の拡大 100ms linear・解放時の縮小 250ms easing-standard(`docs/specs/switch.md` Motion 節の Superseded 注記を参照)。Checkbox の部分は有効のまま。<br>~~(旧)~~ モーション調整: Switch のスライドは 300ms backOut(明確なバウンス)だが Compose は FastSpatial(standard 0.9/1400 ≒ 200ms・ごく僅かな行き過ぎ)。Checkbox のチェック解除は Compose では**100ms 遅延スナップ**(アニメーションしない)だが実装は 350ms で逆再生 | 低 |
| SC6 | 3つ共通 | テスト欠落: Space トグル(全)、フォーム送信(FormData)、Radio の排他とラジオグループ矢印キー、Checkbox error 表示、SC1 実装後の mixed 公開 | 中 |

**判断・記録のみ(Issue 化しない — Phase A に接続)**:

- **Radio に RadioGroup が無い**(グループ形成は利用者の `name` 頼み、`role="radiogroup"`・グループ
  ラベル・selection value 管理なし)、**controlled-only**(defaultChecked なし)、`onChange(event)`
  シグネチャ — いずれも Phase A の #13(onChange 統一)・#15(controlled/uncontrolled)と重なる
  ため、決定後に実装 Issue 化する
- **組み込みのラベル関連付け API が無い**(3つとも aria-label 頼み)— label prop / children label は
  公開 API の追加なので Phase A 側で方針決定
- ~~フォーカス state layer(0.1)は site にあるが、本ライブラリは FocusRing で表現する方針(既録の
  意図的選択)— 変更しない~~ **【2026-09-23 撤回】** 3ソース裁定(`docs/specs/radio-button.md`
  Ruling R2)により方針変更: m3 と Compose の両方が focus state layer 0.10 を定義・描画しており
  (material-web のみ意図的非対応)、FocusRing に**加えて** 0.10 レイヤーを表示する。Radio は
  実装済み。Checkbox / Switch への展開は #75/#76 系のフォローアップ

## ソース間の食い違い(裁定)

| 項目 | site | Compose | 裁定 |
|---|---|---|---|
| Checkbox コンテナサイズ | 18dp | 出荷実装 20dp(legacy、TODO 付き)/ フラグ ON とトークンは 18dp | **18dp**(実装は既に正しい) |
| unselected の hover/focus/press 色シフト・pressed 反転レイヤー | 明示(全3コンポーネント) | 未実装(state layer のみ反応) | site 優先 → SC4 で実装(Switch は実装済み) |
| Checkbox error 状態 | トークンあり | API なし(dead tokens) | site 優先 → 実装済みを維持 |
| Switch checked ボーダー | (トークンなし) | Transparent ハードコード | 現状(なし)維持 |
| モーション | (規定なし) | スプリング(FastSpatial/DefaultSpatial)+ Checkbox 解除はスナップ | Compose 準拠 → SC5(**Switch のつまみは #373 で material-web 準拠に変更 — superseded**) |

## スキルへのフィードバック

- 横断監査(grep ベース)の「プリミティブ不使用 = 機能欠落」という推定は**現物を読むまで確定
  させない**こと — 今回、機能は手書き複製で満たされていた(問題は重複と ripple 欠落に限定)
- Compose のフラグ裏実装(`ComposeMaterial3Flags`)はトークンとの三つ巴になる — トークン値 =
  将来の正、出荷値 = legacy として区別して記録する
