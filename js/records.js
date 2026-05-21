import { detailUrl } from "./navigation.js";

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
