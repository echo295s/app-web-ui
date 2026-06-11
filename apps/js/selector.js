import {
  requireSession,
  setupLogout,
} from "../../js/authenticated-page.js";

function initAppSelector() {
  if (!requireSession()) {
    return;
  }

  setupLogout(document.querySelector("#logout-button"));
}

initAppSelector();
