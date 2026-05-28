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
import {
  TODO_CHECKED_KEY,
  TODO_TYPE,
  appendTodoItemRow,
  isTodoData,
  isTodoKey,
  renumberTodoRows,
} from "../todo.js";

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
  const todoCheckField = document.querySelector("#todo-check-field");
  const todoCheckList = document.querySelector("#todo-check-list");

  let currentRecord = null;
  let currentParsedData = null;
  let isCurrentArticle = false;
  let isCurrentTodo = false;
  let isUpdating = false;
  let isDeleting = false;

  const setDetailControlsDisabled = (disabled) => {
    if (detailForm) {
      detailForm
        .querySelectorAll("input, textarea, button")
        .forEach((control) => {
          control.disabled =
            disabled || control.hasAttribute("data-disabled-delete");
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

  const pruneTodoCheckedKeys = (data) => {
    const todoKeys = new Set(Object.keys(data).filter(isTodoKey));
    const checked = Array.isArray(data[TODO_CHECKED_KEY])
      ? data[TODO_CHECKED_KEY]
      : [];

    return {
      ...data,
      type: TODO_TYPE,
      [TODO_CHECKED_KEY]: checked.filter((key) => todoKeys.has(key)),
    };
  };

  const getCheckedTodoKeys = () => {
    if (!todoCheckList) {
      return [];
    }

    return Array.from(
      todoCheckList.querySelectorAll("[data-todo-check]:checked"),
    )
      .map((checkbox) => checkbox.dataset.todoCheck)
      .filter(Boolean);
  };

  const getTodoItemsFromFields = () => {
    if (!detailDataFields) {
      return [];
    }

    return Array.from(detailDataFields.querySelectorAll(".data-field-row"))
      .map((row) => {
        const keyInput = row.querySelector('input[name="dataKey"]');
        const valueInput = row.querySelector('[name="dataValue"]');
        return {
          key: String(keyInput ? keyInput.value : ""),
          value: String(valueInput ? valueInput.value : ""),
          row,
          checked:
            row.dataset.todoChecked === "true"
              ? true
              : row.dataset.todoChecked === "false"
                ? false
                : null,
        };
      })
      .filter(({ key }) => isTodoKey(key));
  };

  const renderTodoCheckControls = () => {
    if (!todoCheckField || !todoCheckList) {
      return;
    }

    const existingCheckedKeys = new Set(getCheckedTodoKeys());
    const hasExistingControls = Boolean(todoCheckList.querySelector("[data-todo-check]"));
    todoCheckField.hidden = !isCurrentTodo;
    todoCheckList.innerHTML = "";

    if (!isCurrentTodo) {
      return;
    }

    const savedCheckedKeys = Array.isArray(currentParsedData?.[TODO_CHECKED_KEY])
      ? currentParsedData[TODO_CHECKED_KEY]
      : [];
    const checkedKeys = hasExistingControls
      ? existingCheckedKeys
      : new Set(savedCheckedKeys);
    const todoItems = getTodoItemsFromFields();

    if (todoItems.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "TODO項目がありません。";
      todoCheckList.appendChild(empty);
      return;
    }

    todoItems.forEach(({ key, value, row, checked }) => {
      const label = document.createElement("label");
      label.className = "todo-check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.todoCheck = key;
      checkbox.checked = checked ?? checkedKeys.has(key);
      delete row.dataset.todoChecked;

      const text = document.createElement("span");
      text.textContent = value || key;

      label.append(checkbox, text);
      todoCheckList.appendChild(label);
    });
  };

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
    isCurrentTodo = isTodoData(currentParsedData);

    if (isCurrentArticle) {
      populateDataFieldsFromObject(detailDataFields, currentParsedData, {
        excludeKeys: ["body"],
        disabledDeleteKeys: Object.keys(currentParsedData).filter(
          (key) => key !== "body",
        ),
        keyReadonly: true,
        readonlyValueKeys: ["type"],
      });
    } else if (isCurrentTodo) {
      populateDataFieldsFromObject(detailDataFields, currentParsedData, {
        disabledDeleteKeys: ["type", TODO_CHECKED_KEY],
        keyReadonly: true,
        isRemovableKey: isTodoKey,
        readonlyValueKeys: ["type", TODO_CHECKED_KEY],
      });
      renderTodoCheckControls();
    } else if (currentParsedData) {
      populateDataFields(detailDataFields, currentRecord.rawData, {
        removable: true,
      });
    }

    if (detailAddFieldButton) {
      detailAddFieldButton.hidden = isCurrentArticle;
    }

    if (articleBodyField) {
      articleBodyField.hidden = !isCurrentArticle;
    }

    if (!isCurrentTodo) {
      renderTodoCheckControls();
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
    } else if (isCurrentTodo) {
      const updatedTodo = JSON.parse(
        buildDataFromFields(detailDataFields, {
          sourceData: currentParsedData,
        }) || "{}",
      );
      updatedTodo[TODO_CHECKED_KEY] = getCheckedTodoKeys();
      rawData = JSON.stringify(pruneTodoCheckedKeys(updatedTodo));
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
      if (isCurrentTodo) {
        appendTodoItemRow(detailDataFields);
        renderTodoCheckControls();
        return;
      }

      detailDataFields.appendChild(createDataFieldRow("", "", false, {
        removable: true,
      }));
    });
  }

  if (detailDataFields) {
    detailDataFields.addEventListener("input", () => {
      if (isCurrentTodo) {
        renderTodoCheckControls();
      }
    });

    detailDataFields.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const deleteButton = target.closest("[data-delete-field-row]");
      if (!deleteButton) {
        return;
      }

      const checkedKeysBeforeDelete = new Set(getCheckedTodoKeys());
      deleteButton.closest(".data-field-row")?.remove();

      if (isCurrentTodo) {
        detailDataFields.querySelectorAll(".data-field-row").forEach((row) => {
          const keyInput = row.querySelector('input[name="dataKey"]');
          if (isTodoKey(keyInput?.value)) {
            row.dataset.todoChecked = String(
              checkedKeysBeforeDelete.has(keyInput.value),
            );
          }
        });
        renumberTodoRows(detailDataFields);
        renderTodoCheckControls();
      }

      if (!detailDataFields.querySelector(".data-field-row")) {
        detailDataFields.appendChild(createDataFieldRow("", "", false, {
          removable: true,
        }));
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", deleteDetail);
  }

  loadDetail();
}
