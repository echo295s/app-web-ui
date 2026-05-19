const API_ENDPOINT_URL = "";
const API_QUERY_PARAMS = {};
const SESSION_TOKEN_KEY = "app_session_token";

const loginForm = document.querySelector("#login-form");
const postForm = document.querySelector("#post-form");
const result = document.querySelector("#result");
const logoutButton = document.querySelector("#logout-button");

function requestUrl() {
  if (!API_ENDPOINT_URL) {
    throw new Error("API_ENDPOINT_URL が未設定です。");
  }

  const url = new URL(API_ENDPOINT_URL);
  Object.entries(API_QUERY_PARAMS).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

function getSessionToken() {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

function setSessionToken(token) {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

function clearSessionToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

function redirectToLogin() {
  window.location.href = "index.html";
}

function redirectToPost() {
  window.location.href = "post.html";
}

async function postJson(body) {
  const response = await fetch(requestUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

if (loginForm) {
  if (getSessionToken()) {
    redirectToPost();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.textContent = "ログイン中...";

    const formData = new FormData(loginForm);
    const password = formData.get("password");

    try {
      const data = await postJson({ action: "login", password });
      const token = data.token || data.sessionToken;

      if (data.status === "success" && token) {
        setSessionToken(token);
        redirectToPost();
        return;
      }

      result.textContent =
        data.message === "Unauthorized" ? "認証に失敗しました。" : "ログインに失敗しました。";
    } catch (error) {
      result.textContent = error.message;
    }
  });
}

if (postForm) {
  if (!getSessionToken()) {
    redirectToLogin();
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearSessionToken();
      redirectToLogin();
    });
  }

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.textContent = "送信中...";

    const formData = new FormData(postForm);
    const body = {
      token: getSessionToken(),
      category: formData.get("category"),
      title: formData.get("title"),
      body: formData.get("body"),
    };

    try {
      const data = await postJson(body);

      if (data.status === "success") {
        result.textContent = "成功しました。";
        return;
      }

      result.textContent =
        data.message === "Unauthorized" ? "認証に失敗しました。" : "エラーです。";
    } catch (error) {
      result.textContent = error.message;
    }
  });
}
