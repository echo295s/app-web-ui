import { detailUrl } from "./navigation.js";

import { parseRawDataObject } from "./data-fields.js";
import { TODO_CHECKED_KEY, isTodoData, isTodoKey } from "./todo.js";

export function recordView(record) {
  return {
    id: record.id || "",
    timestamp: record.timestamp || "",
    deleted: Boolean(record.deleted),
    rawData: record.rawData || "",
  };
}

export function formatTimestamp(value) {
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

export function displayRecordId(id) {
  return id ? String(id).slice(0, 8) : "-";
}

function linkableUrl(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? text : "";
  } catch {
    return "";
  }
}

function appendDisplayValue(parent, value) {
  const text =
    value == null || value === ""
      ? "-"
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);
  const url = linkableUrl(value);

  if (!url) {
    parent.textContent = text;
    return;
  }

  const link = document.createElement("a");
  link.className = "value-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = text;
  parent.appendChild(link);
}

function createFormattedFields(data) {
  const fields = document.createElement("dl");
  fields.className = "formatted-fields";

  Object.entries(data).forEach(([key, value]) => {
    const term = document.createElement("dt");
    term.textContent = key;
    fields.appendChild(term);

    const description = document.createElement("dd");
    appendDisplayValue(description, value);
    fields.appendChild(description);
  });

  return fields;
}

function filterRecordViews(records, searchInput, searchTarget) {
  const matchesSearch = (record) => {
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
  };

  return records.map(recordView).filter(matchesSearch);
}

function createFormattedRecordHeader(record) {
  const header = document.createElement("div");
  header.className = "formatted-record-header";

  const idLink = document.createElement("a");
  idLink.className = "record-link";
  idLink.href = detailUrl(record.id);
  idLink.textContent = displayRecordId(record.id);
  header.appendChild(idLink);

  const timestamp = document.createElement("time");
  timestamp.textContent = formatTimestamp(record.timestamp) || "-";
  header.appendChild(timestamp);

  return header;
}

function createJsonFormattedRecord(record) {
  const parsed = parseRawDataObject(record.rawData);
  const item = document.createElement("article");
  item.className = "formatted-record-card";
  item.appendChild(createFormattedRecordHeader(record));

  if (parsed) {
    item.appendChild(createFormattedFields(parsed));
    return item;
  }

  const data = document.createElement("pre");
  data.className = "formatted-json";
  appendDisplayValue(data, record.rawData);

  item.appendChild(data);
  return item;
}

function createArticleFormattedRecord(record, data) {
  const item = document.createElement("article");
  item.className = "formatted-record-card article-record-card";
  item.appendChild(createFormattedRecordHeader(record));

  const title = document.createElement("h3");
  title.textContent = String(data.title || "無題の記事");
  item.appendChild(title);

  const body = document.createElement("p");
  appendDisplayValue(body, data.body);
  item.appendChild(body);

  return item;
}

function createTodoFormattedRecord(record, data) {
  const item = document.createElement("article");
  item.className = "formatted-record-card todo-record-card";
  item.appendChild(createFormattedRecordHeader(record));

  const checked = Array.isArray(data[TODO_CHECKED_KEY])
    ? new Set(data[TODO_CHECKED_KEY])
    : new Set();
  const todoEntries = Object.entries(data)
    .filter(([key]) => isTodoKey(key))
    .sort(
      ([left], [right]) =>
        Number(left.replace("todo", "")) - Number(right.replace("todo", "")),
    );
  const checkedTodoCount = todoEntries.filter(([key]) => checked.has(key)).length;

  const heading = document.createElement("h3");
  heading.textContent = `TODO ${checkedTodoCount}/${todoEntries.length}`;
  item.appendChild(heading);

  if (todoEntries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "TODO項目がありません。";
    item.appendChild(empty);
    return item;
  }

  const list = document.createElement("ul");
  list.className = "todo-record-list";

  todoEntries.forEach(([key, value]) => {
    const listItem = document.createElement("li");
    listItem.className = checked.has(key) ? "checked" : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked.has(key);
    checkbox.disabled = true;
    listItem.appendChild(checkbox);

    const label = document.createElement("span");
    appendDisplayValue(label, value);
    listItem.appendChild(label);
    list.appendChild(listItem);
  });

  item.appendChild(list);
  return item;
}

function isArticleData(data) {
  return data?.type === "article";
}

const formattedTypeMatchers = {
  article: isArticleData,
  todo: isTodoData,
};

function matchesFormattedType(data, type) {
  return Boolean(formattedTypeMatchers[type]?.(data));
}

function matchesAnySpecificFormattedType(data) {
  return Object.values(formattedTypeMatchers).some((matches) => matches(data));
}

export function renderRecords({
  records,
  recordsBody,
  listResult,
  searchInput,
  searchTarget,
}) {
  if (!recordsBody) {
    return;
  }

  const rows = filterRecordViews(records, searchInput, searchTarget);
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
    idLink.textContent = displayRecordId(record.id);
    idCell.appendChild(idLink);
    row.appendChild(idCell);

    [record.rawData, formatTimestamp(record.timestamp)].forEach((value) => {
      const cell = document.createElement("td");
      appendDisplayValue(cell, value);
      row.appendChild(cell);
    });
    recordsBody.appendChild(row);
  });

  if (listResult) {
    listResult.textContent = `${records.length}件中 ${rows.length}件を表示しています。`;
  }
}

export function renderFormattedRecords({
  records,
  formattedRecords,
  formattedListResult,
  searchInput,
  searchTarget,
  activeType = "json",
}) {
  if (!formattedRecords) {
    return;
  }

  const searchedRecords = filterRecordViews(records, searchInput, searchTarget);
  const rows =
    activeType === "json"
      ? searchedRecords
          .map((record) => ({
            record,
            data: parseRawDataObject(record.rawData),
          }))
          .filter(({ data }) => !matchesAnySpecificFormattedType(data))
      : searchedRecords
          .map((record) => ({
            record,
            data: parseRawDataObject(record.rawData),
          }))
          .filter(({ data }) => matchesFormattedType(data, activeType));

  formattedRecords.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "該当するデータがありません。";
    formattedRecords.appendChild(empty);

    if (formattedListResult) {
      formattedListResult.textContent = `${records.length}件中 0件を表示しています。`;
    }
    return;
  }

  rows.forEach(({ record, data }) => {
    if (activeType === "article" && data) {
      formattedRecords.appendChild(createArticleFormattedRecord(record, data));
      return;
    }

    if (activeType === "todo" && data) {
      formattedRecords.appendChild(createTodoFormattedRecord(record, data));
      return;
    }

    formattedRecords.appendChild(createJsonFormattedRecord(record));
  });

  if (formattedListResult) {
    formattedListResult.textContent = `${records.length}件中 ${rows.length}件を表示しています。`;
  }
}
