const API_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwsiOWKAFgYc1mpIMc9sqvqsBoUfwfEIktGlvqe-oHZzav2K9KOCYpH-ND9kJR1LyeVIA/exec";
const SESSION_TOKEN_KEY = "app_session_token";

const loginForm = document.querySelector("#login-form");
const postForm = document.querySelector("#post-form");
const result = document.querySelector("#result");
const logoutButton = document.querySelector("#logout-button");

function requestUrl() {
  if (!API_ENDPOINT_URL) {
    throw new Error("API_ENDPOINT_URL is not configured.");
  }

  return new URL(API_ENDPOINT_URL);
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

async function requestJson(body) {
  const callbackName =
    "jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const url = requestUrl();
  const script = document.createElement("script");

  url.searchParams.set("callback", callbackName);
  Object.entries(body).forEach(([key, value]) => {
    url.searchParams.set(key, value == null ? "" : String(value));
  });

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      script.remove();
      delete window[callbackName];
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("API request timed out."));
    }, 15000);

    window[callbackName] = (data) => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      reject(new Error("API request failed."));
    };

    script.src = url.toString();
    document.head.appendChild(script);
  });
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
      const data = await requestJson({ action: "login", password });
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
    const rawData = JSON.stringify({
      category: formData.get("category"),
      title: formData.get("title"),
      body: formData.get("body"),
    });
    const body = {
      action: "create",
      token: getSessionToken(),
      rawData,
    };

    try {
      const data = await requestJson(body);

      if (data.status === "success") {
        result.textContent = "保存しました。";
        postForm.reset();
        return;
      }

      result.textContent =
        data.message === "Unauthorized" ? "認証に失敗しました。" : "エラーです。";
    } catch (error) {
      result.textContent = error.message;
    }
  });
}
