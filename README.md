# app-web-ui

GitHub Pages で静的フロントエンドを公開するリポジトリです。

https://echo295s.github.io/app-web-ui/

- `index.html`: ログインページ
- `apps/index.html`: ログイン後のアプリ選択ページ
- `apps/data-management/`: データ管理アプリ
- `apps/dummy/`: ダミーアプリ
- `js/`: 共通の認証、API 呼び出し、`sessionStorage` によるトークン管理
- `style.css`: 共通スタイル
- `gas/`: Google Apps Script API コード

## 設定

フロントエンドの接続先は `js/config.js` の `API_ENDPOINT_URL` に設定します。

Apps Script のスクリプト プロパティには、必要に応じて以下を設定します。

- `APP_PASSWORD`: ログイン用パスワード
- `DATA_SPREADSHEET_ID`: 保存先スプレッドシートID
- `DATA_SHEET_NAME`: 保存先シート名。省略時は `raw_data`

パスワードをこのリポジトリにコミットしないでください。

## 入力プリセット

- JSON: 任意のキーと値を登録する
- 記事: `type`、`title`、`body` を登録する
- TODO: `type`、`checked`、連番のTODO項目を登録する
