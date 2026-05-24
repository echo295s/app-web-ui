export function createDataFieldRow(key = "", value = "", required = true, options = {}) {
  const {
    removable = false,
    multiline = false,
    keyReadonly = false,
    valueReadonly = false,
    valueRequired = required,
  } = options;
  const row = document.createElement("tr");
  row.className = "data-field-row";

  const keyCell = document.createElement("td");
  const keyInput = document.createElement("input");
  keyInput.name = "dataKey";
  keyInput.type = "text";
  keyInput.setAttribute("aria-label", "Key");
  keyInput.required = required;
  keyInput.readOnly = keyReadonly;
  keyInput.value = key;
  keyCell.appendChild(keyInput);

  const valueCell = document.createElement("td");
  const valueInput = document.createElement(multiline ? "textarea" : "input");
  valueInput.name = "dataValue";
  if (!multiline) {
    valueInput.type = "text";
  }
  valueInput.setAttribute("aria-label", "Value");
  valueInput.required = valueRequired;
  valueInput.readOnly = valueReadonly;
  valueInput.value = value;
  valueCell.appendChild(valueInput);

  if (!removable) {
    row.append(keyCell, valueCell);
    return row;
  }

  const actionCell = document.createElement("td");
  actionCell.className = "data-field-action-cell";

  const deleteButton = document.createElement("button");
  deleteButton.className = "field-row-delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.deleteFieldRow = "";
  deleteButton.setAttribute("aria-label", "行を削除");
  deleteButton.title = "行を削除";

  const deleteIcon = document.createElement("img");
  deleteIcon.src = "./assets/trash-can-solid-full.svg";
  deleteIcon.alt = "";
  deleteIcon.setAttribute("aria-hidden", "true");

  deleteButton.appendChild(deleteIcon);
  actionCell.appendChild(deleteButton);
  row.append(keyCell, valueCell, actionCell);
  return row;
}

export function resetDataFields(fieldsBody, options = {}) {
  if (!fieldsBody) {
    return;
  }

  fieldsBody.innerHTML = "";
  fieldsBody.appendChild(createDataFieldRow("", "", true, options));
}

export function replaceDataFields(fieldsBody, fields, options = {}) {
  if (!fieldsBody) {
    return;
  }

  fieldsBody.innerHTML = "";

  fields.forEach((field) => {
    fieldsBody.appendChild(
      createDataFieldRow(field.key, field.value, true, {
        ...options,
        multiline: Boolean(field.multiline),
        valueReadonly: Boolean(field.valueReadonly || options.valueReadonly),
      }),
    );
  });
}

export function buildDataFromFields(fieldsBody) {
  if (!fieldsBody) {
    return "";
  }

  const data = {};
  let hasField = false;

  fieldsBody.querySelectorAll(".data-field-row").forEach((row) => {
    const keyInput = row.querySelector('input[name="dataKey"]');
    const valueInput = row.querySelector('[name="dataValue"]');
    const key = String(keyInput ? keyInput.value : "").trim();
    const value = String(valueInput ? valueInput.value : "").trim();

    if (!key) {
      return;
    }

    data[key] = value;
    hasField = true;
  });

  return hasField ? JSON.stringify(data) : "";
}

export function parseRawDataObject(rawData) {
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

export function populateDataFields(fieldsBody, rawData) {
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

export function populateDataFieldsFromObject(fieldsBody, data, options = {}) {
  if (!fieldsBody) {
    return;
  }

  const {
    excludeKeys = [],
    keyReadonly = false,
    readonlyValueKeys = [],
  } = options;
  const excluded = new Set(excludeKeys);
  const readonlyValues = new Set(readonlyValueKeys);
  const entries = Object.entries(data || {}).filter(([key]) => !excluded.has(key));
  fieldsBody.innerHTML = "";

  if (entries.length === 0) {
    fieldsBody.appendChild(createDataFieldRow("", "", false, { keyReadonly }));
    return;
  }

  entries.forEach(([key, value]) => {
    const fieldValue =
      typeof value === "string" ? value : JSON.stringify(value);
    fieldsBody.appendChild(
      createDataFieldRow(key, fieldValue, false, {
        keyReadonly,
        valueReadonly: readonlyValues.has(key),
      }),
    );
  });
}
