const APP_PASSWORD_PROPERTY = "APP_PASSWORD";
const DATA_SPREADSHEET_ID_PROPERTY = "DATA_SPREADSHEET_ID";
const DATA_SHEET_NAME_PROPERTY = "DATA_SHEET_NAME";
const DEFAULT_DATA_SHEET_NAME = "raw_data";
const DATA_HEADERS = ["id", "timestamp", "rawData", "deleted"];
const SESSION_CACHE_PREFIX = "session:";
const SESSION_TTL_SECONDS = 21600;

function doGet(e) {
  const payload = e && e.parameter ? e.parameter : {};
  const result = {
    status: "error",
    message: "POST required",
  };

  if (payload.callback) {
    return jsonp(payload.callback, result);
  }

  return json(result);
}

function doPost(e) {
  try {
    const payload = parseJsonPayload(e);
    return json(route(payload));
  } catch (error) {
    return json({
      status: "error",
      message: error.message || "Internal error",
    });
  }
}

function parseJsonPayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function route(payload) {
  const action = String(payload.action || "").trim();

  if (action === "login") {
    return login(payload.password);
  }

  const authError = requireAuth(payload.token);
  if (authError) {
    return authError;
  }

  if (action === "logout") {
    return logout(payload.token);
  }

  return handleDataRequest(payload);
}

function login(password) {
  const savedPassword = PropertiesService
    .getScriptProperties()
    .getProperty(APP_PASSWORD_PROPERTY);

  if (!savedPassword || password !== savedPassword) {
    return unauthorized();
  }

  const token = Utilities.getUuid();
  CacheService
    .getScriptCache()
    .put(SESSION_CACHE_PREFIX + token, "1", SESSION_TTL_SECONDS);

  return {
    status: "success",
    token: token,
  };
}

function requireAuth(token) {
  if (!token) {
    return unauthorized();
  }

  const session = CacheService
    .getScriptCache()
    .get(SESSION_CACHE_PREFIX + token);

  if (!session) {
    return unauthorized();
  }

  return null;
}

function logout(token) {
  CacheService
    .getScriptCache()
    .remove(SESSION_CACHE_PREFIX + token);

  return {
    status: "success",
  };
}

function handleDataRequest(payload) {
  const action = String(payload.action || "create").trim();

  if (action === "create") {
    return createRecord(payload);
  }

  if (action === "read") {
    return readRecord(payload);
  }

  if (action === "list") {
    return listRecords(payload);
  }

  if (action === "update") {
    return updateRecord(payload);
  }

  if (action === "delete") {
    return deleteRecord(payload);
  }

  return {
    status: "error",
    message: "Unknown action",
  };
}

function createRecord(payload) {
  const rawData = normalizeRawData(payload);

  if (rawData === "") {
    return invalidPayload();
  }

  const now = new Date().toISOString();
  const record = {
    id: Utilities.getUuid(),
    timestamp: now,
    rawData: rawData,
    deleted: false,
  };

  getDataSheet().appendRow([
    record.id,
    record.timestamp,
    record.rawData,
    record.deleted,
  ]);

  return {
    status: "success",
    record: record,
  };
}

function readRecord(payload) {
  const id = String(payload.id || "").trim();
  const includeDeleted = toBoolean(payload.includeDeleted);

  if (!id) {
    return invalidPayload();
  }

  const row = findRecordRow(id);

  if (!row || (!includeDeleted && row.record.deleted)) {
    return notFound();
  }

  return {
    status: "success",
    record: row.record,
  };
}

function listRecords(payload) {
  const includeDeleted = toBoolean(payload.includeDeleted);
  const records = getAllRecords()
    .filter(function(record) {
      return includeDeleted || !record.deleted;
    });

  return {
    status: "success",
    records: records,
  };
}

function updateRecord(payload) {
  const id = String(payload.id || "").trim();
  const rawData = normalizeRawData(payload);

  if (!id || rawData === "") {
    return invalidPayload();
  }

  const row = findRecordRow(id);

  if (!row || row.record.deleted) {
    return notFound();
  }

  const timestamp = new Date().toISOString();
  const sheet = getDataSheet();
  sheet.getRange(row.rowNumber, 2, 1, 2).setValues([[timestamp, rawData]]);

  return {
    status: "success",
    record: {
      id: id,
      timestamp: timestamp,
      rawData: rawData,
      deleted: false,
    },
  };
}

function deleteRecord(payload) {
  const id = String(payload.id || "").trim();

  if (!id) {
    return invalidPayload();
  }

  const row = findRecordRow(id);

  if (!row || row.record.deleted) {
    return notFound();
  }

  const timestamp = new Date().toISOString();
  const sheet = getDataSheet();
  sheet.getRange(row.rowNumber, 2).setValue(timestamp);
  sheet.getRange(row.rowNumber, 4).setValue(true);

  return {
    status: "success",
    record: {
      id: id,
      timestamp: timestamp,
      rawData: row.record.rawData,
      deleted: true,
    },
  };
}

function normalizeRawData(payload) {
  if (Object.prototype.hasOwnProperty.call(payload, "rawData")) {
    return stringifyRawData(payload.rawData);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return stringifyRawData(payload.data);
  }

  return "";
}

function stringifyRawData(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function getDataSheet() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty(DATA_SPREADSHEET_ID_PROPERTY);
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  const sheetName =
    properties.getProperty(DATA_SHEET_NAME_PROPERTY) || DEFAULT_DATA_SHEET_NAME;

  if (!spreadsheet) {
    throw new Error("Spreadsheet is not configured");
  }

  const sheet = spreadsheet.getSheetByName(sheetName) ||
    spreadsheet.insertSheet(sheetName);
  ensureDataHeaders(sheet);
  return sheet;
}

function ensureDataHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, DATA_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasHeaders = DATA_HEADERS.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!hasHeaders) {
    headerRange.setValues([DATA_HEADERS]);
  }
}

function getAllRecords() {
  const sheet = getDataSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, DATA_HEADERS.length)
    .getValues()
    .filter(function(row) {
      return String(row[0] || "").trim() !== "";
    })
    .map(function(row) {
      return rowToRecord(row);
    });
}

function findRecordRow(id) {
  const sheet = getDataSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, DATA_HEADERS.length).getValues();

  for (var index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]) === id) {
      return {
        rowNumber: index + 2,
        record: rowToRecord(rows[index]),
      };
    }
  }

  return null;
}

function rowToRecord(row) {
  return {
    id: String(row[0] || ""),
    timestamp: stringifyTimestamp(row[1]),
    rawData: String(row[2] || ""),
    deleted: toBoolean(row[3]),
  };
}

function stringifyTimestamp(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value.toISOString();
  }

  return String(value || "");
}

function toBoolean(value) {
  if (value === true) {
    return true;
  }

  return String(value || "").toLowerCase() === "true";
}

function invalidPayload() {
  return {
    status: "error",
    message: "Invalid payload",
  };
}

function notFound() {
  return {
    status: "error",
    message: "Not found",
  };
}

function unauthorized() {
  return {
    status: "error",
    message: "Unauthorized",
  };
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp(callback, obj) {
  const callbackName = String(callback || "");

  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callbackName)) {
    return json({
      status: "error",
      message: "Invalid callback",
    });
  }

  return ContentService
    .createTextOutput(callbackName + "(" + JSON.stringify(obj) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
