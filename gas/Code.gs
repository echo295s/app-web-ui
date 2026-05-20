const APP_PASSWORD_PROPERTY = "APP_PASSWORD";
const SESSION_CACHE_PREFIX = "session:";
const SESSION_TTL_SECONDS = 21600;

function doGet(e) {
  const payload = e && e.parameter ? e.parameter : {};

  try {
    const result = route(payload);

    if (payload.callback) {
      return jsonp(payload.callback, result);
    }

    return json(result);
  } catch (error) {
    const result = {
      status: "error",
      message: error.message || "Internal error",
    };

    if (payload.callback) {
      return jsonp(payload.callback, result);
    }

    return json(result);
  }
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
  if (payload.action === "login") {
    return login(payload.password);
  }

  const authError = requireAuth(payload.token);
  if (authError) {
    return authError;
  }

  return handlePost(payload);
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

function handlePost(payload) {
  const category = String(payload.category || "").trim();
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();

  if (!category || !title || !body) {
    return {
      status: "error",
      message: "Invalid payload",
    };
  }

  // TODO: Replace this with the app's real persistence or notification logic.
  return {
    status: "success",
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
