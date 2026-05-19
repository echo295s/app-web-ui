# GAS API

このフォルダには、公開リポジトリに置いてよい Google Apps Script のコードを置きます。

実際のパスワードはこのフォルダ内のコードや README には書かないでください。

## デプロイ手順

1. Google Apps Script エディタを開く。
2. `Code.gs` の内容を Apps Script プロジェクトへコピーする。
3. プロジェクトの設定を開く。
4. スクリプト プロパティを追加する。
   - プロパティ: `APP_PASSWORD`
   - 値: 実際のログインパスワード
5. Web アプリとしてデプロイする。
6. 発行された Web アプリ URL を `script.js` の `API_ENDPOINT_URL` に設定する。

## リクエスト形式

ログイン時:

```json
{
  "action": "login",
  "password": "ユーザーが入力したパスワード"
}
```

ログイン後の通常リクエスト:

```json
{
  "token": "ログイン時に返されたセッショントークン"
}
```
