import { detailUrl } from "./navigation.js";

import { parseRawDataObject } from "./data-fields.js";

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

  const data = document.createElement("pre");
  data.className = "formatted-json";
  data.textContent = parsed ? JSON.stringify(parsed, null, 2) : record.rawData || "-";

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
  body.textContent = String(data.body || "-");
  item.appendChild(body);

  return item;
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
      cell.textContent = value || "-";
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
      ? searchedRecords.map((record) => ({
          record,
          data: parseRawDataObject(record.rawData),
        }))
      : searchedRecords
          .map((record) => ({
            record,
            data: parseRawDataObject(record.rawData),
          }))
          .filter(({ data }) => data?.type === activeType);

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
    formattedRecords.appendChild(
      activeType === "article" && data
        ? createArticleFormattedRecord(record, data)
        : createJsonFormattedRecord(record),
    );
  });

  if (formattedListResult) {
    formattedListResult.textContent = `${records.length}件中 ${rows.length}件を表示しています。`;
  }
}
