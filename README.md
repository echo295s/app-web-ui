# app-web-ui

GitHub Pages で静的フロントエンドを公開するリポジトリです。

- `index.html`: ログインページ
- `post.html`: 投稿フォーム
- `script.js`: API 呼び出しと `sessionStorage` によるトークン管理
- `style.css`: 共通スタイル
- `gas/`: Google Apps Script API コード

実際のパスワードは Apps Script のスクリプト プロパティに
`APP_PASSWORD` として保存します。

パスワードをこのリポジトリにコミットしないでください。
