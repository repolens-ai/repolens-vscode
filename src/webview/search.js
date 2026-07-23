//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const basic = document.querySelector("#patternContainer");
  const advanced = document.querySelector("#advancedContainer");
  const patternInput = document.querySelector("textarea.patternInput");
  const replacementInput = document.querySelector("textarea.replacementInput");
  const conditionInput = document.querySelector("textarea.conditionInput");
  const advancedArea = document.querySelector("textarea.ruleInput");
  const scanButton = document.querySelector(".scanner-button");
  const saveButton = document.querySelector(".save-button");
  const replaceButton = document.querySelector(".replace-button");

  if (
    !basic ||
    !advanced ||
    !patternInput ||
    !replacementInput ||
    !conditionInput ||
    !advancedArea ||
    !scanButton ||
    !saveButton ||
    !replaceButton
  ) {
    console.error(
      "RepoLens rule search webview failed to initialize because DOM elements are missing."
    );
    return;
  }

  scanButton.addEventListener("click", () => {
    sendMessageToExtension("scan");
  });
  saveButton.addEventListener("click", () => {
    sendMessageToExtension("save");
  });
  replaceButton.addEventListener("click", () => {
    sendMessageToExtension("replace");
  });

  // Sort the height of the advanced rule input
  advanced.style.height = basic.offsetHeight + "px";
  advancedArea.style.height = basic.offsetHeight - 15 + "px";

  window.addEventListener("message", (event) => {
    const message = event.data;

    if (message.command === "toggle") {
      basic.classList.toggle("hidden");
      advanced.classList.toggle("hidden");
    } else if (message.command === "setPattern") {
      patternInput.value = message.pattern || "";
    }
  });

  patternInput.focus();

  // This is handled by the RuleInputProvider
  function sendMessageToExtension(message_type) {
    let rule;
    let advancedMode;
    if (basic.classList.contains("hidden")) {
      rule = { rule: advancedArea.value };
      advancedMode = true;
    } else {
      rule = {
        pattern: patternInput.value,
        replacement: replacementInput.value,
        condition: conditionInput.value,
      };
      advancedMode = false;
    }

    vscode.postMessage({
      type: message_type,
      advanced: advancedMode,
      rule: rule,
    });
  }
})();
