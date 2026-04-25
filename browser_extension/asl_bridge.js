(() => {
  "use strict";

  if (window.__ASL_BRIDGE_INSTALLED__) return;
  window.__ASL_BRIDGE_INSTALLED__ = true;

  let lastText = "";
  let pausedByController = false;

  function el(id) {
    return document.getElementById(id);
  }

  function click(id) {
    const node = el(id);
    if (node) node.click();
  }

  function setInputValue(text) {
    const input = el("textInput");
    if (!input) return;
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function signText(text) {
    const normalized = String(text || "").trim();
    if (!normalized) return;
    lastText = normalized;
    pausedByController = false;
    setInputValue(normalized);
    click("signBtn");
  }

  function stopSign() {
    click("stopBtn");
  }

  function pauseSign() {
    pausedByController = true;
    stopSign();
  }

  function resumeSign() {
    if (!pausedByController) return;
    pausedByController = false;
    if (lastText) {
      signText(lastText);
    }
  }

  window.addEventListener("message", (evt) => {
    const msg = evt.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "ASL_BRIDGE") return;

    if (msg.action === "setTextAndSign") {
      signText(msg.text || "");
      return;
    }

    if (msg.action === "stop") {
      stopSign();
      return;
    }

    if (msg.action === "pause") {
      pauseSign();
      return;
    }

    if (msg.action === "resume") {
      resumeSign();
    }
  });
})();
