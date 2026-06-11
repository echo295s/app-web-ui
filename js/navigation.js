const SITE_ROOT_URL = new URL("../", import.meta.url);

function redirectTo(path) {
  window.location.href = new URL(path, SITE_ROOT_URL).href;
}

export function redirectToLogin() {
  redirectTo("index.html");
}

export function redirectToAppSelector() {
  redirectTo("apps/index.html");
}
