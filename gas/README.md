# GAS API

Google Apps Script で動かす、汎用的な生データ保存APIです。
API側ではデータを加工せず、次の4列だけを保存します。

- `id`
- `timestamp`
- `rawData`
- `deleted`

## 設定

スクリプトプロパティに以下を設定してください。

- `APP_PASSWORD`: ログイン用パスワード
- `DATA_SPREADSHEET_ID`: 保存先スプレッドシートID。Webアプリがスプレッドシートに紐づくコンテナバインドの場合は省略可
- `DATA_SHEET_NAME`: 保存先シート名。省略時は `raw_data`

## 認証

```json
{
  "action": "login",
  "password": "password"
}
```

成功時:

```json
{
  "status": "success",
  "token": "session-token"
}
```

以降のリクエストでは `token` を送ります。

## CRUD

### Create

```json
{
  "action": "create",
  "token": "session-token",
  "rawData": "{\"title\":\"sample\"}"
}
```

### Read

```json
{
  "action": "read",
  "token": "session-token",
  "id": "record-id"
}
```

### List

```json
{
  "action": "list",
  "token": "session-token"
}
```

削除済みも含める場合:

```json
{
  "action": "list",
  "token": "session-token",
  "includeDeleted": true
}
```

### Update

```json
{
  "action": "update",
  "token": "session-token",
  "id": "record-id",
  "rawData": "{\"title\":\"updated\"}"
}
```

### Delete

物理削除はせず、`deleted` を `true` にします。

```json
{
  "action": "delete",
  "token": "session-token",
  "id": "record-id"
}
```

## GitHub Pages からの呼び出し

GET + JSONP に対応しています。`callback` と各パラメータをクエリ文字列に含めて呼び出せます。
POST の場合は JSON body を送ってください。
