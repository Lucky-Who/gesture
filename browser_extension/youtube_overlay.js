(() => {
  "use strict";

  const ASL_APP_URL = chrome.runtime.getURL("asl_app/asl_system.html");
  const ROOT_ID = "asl-overlay-root";

  let root;
  let frame;
  let resizeHandle;
  let activeVideo;
  let lastCaption = "";

  function postToASL(action, payload = {}) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: "ASL_BRIDGE",
      action,
      ...payload,
    }, "*");
  }

  function findCaptionText() {
    const lines = Array.from(document.querySelectorAll(".ytp-caption-segment"))
      .map((n) => (n.textContent || "").trim())
      .filter(Boolean);

    if (lines.length === 0) return "";
    return lines.join(" ").trim();
  }

  function syncCaptionToASL() {
    const caption = findCaptionText();
    if (!caption || caption === lastCaption) return;
    lastCaption = caption;
    postToASL("setTextAndSign", { text: caption });

    if (activeVideo && activeVideo.paused) {
      postToASL("pause");
    }
  }

  function onVideoStateChanged() {
    if (!activeVideo) return;
    if (activeVideo.paused || activeVideo.ended) {
      postToASL("pause");
      return;
    }
    postToASL("resume");
  }

  function onVideoRateChanged() {
    if (!activeVideo) return;
    const speed = Number(activeVideo.playbackRate || 1);
    postToASL("setSpeed", { speed });
  }

  function bindVideo(videoEl) {
    if (!videoEl || videoEl === activeVideo) return;

    if (activeVideo) {
      activeVideo.removeEventListener("pause", onVideoStateChanged);
      activeVideo.removeEventListener("play", onVideoStateChanged);
      activeVideo.removeEventListener("ended", onVideoStateChanged);
      activeVideo.removeEventListener("ratechange", onVideoRateChanged);
    }

    activeVideo = videoEl;
    activeVideo.addEventListener("pause", onVideoStateChanged);
    activeVideo.addEventListener("play", onVideoStateChanged);
    activeVideo.addEventListener("ended", onVideoStateChanged);
    activeVideo.addEventListener("ratechange", onVideoRateChanged);
    onVideoStateChanged();
    onVideoRateChanged();
  }

  function makeDraggable(panel) {
    let dragging = false;
    let dx = 0;
    let dy = 0;

    const onMove = (e) => {
      if (!dragging) return;
      panel.style.left = `${e.clientX - dx}px`;
      panel.style.top = `${e.clientY - dy}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };

    panel.addEventListener("mousedown", (e) => {
      if (e.target === resizeHandle) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      dx = e.clientX - rect.left;
      dy = e.clientY - rect.top;
      document.addEventListener("mousemove", onMove);
      document.addEventListener(
        "mouseup",
        () => {
          dragging = false;
          document.removeEventListener("mousemove", onMove);
        },
        { once: true },
      );
    });
  }

  function makeResizable(panel, handle) {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    const minW = 220;
    const minH = 140;

    const onMove = (e) => {
      if (!resizing) return;
      const nextW = Math.max(minW, startW + (e.clientX - startX));
      const nextH = Math.max(minH, startH + (e.clientY - startY));
      panel.style.width = `${nextW}px`;
      panel.style.height = `${nextH}px`;
    };

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startW = rect.width;
      startH = rect.height;
      document.addEventListener("mousemove", onMove);
      document.addEventListener(
        "mouseup",
        () => {
          resizing = false;
          document.removeEventListener("mousemove", onMove);
        },
        { once: true },
      );
    });
  }

  function injectOverlay() {
    if (document.getElementById(ROOT_ID)) return;

    root = document.createElement("div");
    root.id = ROOT_ID;

    frame = document.createElement("iframe");
    frame.id = "asl-overlay-frame";
    frame.src = ASL_APP_URL;
    frame.referrerPolicy = "no-referrer";
    frame.addEventListener("load", () => {
      onVideoStateChanged();
      onVideoRateChanged();
      syncCaptionToASL();
    });

    resizeHandle = document.createElement("div");
    resizeHandle.id = "asl-overlay-resize-handle";

    root.appendChild(frame);
    root.appendChild(resizeHandle);
    document.documentElement.appendChild(root);
    makeDraggable(root);
    makeResizable(root, resizeHandle);
  }

  function startWatchers() {
    const observer = new MutationObserver(() => {
      const v = document.querySelector("video.html5-main-video") || document.querySelector("video");
      bindVideo(v);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setInterval(() => {
      const v = document.querySelector("video.html5-main-video") || document.querySelector("video");
      bindVideo(v);
      if (activeVideo && !activeVideo.paused) {
        syncCaptionToASL();
      }
    }, 2000);
  }

  function boot() {
    injectOverlay();
    startWatchers();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
