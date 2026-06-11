import {
  requireSession,
  setupLogout,
} from "../../../js/authenticated-page.js";

function initDummyApp() {
  if (!requireSession()) {
    return;
  }

  const actionButton = document.querySelector("#dummy-action-button");
  const result = document.querySelector("#dummy-result");
  let executionCount = 0;

  actionButton?.addEventListener("click", () => {
    executionCount += 1;
    result.textContent = `ダミー処理を${executionCount}回実行しました。`;
  });

  setupLogout(document.querySelector("#logout-button"));
}

initDummyApp();
