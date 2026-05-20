export function redirectToLogin() {
  window.location.href = "index.html";
}

export function redirectToPost() {
  window.location.href = "post.html";
}

export function detailUrl(id) {
  return "detail.html?id=" + encodeURIComponent(id);
}

export function getDetailId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}
