import { requestJson } from "./api.js";
import { redirectToLogin } from "./navigation.js";
import { clearSessionToken, getSessionToken } from "./session.js";

export function requireSession() {
  if (getSessionToken()) {
    return true;
  }

  redirectToLogin();
  return false;
}

export function setupLogout(button) {
  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    const token = getSessionToken();
    button.disabled = true;

    try {
      if (token) {
        await requestJson({
          action: "logout",
          token,
        });
      }
    } catch {
      // Local logout still completes when the remote session is unavailable.
    } finally {
      clearSessionToken();
      redirectToLogin();
    }
  });
}
