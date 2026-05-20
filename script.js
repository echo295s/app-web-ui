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
const detailForm = document.querySelector("#detail-form");
const detailDataFields = document.querySelector("#detail-data-fields");
const detailAddFieldButton = document.querySelector("#detail-add-field-button");
const detailResult = document.querySelector("#detail-result");
const detailId = document.querySelector("#detail-id");
const detailCreated = document.querySelector("#detail-created");
const deleteButton = document.querySelector("#delete-button");
const rawDataField = document.querySelector("#raw-data-field");
const rawDataInput = document.querySelector("#raw-data-input");

let records = [];
let currentRecord = null;

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

function detailUrl(id) {
  return "detail.html?id=" + encodeURIComponent(id);
}

function getDetailId() {
  return new URLSearchParams(window.location.search).get("id") || "";
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

function createDataFieldRow(key = "", value = "", required = true) {
  const row = document.createElement("tr");
  row.className = "data-field-row";

  const keyCell = document.createElement("td");
  const keyInput = document.createElement("input");
  keyInput.name = "dataKey";
  keyInput.type = "text";
  keyInput.setAttribute("aria-label", "Key");
  keyInput.required = required;
  keyInput.value = key;
  keyCell.appendChild(keyInput);

  const valueCell = document.createElement("td");
  const valueInput = document.createElement("input");
  valueInput.name = "dataValue";
  valueInput.type = "text";
  valueInput.setAttribute("aria-label", "Value");
  valueInput.required = required;
  valueInput.value = value;
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

function buildDataFromFields(fieldsBody) {
  if (!fieldsBody) {
    return "";
  }

  const data = {};
  let hasField = false;

  fieldsBody.querySelectorAll(".data-field-row").forEach((row) => {
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

function parseRawDataObject(rawData) {
  try {
    const parsed = JSON.parse(rawData || "{}");
    const isPlainObject =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed);

    return isPlainObject ? parsed : null;
  } catch (error) {
    return null;
  }
}

function populateDataFields(fieldsBody, rawData) {
  if (!fieldsBody) {
    return;
  }

  const parsed = parseRawDataObject(rawData);
  fieldsBody.innerHTML = "";

  if (!parsed) {
    fieldsBody.appendChild(createDataFieldRow("", "", false));
    return;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    fieldsBody.appendChild(createDataFieldRow("", "", false));
    return;
  }

  entries.forEach(([key, value]) => {
    const fieldValue =
      typeof value === "string" ? value : JSON.stringify(value);
    fieldsBody.appendChild(createDataFieldRow(key, fieldValue, false));
  });
}

function setDetailControlsDisabled(disabled) {
  if (detailForm) {
    detailForm
      .querySelectorAll("input, textarea, button")
      .forEach((control) => {
        control.disabled = disabled;
      });
  }

  if (deleteButton) {
    deleteButton.disabled = disabled;
  }
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
    const idCell = document.createElement("td");
    const idLink = document.createElement("a");
    idLink.className = "record-link";
    idLink.href = detailUrl(record.id);
    idLink.textContent = record.id || "-";
    idCell.appendChild(idLink);
    row.appendChild(idCell);

    [record.rawData, formatTimestamp(record.timestamp)].forEach((value) => {
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

async function loadDetail() {
  if (!detailForm || !detailResult) {
    return;
  }

  const id = getDetailId();

  if (!id) {
    detailResult.textContent = "IDが指定されていません。";
    setDetailControlsDisabled(true);
    return;
  }

  if (detailId) {
    detailId.textContent = id;
  }

  detailResult.textContent = "取得中...";
  setDetailControlsDisabled(true);

  try {
    const data = await requestJson({
      action: "read",
      token: getSessionToken(),
      id,
    });

    if (data.status === "success" && data.record) {
      currentRecord = recordView(data.record);
      populateDataFields(detailDataFields, currentRecord.rawData);

      if (detailCreated) {
        detailCreated.textContent = formatTimestamp(currentRecord.timestamp) || "-";
      }

      if (rawDataInput) {
        rawDataInput.value = currentRecord.rawData;
      }

      if (rawDataField) {
        rawDataField.hidden = Boolean(parseRawDataObject(currentRecord.rawData));
      }

      detailResult.textContent = "取得しました。";
      setDetailControlsDisabled(false);
      return;
    }

    detailResult.textContent =
      data.message === "Unauthorized" ? "認証に失敗しました。" : "データが見つかりません。";
  } catch (error) {
    detailResult.textContent = error.message;
  }
}

async function updateDetail() {
  if (!detailResult || !currentRecord) {
    return;
  }

  const rawData = rawDataField && !rawDataField.hidden
    ? String(rawDataInput ? rawDataInput.value : "").trim()
    : buildDataFromFields(detailDataFields);

  if (!rawData) {
    detailResult.textContent = "キーと値を入力してください。";
    return;
  }

  detailResult.textContent = "更新中...";
  setDetailControlsDisabled(true);

  try {
    const data = await requestJson({
      action: "update",
      token: getSessionToken(),
      id: currentRecord.id,
      rawData,
    });

    if (data.status === "success" && data.record) {
      currentRecord = recordView(data.record);
      populateDataFields(detailDataFields, currentRecord.rawData);

      if (detailCreated) {
        detailCreated.textContent = formatTimestamp(currentRecord.timestamp) || "-";
      }

      if (rawDataInput) {
        rawDataInput.value = currentRecord.rawData;
      }

      detailResult.textContent = "更新しました。";
      setDetailControlsDisabled(false);
      return;
    }

    detailResult.textContent =
      data.message === "Unauthorized" ? "認証に失敗しました。" : "更新に失敗しました。";
  } catch (error) {
    detailResult.textContent = error.message;
  } finally {
    if (currentRecord) {
      setDetailControlsDisabled(false);
    }
  }
}

async function deleteDetail() {
  if (!detailResult || !currentRecord) {
    return;
  }

  const ok = window.confirm("このデータを削除しますか？");
  if (!ok) {
    return;
  }

  detailResult.textContent = "削除中...";
  setDetailControlsDisabled(true);

  try {
    const data = await requestJson({
      action: "delete",
      token: getSessionToken(),
      id: currentRecord.id,
    });

    if (data.status === "success") {
      detailResult.textContent = "削除しました。";
      window.location.href = "post.html";
      return;
    }

    detailResult.textContent =
      data.message === "Unauthorized" ? "認証に失敗しました。" : "削除に失敗しました。";
    setDetailControlsDisabled(false);
  } catch (error) {
    detailResult.textContent = error.message;
    setDetailControlsDisabled(false);
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

if (detailForm) {
  if (!getSessionToken()) {
    redirectToLogin();
  }

  detailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await updateDetail();
  });

  if (detailAddFieldButton && detailDataFields) {
    detailAddFieldButton.addEventListener("click", () => {
      detailDataFields.appendChild(createDataFieldRow("", "", false));
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", deleteDetail);
  }

  loadDetail();
}
