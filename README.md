# ESTIMA SETTING

スロットの設定判別・設定差をまとめた静的サイト（主にスマホ閲覧向け）。
ビルド不要。HTML + JS + JSON のみで動きます。

## 見るには

`fetch` で JSON を読むため、`file://` では開けません。簡易サーバー経由で開きます。

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

GitHub Pages / Cloudflare Pages などの静的ホスティングにそのまま置けます。

## 構成

```
index.html              機種一覧（リスト形式 + 検索 + タイプ絞り込み）
machine.html            機種ページ共通テンプレート（?id=<機種ID>）
css/style.css           ベースデザイン（提供された style.css。基本は編集しない）
css/app.css             本サイト専用の追加スタイル
js/common.js            共通関数（検索の正規化・ハイライト等）
js/index.js             一覧ページのロジック
js/machine.js           機種ページの描画 + ページ内検索
data/machines.json      ★機種リスト用（一覧に出す情報・検索キーワード）
data/machines/<id>.json ★機種ごとの解析データ（1機種 = 1ファイル）
images/                 画像置き場
```

機種ページは HTML を機種ごとに作らず、`data/machines/<id>.json` を `machine.html` が描画します。
**機種を増やすときは JSON を 2 つ触るだけ**で、HTML / JS の修正は不要です。

## 機種を追加する手順

1. `data/machines/<id>.json` を作る（`tokyoghoul.json` をコピーして書き換えると早い）
2. `data/machines.json` の `machines` に 1 件追加する
3. `images/` に画像を置き、`image` にパスを書く（任意）

### data/machines.json（一覧用）

| キー | 内容 |
| --- | --- |
| `id` | 機種ID。`data/machines/<id>.json` のファイル名と一致させる（英数字・`-`・`_`） |
| `name` / `kana` | 表示名 / 読み（ひらがな。検索用） |
| `maker` / `type` / `intro` / `payout` | メーカー / タイプ（絞り込みチップになる） / 導入日 `YYYY-MM-DD` / 機械割 |
| `image` | 一覧サムネ画像パス（例 `images/tokyoghoul.jpg`）。空なら頭文字のプレースホルダー |
| `tags` | 略称・別名（例 `ミリゴ`）。検索にヒットする |
| `keywords` | 演出名などの検索語。一覧で検索すると `MATCH` として表示される |

検索は、全角/半角・大文字/小文字・カタカナ/ひらがなを区別しません。スペース区切りで AND 検索です。

### data/machines/<id>.json（機種ページ用）

- `image` : 機種ページ上部の**背景画像**（任意。薄く・ぼかして表示。例 `images/tokyoghoul.webp`）。パスは `/` 区切りで書く（`\` はNG）
- `spec` : `[{k, v}]` スペック表
- `summary` : `{title, items[]}` 判別の優先順位
- `todo` : `{title, items[]}` やることリスト（判別の優先順位の直下に表示。任意）
  - `items[]` : `{lv, text, ref}`。`lv` は `メイン` / `補助` / `示唆`（優先順に並べる）、`text` は本文（`**太字**`可）、`ref` は対応する `sections[].title`（「見る」ボタンでその解析ブロックへジャンプ）
  - チェック状態は端末の `localStorage` に機種ごとに保存。「リセット」で全解除
- `sections[]` : 解析ブロック（見出し）
  - `title`, `tag`（`メイン` / `補助` / `示唆` / `その他`）, `lead`, `note`
  - `image` : **見出しごとの画像**（任意。例 `images/tokyoghoul/cz-end.png`）
  - `tables[]` : `{caption?, head[], rows[][]}`。`head[0]` が `設定` の表は設定6行を強調
  - `items[]` : 箇条書き
- `sources[]` : `[{label, url}]` 出典

文字列中の `**太字**` は強調表示になります（HTML は使えません）。

## 検索

- 一覧: 機種名・読み・メーカー・タイプ・略称・演出キーワードを横断検索
- 機種ページ: 画面上部に固定された検索バーで、見出し・表・本文を絞り込み。目次は横スクロールで、スクロール位置に追従

## 注意

- 掲載数値は各解析サイトの公表・調査値を整理したものです。機種ごとの `sources` を参照し、最新情報を確認してください。
- 一部、設定1のみ判明している項目（東京喰種の有馬乱入選択率など）は、判明している範囲のみ記載しています。
