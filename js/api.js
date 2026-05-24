import { API_ENDPOINT_URL } from "./config.js";

const REQUEST_TIMEOUT_MS = 15000;

function requestUrl() {
  if (!API_ENDPOINT_URL) {
    throw new Error("API_ENDPOINT_URL is not configured.");
  }

  return new URL(API_ENDPOINT_URL);
}

export async function requestJson(body) {
  const url = requestUrl();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}).`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("API request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
