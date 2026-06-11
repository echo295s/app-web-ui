export function detailUrl(id) {
  return `detail.html?id=${encodeURIComponent(id)}`;
}

export function getDetailId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

export function redirectToDataManagement() {
  window.location.href = new URL("../index.html", import.meta.url).href;
}
