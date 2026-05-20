const APP_PASSWORD_PROPERTY = "APP_PASSWORD";
const SESSION_CACHE_PREFIX = "session:";
const SESSION_TTL_SECONDS = 21600;

/* ここからリクエスト受付 */

// WebアプリにPOSTされたリクエストの入口。
// ログイン要求だけは先に処理し、それ以外は認証後に投稿処理へ渡す。
function doPost(e) {
  try {
    const payload = parseJsonPayload(e);

    if (payload.action === "login") {
      return login(payload.password);
    }

    const authError = requireAuth(payload.token);
    if (authError) {
      return json(authError);
    }

    return handlePost(payload);
  } catch (error) {
    return json({
      status: "error",
      message: error.message || "Internal error",
    });
  }
}

// Apps ScriptのイベントオブジェクトからJSON本文を取り出す。
// 本文が空の場合は、後続処理で扱いやすいように空オブジェクトを返す。
function parseJsonPayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

/* ここから認証 */

// スクリプトプロパティに保存されたパスワードと照合し、
// 成功した場合は一時的なセッショントークンを発行する。
function login(password) {
  const savedPassword = PropertiesService
    .getScriptProperties()
    .getProperty(APP_PASSWORD_PROPERTY);

  if (!savedPassword || password !== savedPassword) {
    return json(unauthorized());
  }

  const token = Utilities.getUuid();
  CacheService
    .getScriptCache()
    .put(SESSION_CACHE_PREFIX + token, "1", SESSION_TTL_SECONDS);

  return json({
    status: "success",
    token: token,
  });
}

// 投稿などログイン後の処理に必要なセッショントークンを確認する。
// 認証に失敗した場合はエラーオブジェクト、成功した場合はnullを返す。
function requireAuth(token) {
  if (!token) {
    return unauthorized();
  }

  const session = CacheService
    .getScriptCache()
    .get(SESSION_CACHE_PREFIX + token);

  if (!session) {
    return unauthorized();
  }

  return null;
}

/* ここから投稿処理 */

// クライアントから送られた投稿内容を検証し、正常なら処理結果を返す。
function handlePost(payload) {
  const category = String(payload.category || "").trim();
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();

  if (!category || !title || !body) {
    return json({
      status: "error",
      message: "Invalid payload",
    });
  }

  // TODO: Replace this with the app's real persistence or notification logic.
  return json({
    status: "success",
  });
}

/* ここからレスポンス生成 */

// 認証エラー時に共通で返すレスポンス内容。
function unauthorized() {
  return {
    status: "error",
    message: "Unauthorized",
  };
}

// オブジェクトをJSONレスポンスとして返すための共通ヘルパー。
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
