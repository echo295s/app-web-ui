import { redirectToLogin } from "./navigation.js";
import { clearSessionToken } from "./session.js";

export function isUnauthorized(data) {
  return data?.message === "Unauthorized";
}

export function handleUnauthorized(data) {
  if (!isUnauthorized(data)) {
    return false;
  }

  clearSessionToken();
  redirectToLogin();
  return true;
}
