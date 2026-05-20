import { requestJson } from "../api.js";
import {
  buildDataFromFields,
  createDataFieldRow,
  parseRawDataObject,
  populateDataFields,
} from "../data-fields.js";
import { getDetailId, redirectToLogin } from "../navigation.js";
import { getSessionToken } from "../session.js";
import { formatTimestamp, recordView } from "../records.js";

export function initDetailPage() {
  const detailForm = document.querySelector("#detail-form");
  const detailDataFields = document.querySelector("#detail-data-fields");
  const detailAddFieldButton = document.querySelector("#detail-add-field-button");
  const detailResult = document.querySelector("#detail-result");
  const detailId = document.querySelector("#detail-id");
  const detailCreated = document.querySelector("#detail-created");
  const deleteButton = document.querySelector("#delete-button");
  const rawDataField = document.querySelector("#raw-data-field");
  const rawDataInput = document.querySelector("#raw-data-input");

  let currentRecord = null;

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
  };

  const updateDetail = async () => {
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
  };

  const deleteDetail = async () => {
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
  };

  if (!detailForm) {
    return;
  }

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
