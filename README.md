# app-web-ui

GitHub Pages で静的フロントエンドを公開するリポジトリです。

- `index.html`: ログインページ
- `post.html`: 投稿フォーム
- `detail.html`: データ詳細・更新・削除ページ
- `js/`: ページ初期化、API 呼び出し、`sessionStorage` によるトークン管理
- `style.css`: 共通スタイル
- `gas/`: Google Apps Script API コード

## 設定

フロントエンドの接続先は `js/config.js` の `API_ENDPOINT_URL` に設定します。

Apps Script のスクリプト プロパティには、必要に応じて以下を設定します。

- `APP_PASSWORD`: ログイン用パスワード
- `DATA_SPREADSHEET_ID`: 保存先スプレッドシートID
- `DATA_SHEET_NAME`: 保存先シート名。省略時は `raw_data`

パスワードをこのリポジトリにコミットしないでください。

## 現在できていること

- ログインしてセッショントークンを保存する
- JSON形式の生データを新規登録する
- 記事用プリセットで `type`、`title`、`body` を登録する
- 登録済みデータを一覧表示・検索する
- 詳細ページでデータを表示・更新・削除する
- Google Apps Script 側で `id`、`timestamp`、`rawData`、`deleted` を保存する

## 次に学ぶとよいこと

- 長い本文を安全に送れるように、作成・更新リクエストを POST 化する
- API エラー表示を共通化する
- 入力欄を増やす・消す操作のテスト観点を整理する
- GitHub Pages への公開手順と Apps Script の設定手順をREADMEに追記する
