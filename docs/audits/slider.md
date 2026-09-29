# Slider 監査レポート(2026-07-19)

Tier 1 監査(最終)。ソース: ① m3.material.io sliders(共通+サイズ別トークン、寸法表)
② Compose androidx-main(Slider.kt 3,876行 + SliderTokens v2_3_5)③ 実装+テスト。

## 前提となる確認事項

- **Compose に Expressive サイズ変種(XS〜XL)は存在しない**(トークンファイルは1つ、幾何は
  16dp トラック固定)。サイズ体系の根拠は m3.material.io のみ(site 自身も「S〜XL はトークン
  提供のみ」と明記)。実装が site トークンで全サイズを持つのは妥当
- **Compose の Slider にモーション API は皆無**(グレップ検証済み)。ハンドルのスクイーズも
  瞬時切替。スプリング値を求めない
- サイズ語彙: site のラベルは **XS/S/M/L/XL** — 実装の `'xs'|'s'|'m'|'l'|'xl'` は site と一致
  (Button 系の `sm/md/lg` との統一は Phase A #12 の判断材料として記録)

## 結論サマリ

**一致(修正不要)**: トラック高 16/24/40/56/96 / ハンドル 4×44/44/52/68/108 / 外側コーナー
8/8/12/16/28 / トラック-ハンドル間 6dp クリアランス / active=primary・inactive=secondary-container /
disabled 0.38/0.12/0.38 / value label(inverse-surface ピル、focus で表示)/ tick 色の反転
(active 上=secondary-container・inactive 上=primary — Compose 実装と一致)/ 矢印・Home/End
(native input)/ Range の2サム個別操作と交差クランプ(Compose と同挙動)/ 48dp タッチターゲット /
controlled/uncontrolled / MUI 同様の「配列 value で range」API。
サイト内の寸法表(M ハンドル 52dp)とサイズトークン(44dp)の矛盾は**寸法表を採用**(トークン側は
XS 値の重複記載と判断。実装は既に 52dp)。

**要修正(CONFIRMED)**:

| # | 発見 | 実装 | あるべき姿 | 深刻度 |
|---|---|---|---|---|
| SL1 | **キーボードフォーカスの可視表示が皆無** — native input は opacity:0(既定 outline も不可視)、thumb への focus スタイルなし。value label の表示のみ | なし | focus 時ハンドル幅 **4→2dp スクイーズ**(site FocusHandleWidth・Compose 実装とも 2dp)+ ハンドル周囲にフォーカスリング(Compose は theme-gated inset ring: 外 2dp/内 3dp、thumb 周囲 4dp パディング。本ライブラリでは FocusRing 規約に接続) | **高** |
| SL2 | pressed/drag 中のハンドルスクイーズなし(4px 固定) | なし | press/drag 中 **2dp**(hover は 4dp のまま — Compose HoverHandleWidth=4dp)。切替は瞬時(Compose にアニメーションなし) | 中 |
| SL3 | vertical で `aria-orientation="vertical"` 未設定 | なし | ARIA 要件。native range の既定は horizontal | 中(a11y) |
| SL4 | **PageUp/PageDown の大ステップ移動なし** | native 依存(ブラウザ差) | Compose: `(steps/10).coerceIn(1,10)` デルタ = 連続値で **10%**。ブラウザ実装差を検証し、不足分を onKeyDown で補完 | 中 |
| SL5 | **トラック内側コーナー**(ハンドル側)が外側と同じ radius | border-radius: inherit | ハンドルに面する側は **2dp**(Compose TrackInsideCornerSize ハードコード) | 低 |
| SL6 | Range のサムラベルが英語ハードコード("Minimum"/"Maximum") | 固定 | prop で上書き可能に(Compose は localized Strings 相当)。ローカライズ不能は出荷品質として不可 | 中(a11y) |
| SL7 | `valueLabelFormat` 指定時に `aria-valuetext` 未設定 | なし | 表示値と読み上げ値の一致(APG) | 中(a11y) |
| SL8 | stop indicator の色 | primary | **site 現行トークン優先**: inactive トラック上=on-secondary-container(#4A4458)、active トラック上=on-primary(#FFF)。※三つ巴の食い違いあり(下表) | 低 |
| SL9 | テスト: キーボード0件(矢印/Home/End/PageUp)、ドラッグ0件、vertical 挙動未検証、fireEvent.change のみ | — | SL1〜SL7 実装と併せて整備 | 中 |

**記録のみ**: thumb transform 100ms transition は無害(Compose は無アニメだが Web の連続値スライドでは
妥当)/ Range の per-thumb ステップ配分(Compose は動的 sub-range)は現状クランプで実質同等 /
state layer 40dp は site で deprecated — 追加**しない**のが正(Expressive はスクイーズ+value label が
フィードバック)。

## ソース間の食い違い(裁定)

| 項目 | site | Compose トークン | Compose 実装 | 裁定 |
|---|---|---|---|---|
| stop indicator 色 | active上=on-primary / inactive上=on-secondary-container | SecondaryContainer | primary で描画 | **site**(最新版) → SL8 |
| stop trailing space | 4dp | 6dp | cornerSize インセット | site の 4dp とし、視覚上は現行(6px)と大差なし — SL8 実装時に 4dp 基準へ |
| M サイズのハンドル高 | 寸法表 52dp / サイズトークン 44dp(site 内部矛盾) | (変種なし) | 52px | **寸法表 52dp**(実装維持) |
| フォーカス表示 | ハンドル 2dp スクイーズ(focus indicator トークンなし) | FocusHandleWidth 2dp | 2dp + theme-gated inset focus ring | スクイーズ+リング両方(WCAG 可視性と library 規約)→ SL1 |
| サイズ変種の存在 | XS〜XL(トークン) | なし | なし | site 採用(実装済みを維持)— 「Compose が変種を規定」の原則の明示的例外として記録 |

## スキルへのフィードバック

- 「Compose が変種の存在を規定する」原則には例外がある — site が「トークンのみ提供」と明記する
  構成(Slider の S〜XL、vertical)は site を根拠にしてよい。裁定として残すこと
- native `<input type="range">` を透明オーバーレイする構造では、**ブラウザ既定のフォーカス
  リングも一緒に消える**ことに注意(opacity:0)。native 要素ベースでもフォーカス可視化の監査は省略
  しない
