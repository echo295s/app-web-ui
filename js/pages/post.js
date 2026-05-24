import { requestJson } from "../api.js";
import {
  buildDataFromFields,
  createDataFieldRow,
  replaceDataFields,
  resetDataFields,
} from "../data-fields.js";
import { handleUnauthorized } from "../auth.js";
import { redirectToLogin } from "../navigation.js";
import { clearSessionToken, getSessionToken } from "../session.js";
import { renderRecords } from "../records.js";

export function initPostPage() {
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
  const jsonPresetTab = document.querySelector("#json-preset-tab");
  const articlePresetTab = document.querySelector("#article-preset-tab");
  const submitButton = document.querySelector(
    'button[form="post-form"][type="submit"]',
  );

  let records = [];
  let isLoadingRecords = false;
  let isSubmitting = false;
  let latestRecordsRequestId = 0;

  const setActivePreset = (activeTab) => {
    const isArticlePreset = activeTab === articlePresetTab;

    [jsonPresetTab, articlePresetTab].forEach((tab) => {
      const isActive = tab === activeTab;
      tab?.classList.toggle("active", isActive);
      tab?.setAttribute("aria-selected", String(isActive));
    });

    dataFields
      ?.closest(".data-fields-table")
      ?.classList.toggle("fixed-preset", isArticlePreset);

    if (addFieldButton) {
      addFieldButton.hidden = isArticlePreset;
    }
  };

  const renderCurrentRecords = () => {
    renderRecords({
      records,
      recordsBody,
      listResult,
      searchInput,
      searchTarget,
    });
  };

  const loadRecords = async (options = {}) => {
    const { force = false } = options;

    if (!recordsBody || !listResult) {
      return;
    }

    if (isLoadingRecords && !force) {
      return;
    }

    const requestId = latestRecordsRequestId + 1;
    latestRecordsRequestId = requestId;
    isLoadingRecords = true;
    listResult.textContent = "取得中...";
    if (refreshButton) {
      refreshButton.disabled = true;
    }

    try {
      const data = await requestJson({
        action: "list",
        token: getSessionToken(),
      });

      if (requestId !== latestRecordsRequestId) {
        return;
      }

      if (data.status === "success") {
        records = Array.isArray(data.records) ? data.records : [];
        renderCurrentRecords();
        return;
      }

      if (handleUnauthorized(data)) {
        return;
      }

      listResult.textContent = "一覧の取得に失敗しました。";
    } catch (error) {
      if (requestId !== latestRecordsRequestId) {
        return;
      }

      listResult.textContent = error.message;
    } finally {
      if (requestId === latestRecordsRequestId) {
        isLoadingRecords = false;
      }

      if (refreshButton && requestId === latestRecordsRequestId) {
        refreshButton.disabled = false;
      }
    }
  };

  if (!postForm) {
    return;
  }

  if (!getSessionToken()) {
    redirectToLogin();
    return;
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearSessionToken();
      redirectToLogin();
    });
  }

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
    }

    result.textContent = "送信中...";

    const rawData = buildDataFromFields(dataFields);

    if (!rawData) {
      result.textContent = "キーを入力してください。";
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
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
        resetDataFields(dataFields, { removable: true, valueRequired: false });
        setActivePreset(jsonPresetTab);
        await loadRecords({ force: true });
        return;
      }

      if (handleUnauthorized(data)) {
        return;
      }

      result.textContent = "エラーです。";
    } catch (error) {
      result.textContent = error.message;
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", () => loadRecords());
  }

  if (addFieldButton && dataFields) {
    addFieldButton.addEventListener("click", () => {
      dataFields.appendChild(
        createDataFieldRow("", "", true, { removable: true, valueRequired: false }),
      );
      setActivePreset(jsonPresetTab);
    });
  }

  if (jsonPresetTab) {
    jsonPresetTab.addEventListener("click", () => {
      resetDataFields(dataFields, { removable: true, valueRequired: false });
      setActivePreset(jsonPresetTab);
    });
  }

  if (articlePresetTab) {
    articlePresetTab.addEventListener("click", () => {
      replaceDataFields(
        dataFields,
        [
          { key: "type", value: "article", valueReadonly: true },
          { key: "title", value: "" },
          { key: "body", value: "", multiline: true },
        ],
        { keyReadonly: true, valueRequired: false },
      );
      setActivePreset(articlePresetTab);
    });
  }

  if (dataFields) {
    dataFields.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const deleteButton = target.closest("[data-delete-field-row]");
      if (!deleteButton) {
        return;
      }

      deleteButton.closest(".data-field-row")?.remove();
      setActivePreset(jsonPresetTab);

      if (!dataFields.querySelector(".data-field-row")) {
        dataFields.appendChild(
          createDataFieldRow("", "", true, { removable: true, valueRequired: false }),
        );
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener("input", renderCurrentRecords);
    searchForm.addEventListener("change", renderCurrentRecords);
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  loadRecords();
}
