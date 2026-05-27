import { createDataFieldRow } from "./data-fields.js";

export const TODO_TYPE = "todo";
export const TODO_CHECKED_KEY = "checked";
export const TODO_KEY_PREFIX = "todo";

export function isTodoData(data) {
  return data?.type === TODO_TYPE;
}

export function isTodoKey(key) {
  return new RegExp(`^${TODO_KEY_PREFIX}\\d+$`).test(String(key || ""));
}

export function createTodoItemRow(key, value = "") {
  return createDataFieldRow(key, value, true, {
    keyReadonly: true,
    removable: true,
    valueRequired: false,
  });
}

export function getTodoRows(fieldsBody) {
  if (!fieldsBody) {
    return [];
  }

  return Array.from(fieldsBody.querySelectorAll(".data-field-row")).filter((row) => {
    const keyInput = row.querySelector('input[name="dataKey"]');
    return isTodoKey(keyInput?.value);
  });
}

export function nextTodoKey(fieldsBody) {
  return `${TODO_KEY_PREFIX}${getTodoRows(fieldsBody).length + 1}`;
}

export function appendTodoItemRow(fieldsBody, value = "") {
  if (!fieldsBody) {
    return null;
  }

  const row = createTodoItemRow(nextTodoKey(fieldsBody), value);
  fieldsBody.appendChild(row);
  return row;
}

export function renumberTodoRows(fieldsBody) {
  getTodoRows(fieldsBody).forEach((row, index) => {
    const keyInput = row.querySelector('input[name="dataKey"]');
    if (keyInput) {
      keyInput.value = `${TODO_KEY_PREFIX}${index + 1}`;
    }
  });
}
