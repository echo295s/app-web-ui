import { SESSION_TOKEN_KEY } from "./config.js";

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token) {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}
