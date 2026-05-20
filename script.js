const API_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwsiOWKAFgYc1mpIMc9sqvqsBoUfwfEIktGlvqe-oHZzav2K9KOCYpH-ND9kJR1LyeVIA/exec";
const SESSION_TOKEN_KEY = "app_session_token";

const loginForm = document.querySelector("#login-form");
const postForm = document.querySelector("#post-form");
const searchForm = document.querySelector("#search-form");
const result = document.querySelector("#result");
const listResult = document.querySelector("#list-result");
const recordsBody = document.querySelector("#records-body");
const logoutButton = document.querySelector("#logout-button");
const refreshButton = document.querySelector("#refresh-button");
const searchInput = document.querySelector("#search-input");
const searchTarget = document.querySelector("#search-target");
const addFieldButton = document.querySelector("#add-field-button");
const dataFields = document.querySelector("#data-fields");

let records = [];

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

function createDataFieldRow() {
  const row = document.createElement("tr");
  row.className = "data-field-row";

  const keyCell = document.createElement("td");
  const keyInput = document.createElement("input");
  keyInput.name = "dataKey";
  keyInput.type = "text";
  keyInput.setAttribute("aria-label", "Key");
  keyInput.required = true;
  keyCell.appendChild(keyInput);

  const valueCell = document.createElement("td");
  const valueInput = document.createElement("input");
  valueInput.name = "dataValue";
  valueInput.type = "text";
  valueInput.setAttribute("aria-label", "Value");
  valueInput.required = true;
  valueCell.appendChild(valueInput);

  row.append(keyCell, valueCell);
  return row;
}

function resetDataFields() {
  if (!dataFields) {
    return;
  }

  dataFields.innerHTML = "";
  dataFields.appendChild(createDataFieldRow());
}

function buildPostData() {
  if (!dataFields) {
    return "";
  }

  const data = {};
  let hasField = false;

  dataFields.querySelectorAll(".data-field-row").forEach((row) => {
    const keyInput = row.querySelector('input[name="dataKey"]');
    const valueInput = row.querySelector('input[name="dataValue"]');
    const key = String(keyInput ? keyInput.value : "").trim();
    const value = String(valueInput ? valueInput.value : "").trim();

    if (!key || !value) {
      return;
    }

    data[key] = value;
    hasField = true;
  });

  return hasField ? JSON.stringify(data) : "";
}

function recordView(record) {
  return {
    id: record.id || "",
    timestamp: record.timestamp || "",
    deleted: Boolean(record.deleted),
    rawData: record.rawData || "",
  };
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function matchesSearch(record) {
  const keyword = String(searchInput ? searchInput.value : "").trim().toLowerCase();
  const target = searchTarget ? searchTarget.value : "all";

  if (!keyword) {
    return true;
  }

  const fields =
    target === "all"
      ? [record.rawData, record.id, record.timestamp]
      : [record[target]];

  return fields.some((value) => String(value || "").toLowerCase().includes(keyword));
}

function renderRecords() {
  if (!recordsBody) {
    return;
  }

  const rows = records.map(recordView).filter(matchesSearch);
  recordsBody.innerHTML = "";

  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "該当するデータがありません。";
    row.appendChild(cell);
    recordsBody.appendChild(row);

    if (listResult) {
      listResult.textContent = `${records.length}件中 0件を表示しています。`;
    }
    return;
  }

  rows.forEach((record) => {
    const row = document.createElement("tr");
    [record.id, record.rawData, formatTimestamp(record.timestamp)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      row.appendChild(cell);
    });
    recordsBody.appendChild(row);
  });

  if (listResult) {
    listResult.textContent = `${records.length}件中 ${rows.length}件を表示しています。`;
  }
}

async function loadRecords() {
  if (!recordsBody || !listResult) {
    return;
  }

  listResult.textContent = "取得中...";

  try {
    const data = await requestJson({
      action: "list",
      token: getSessionToken(),
    });

    if (data.status === "success") {
      records = Array.isArray(data.records) ? data.records : [];
      renderRecords();
      return;
    }

    listResult.textContent =
      data.message === "Unauthorized" ? "認証に失敗しました。" : "一覧の取得に失敗しました。";
  } catch (error) {
    listResult.textContent = error.message;
  }
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

    const rawData = buildPostData();

    if (!rawData) {
      result.textContent = "キーと値を入力してください。";
      return;
    }

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
        resetDataFields();
        await loadRecords();
        return;
      }

      result.textContent =
        data.message === "Unauthorized" ? "認証に失敗しました。" : "エラーです。";
    } catch (error) {
      result.textContent = error.message;
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", loadRecords);
  }

  if (addFieldButton && dataFields) {
    addFieldButton.addEventListener("click", () => {
      dataFields.appendChild(createDataFieldRow());
    });
  }

  if (searchForm) {
    searchForm.addEventListener("input", renderRecords);
    searchForm.addEventListener("change", renderRecords);
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  loadRecords();
}
