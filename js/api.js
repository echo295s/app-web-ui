import { API_ENDPOINT_URL } from "./config.js";

function requestUrl() {
  if (!API_ENDPOINT_URL) {
    throw new Error("API_ENDPOINT_URL is not configured.");
  }

  return new URL(API_ENDPOINT_URL);
}

export async function requestJson(body) {
  const callbackName =
    "jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const url = requestUrl();
  const script = document.createElement("script");

  url.searchParams.set("callback", callbackName);
  Object.entries(body).forEach(([key, value]) => {
    url.searchParams.set(key, value == null ? "" : String(value));
  });

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      script.remove();
      delete window[callbackName];
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("API request timed out."));
    }, 15000);

    window[callbackName] = (data) => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      reject(new Error("API request failed."));
    };

    script.src = url.toString();
    document.head.appendChild(script);
  });
}
