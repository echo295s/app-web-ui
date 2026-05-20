import { requestJson } from "../api.js";
import { getSessionToken, setSessionToken } from "../session.js";
import { redirectToPost } from "../navigation.js";

export function initLoginPage() {
  const loginForm = document.querySelector("#login-form");
  const result = document.querySelector("#result");

  if (!loginForm) {
    return;
  }

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
