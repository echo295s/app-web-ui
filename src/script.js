const API_ENDPOINT_URL = "";
const API_QUERY_PARAMS = {};

const form = document.querySelector("#post-form");
const result = document.querySelector("#result");

function requestUrl() {
  const url = new URL(API_ENDPOINT_URL);
  Object.entries(API_QUERY_PARAMS).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.textContent = "送信中...";

  const formData = new FormData(form);
  const body = {
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
  };

  try {
    const response = await fetch(requestUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

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
