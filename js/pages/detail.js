import { requestJson } from "../api.js";
import {
  buildDataFromFields,
  createDataFieldRow,
  findDuplicateDataKeys,
  parseRawDataObject,
  populateDataFields,
  populateDataFieldsFromObject,
} from "../data-fields.js";
import { handleUnauthorized } from "../auth.js";
import { getDetailId, redirectToLogin } from "../navigation.js";
import { getSessionToken } from "../session.js";
import { formatTimestamp, recordView } from "../records.js";

export function initDetailPage() {
  const detailForm = document.querySelector("#detail-form");
  const detailDataFields = document.querySelector("#detail-data-fields");
  const detailAddFieldButton = document.querySelector("#detail-add-field-button");
  const detailResult = document.querySelector("#detail-result");
  const detailId = document.querySelector("#detail-id");
  const detailUpdated = document.querySelector("#detail-updated");
  const deleteButton = document.querySelector("#delete-button");
  const detailFieldGroup = detailDataFields?.closest(".field-group");
  const detailSubmitButton = document.querySelector(
    'button[form="detail-form"][type="submit"]',
  );
  const rawDataField = document.querySelector("#raw-data-field");
  const rawDataInput = document.querySelector("#raw-data-input");
  const articleBodyField = document.querySelector("#article-body-field");
  const articleBodyInput = document.querySelector("#article-body-input");

  let currentRecord = null;
  let currentParsedData = null;
  let isCurrentArticle = false;
  let isUpdating = false;
  let isDeleting = false;

  const setDetailControlsDisabled = (disabled) => {
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

    if (detailSubmitButton) {
      detailSubmitButton.disabled = disabled;
    }
  };

  const isArticleData = (data) => data?.type === "article";

  const syncStructuredEditor = () => {
    const canEditStructuredData = Boolean(currentParsedData);

    if (detailFieldGroup) {
      detailFieldGroup.hidden = !canEditStructuredData;
    }

    if (detailSubmitButton) {
      detailSubmitButton.disabled = !canEditStructuredData;
    }
  };

  const renderDetailFields = () => {
    currentParsedData = parseRawDataObject(currentRecord?.rawData);
    isCurrentArticle = isArticleData(currentParsedData);

    if (isCurrentArticle) {
      populateDataFieldsFromObject(detailDataFields, currentParsedData, {
        excludeKeys: ["body"],
        keyReadonly: true,
        readonlyValueKeys: ["type"],
      });
    } else if (currentParsedData) {
      populateDataFields(detailDataFields, currentRecord.rawData);
    }

    if (detailAddFieldButton) {
      detailAddFieldButton.hidden = isCurrentArticle;
    }

    if (articleBodyField) {
      articleBodyField.hidden = !isCurrentArticle;
    }

    if (articleBodyInput) {
      articleBodyInput.value = isCurrentArticle
        ? String(currentParsedData.body ?? "")
        : "";
    }

    if (rawDataField) {
      rawDataField.hidden = Boolean(currentParsedData);
    }

    syncStructuredEditor();
  };

  const loadDetail = async () => {
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
        renderDetailFields();

        if (detailUpdated) {
          detailUpdated.textContent = formatTimestamp(currentRecord.timestamp) || "-";
        }

        if (rawDataInput) {
          rawDataInput.value = currentRecord.rawData;
        }

        detailResult.textContent = "取得しました。";
        setDetailControlsDisabled(false);
        syncStructuredEditor();
        return;
      }

      if (handleUnauthorized(data)) {
        return;
      }

      detailResult.textContent = "データが見つかりません。";
    } catch (error) {
      detailResult.textContent = error.message;
    }
  };

  const updateDetail = async () => {
    if (!detailResult || !currentRecord) {
      return;
    }

    if (isUpdating) {
      return;
    }

    let rawData = "";

    if (!currentParsedData) {
      detailResult.textContent = "JSONオブジェクト以外の生データは編集できません。";
      return;
    }

    const duplicateKeys = findDuplicateDataKeys(detailDataFields);
    if (duplicateKeys.length > 0) {
      detailResult.textContent = `重複したキーがあります: ${duplicateKeys.join(", ")}`;
      return;
    }

    if (isCurrentArticle) {
      const updatedArticle = {
        ...currentParsedData,
        ...JSON.parse(
          buildDataFromFields(detailDataFields, {
            sourceData: currentParsedData,
          }) || "{}",
        ),
        type: "article",
        body: String(articleBodyInput ? articleBodyInput.value : ""),
      };
      rawData = JSON.stringify(updatedArticle);
    } else {
      rawData = buildDataFromFields(detailDataFields, {
        sourceData: currentParsedData,
      });
    }

    if (!rawData) {
      detailResult.textContent = "キーと値を入力してください。";
      return;
    }

    detailResult.textContent = "更新中...";
    isUpdating = true;
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
        renderDetailFields();

        if (detailUpdated) {
          detailUpdated.textContent = formatTimestamp(currentRecord.timestamp) || "-";
        }

        if (rawDataInput) {
          rawDataInput.value = currentRecord.rawData;
        }

        detailResult.textContent = "更新しました。";
        setDetailControlsDisabled(false);
        syncStructuredEditor();
        return;
      }

      if (handleUnauthorized(data)) {
        return;
      }

      detailResult.textContent = "更新に失敗しました。";
    } catch (error) {
      detailResult.textContent = error.message;
    } finally {
      isUpdating = false;
      if (currentRecord) {
        setDetailControlsDisabled(false);
        syncStructuredEditor();
      }
    }
  };

  const deleteDetail = async () => {
    if (!detailResult || !currentRecord) {
      return;
    }

    if (isDeleting) {
      return;
    }

    const ok = window.confirm("このデータを削除しますか？");
    if (!ok) {
      return;
    }

    detailResult.textContent = "削除中...";
    isDeleting = true;
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

      if (handleUnauthorized(data)) {
        return;
      }

      detailResult.textContent = "削除に失敗しました。";
      setDetailControlsDisabled(false);
      syncStructuredEditor();
    } catch (error) {
      detailResult.textContent = error.message;
      setDetailControlsDisabled(false);
      syncStructuredEditor();
    } finally {
      isDeleting = false;
    }
  };

  if (!detailForm) {
    return;
  }

  if (!getSessionToken()) {
    redirectToLogin();
    return;
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
