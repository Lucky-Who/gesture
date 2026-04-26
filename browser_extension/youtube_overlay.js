(() => {
  "use strict";

  const EXT_VERSION = chrome.runtime.getManifest().version;
  const LOG_PREFIX = `[ASL Extension v${EXT_VERSION}]`;
  const ASL_APP_URL = chrome.runtime.getURL("asl_app/asl_system.html");
  const ROOT_ID = "asl-overlay-root";
  const TRANSCRIBE_URL = "http://127.0.0.1:8000/api/transcribe";

  let root;
  let frame;
  let resizeHandles = [];
  let activeVideo;
  let lastCaption = "";
  let lastSttText = "";
  let audioCapture = null;
  let audioWorkletNode = null;
  let audioContext = null;
  let audioSource = null;
  let audioSinkGain = null;
  let audioSourceMode = "none";
  let audioSourceVideo = null;
  let audioFlushTimer = null;
  let pendingAudioBuffers = [];
  let isSendingAudio = false;
  let noCaptionMode = false;
  let noCaptionTicks = 0;

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }

  function postToASL(action, payload = {}) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: "ASL_BRIDGE",
      action,
      ...payload,
    }, "*");
  }

  function mergeFloat32Buffers(buffers) {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;

    buffers.forEach((buffer) => {
      merged.set(buffer, offset);
      offset += buffer.length;
    });

    return merged;
  }

  function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
    if (outputSampleRate === inputSampleRate) return buffer;
    if (outputSampleRate > inputSampleRate) return buffer;

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.floor(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
        accum += buffer[i];
        count += 1;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i += 1) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }

    return buffer;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }

    return btoa(binary);
  }

  function findCaptionText() {
    const lines = Array.from(document.querySelectorAll(".ytp-caption-segment"))
      .map((n) => (n.textContent || "").trim())
      .filter(Boolean);

    if (lines.length === 0) return "";
    return lines.join(" ").trim();
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pushTranscriptToASL(text) {
    const normalized = normalizeText(text);
    if (!normalized) return;
    if (normalized === lastCaption || normalized === lastSttText) return;

    lastSttText = normalized;
    postToASL("setTextAndSign", { text: normalized });

    if (activeVideo && activeVideo.paused) {
      postToASL("pause");
    }
  }

  function syncCaptionToASL() {
    const caption = findCaptionText();
    if (caption) {
      noCaptionMode = false;
      noCaptionTicks = 0;
      if (caption !== lastCaption) {
        lastCaption = caption;
        postToASL("setTextAndSign", { text: caption });
      }
      return;
    }

    // Explicit no-caption pipeline: after a short confirmation window,
    // keep voice->text->ASL active as the primary source.
    noCaptionTicks += 1;
    if (noCaptionTicks >= 2 && !noCaptionMode) {
      noCaptionMode = true;
      log("No-caption voice pipeline active");
    }

    if (
      noCaptionMode &&
      activeVideo &&
      !activeVideo.paused &&
      !activeVideo.ended
    ) {
      startAudioCapture();
    }

    if (activeVideo && activeVideo.paused) {
      postToASL("pause");
    }
  }

  function onVideoStateChanged() {
    if (!activeVideo) return;
    if (activeVideo.ended) {
      postToASL("pause");
      stopAudioCapture(true);
      return;
    }

    if (activeVideo.paused) {
      postToASL("pause");
      stopAudioCapture(false);
      return;
    }

    noCaptionTicks = 0;
    postToASL("resume");
    startAudioCapture();
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

  }

  function getPlaybackStream(videoEl) {
    if (!videoEl) return null;
    if (typeof videoEl.captureStream === "function") {
      return videoEl.captureStream();
    }
    if (typeof videoEl.mozCaptureStream === "function") {
      return videoEl.mozCaptureStream();
    }
    return null;
  }

  function onVideoRateChanged() {
    if (!activeVideo) return;
    const speed = Number(activeVideo.playbackRate || 1);
    postToASL("setSpeed", { speed });
  }

  function bindVideo(videoEl) {
    if (!videoEl || videoEl === activeVideo) return;

    if (activeVideo) {
      // New <video> element means rebuild audio graph from scratch.
      stopAudioCapture(true);
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
      if (e.target && e.target.closest(".asl-resize-handle")) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.height = `${rect.height}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
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

  function makeResizable(panel, handles) {
    let resizing = false;
    let dir = "se";
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startL = 0;
    let startT = 0;
    const minW = 220;
    const minH = 140;

    const onMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let nextW = startW;
      let nextH = startH;
      let nextL = startL;
      let nextT = startT;

      if (dir.includes("e")) {
        nextW = Math.max(minW, startW + dx);
      }

      if (dir.includes("s")) {
        nextH = Math.max(minH, startH + dy);
      }

      if (dir.includes("w")) {
        const rawW = startW - dx;
        nextW = Math.max(minW, rawW);
        nextL = startL + (startW - nextW);
      }

      if (dir.includes("n")) {
        const rawH = startH - dy;
        nextH = Math.max(minH, rawH);
        nextT = startT + (startH - nextH);
      }

      panel.style.left = `${nextL}px`;
      panel.style.top = `${nextT}px`;
      panel.style.width = `${nextW}px`;
      panel.style.height = `${nextH}px`;
    };

    handles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = panel.getBoundingClientRect();
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.width = `${rect.width}px`;
        panel.style.height = `${rect.height}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";

        resizing = true;
        dir = handle.dataset.dir || "se";
        startX = e.clientX;
        startY = e.clientY;
        startW = rect.width;
        startH = rect.height;
        startL = rect.left;
        startT = rect.top;

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
    });
  }

  function createResizeHandles(panel) {
    const dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    resizeHandles = dirs.map((d) => {
      const el = document.createElement("div");
      el.className = `asl-resize-handle asl-resize-${d}`;
      el.dataset.dir = d;
      panel.appendChild(el);
      return el;
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
      log("ASL iframe loaded");
      onVideoStateChanged();
      onVideoRateChanged();
      syncCaptionToASL();
    });

    root.appendChild(frame);
    createResizeHandles(root);
    document.documentElement.appendChild(root);
    makeDraggable(root);
    makeResizable(root, resizeHandles);
    log("Overlay injected");
  }

  function startWatchers() {
    log("Starting watchers");

    const observer = new MutationObserver(() => {
      const v = document.querySelector("video.html5-main-video") || document.querySelector("video");
      bindVideo(v);

      if (!document.getElementById(ROOT_ID)) {
        injectOverlay();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setInterval(() => {
      const v = document.querySelector("video.html5-main-video") || document.querySelector("video");
      bindVideo(v);
      if (activeVideo && !activeVideo.paused) {
        syncCaptionToASL();
      }

      if (!document.getElementById(ROOT_ID)) {
        injectOverlay();
      }
    }, 1000);

    window.addEventListener("yt-navigate-finish", () => {
      log("YouTube navigation detected");
      const v = document.querySelector("video.html5-main-video") || document.querySelector("video");
      bindVideo(v);
      injectOverlay();
      syncCaptionToASL();
    });
  }

  async function startAudioCapture() {
    if (!activeVideo || activeVideo.paused || activeVideo.ended) return;

    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (!audioSource || audioSourceVideo !== activeVideo) {
        const stream = getPlaybackStream(activeVideo);
        const hasStreamAudio = !!(
          stream &&
          typeof stream.getAudioTracks === "function" &&
          stream.getAudioTracks().length > 0
        );

        if (hasStreamAudio) {
          audioSource = audioContext.createMediaStreamSource(stream);
          audioCapture = stream;
          audioSourceMode = "stream";
          audioSourceVideo = activeVideo;
        } else {
          if (stream && typeof stream.getTracks === "function") {
            stream.getTracks().forEach((t) => t.stop());
          }

          // Fallback: pull audio directly from the HTMLMediaElement.
          audioSource = audioContext.createMediaElementSource(activeVideo);
          audioCapture = null;
          audioSourceMode = "media-element";
          audioSourceVideo = activeVideo;
        }
      }

      if (audioWorkletNode) {
        if (audioContext.state === "suspended") {
          audioContext.resume().catch(() => {});
        }
        if (!audioFlushTimer) {
          audioFlushTimer = setInterval(() => {
            void flushAudioChunk();
          }, 2000);
        }
        return;
      }

      await audioContext.audioWorklet.addModule(
        chrome.runtime.getURL("audio-worklet-processor.js"),
      );

      audioWorkletNode = new AudioWorkletNode(
        audioContext,
        "asl-pcm-collector-processor",
      );
      audioWorkletNode.port.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.samples) return;
        pendingAudioBuffers.push(new Float32Array(data.samples));
      };

      audioSource.connect(audioWorkletNode);
      audioSinkGain = audioContext.createGain();
      audioSinkGain.gain.value = 0;
      audioWorkletNode.connect(audioSinkGain);
      audioSinkGain.connect(audioContext.destination);
      log("Audio capture started", `mode=${audioSourceMode}`, `sampleRate=${audioContext.sampleRate}`);

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      if (!audioFlushTimer) {
        audioFlushTimer = setInterval(() => {
          void flushAudioChunk();
        }, 2000);
      }
    } catch (err) {
      log("Video audio capture unavailable:", err && err.message ? err.message : err);
      audioCapture = null;
      audioWorkletNode = null;
      audioSinkGain = null;
      audioSource = null;
      audioSourceMode = "none";
      audioSourceVideo = null;
    }
  }

  async function flushAudioChunk() {
    if (!audioWorkletNode || isSendingAudio || !pendingAudioBuffers.length || !audioContext) return;

    isSendingAudio = true;
    const buffers = pendingAudioBuffers;
    pendingAudioBuffers = [];

    try {
      const merged = mergeFloat32Buffers(buffers);
      const downsampled = downsampleBuffer(merged, audioContext.sampleRate, 16000);
      if (!downsampled.length) return;

      const wav = encodeWav(downsampled, 16000);
      const wavBase64 = arrayBufferToBase64(wav);
      const raw = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wavBase64 }),
      });

      let response;
      if (!raw.ok) {
        const errText = await raw.text();
        response = { ok: false, error: `local_transcribe_http_${raw.status}: ${errText}` };
      } else {
        const data = await raw.json();
        response = { ok: true, text: data && data.text ? data.text : "" };
      }

      if (!response.ok) {
        log("Local transcription failed:", response.error || "unknown");
        return;
      }

      if (response.text) {
        log("Transcript received", response.text.slice(0, 80));
        pushTranscriptToASL(response.text);
      }
    } catch (err) {
      log("Local transcription error:", err && err.message ? err.message : err);
    } finally {
      isSendingAudio = false;
    }
  }

  function stopAudioCapture(fullReset = false) {
    if (!fullReset) {
      if (audioContext && audioContext.state !== "suspended") {
        audioContext.suspend().catch(() => {});
      }
      if (audioFlushTimer) {
        clearInterval(audioFlushTimer);
        audioFlushTimer = null;
      }
      pendingAudioBuffers = [];
      isSendingAudio = false;
      log("Audio capture paused");
      return;
    }

    const wasStreamMode = audioSourceMode === "stream";

    if (audioCapture) {
      audioCapture.getTracks().forEach((t) => t.stop());
      audioCapture = null;
    }
    if (audioWorkletNode) {
      audioWorkletNode.disconnect();
      audioWorkletNode = null;
    }
    if (audioSinkGain) {
      audioSinkGain.disconnect();
      audioSinkGain = null;
    }
    if (audioContext) {
      audioContext.suspend().catch(() => {});
    }

    // Stream sources become invalid once tracks are stopped; rebuild on resume.
    // Keep media-element sources because browsers allow only one per element.
    if (wasStreamMode && audioSource) {
      try {
        audioSource.disconnect();
      } catch (_) {
        // No-op.
      }
      audioSource = null;
      audioSourceVideo = null;
      audioSourceMode = "none";
    }

    if (audioFlushTimer) {
      clearInterval(audioFlushTimer);
      audioFlushTimer = null;
    }
    pendingAudioBuffers = [];
    isSendingAudio = false;
    log("Audio capture stopped (full reset)");
  }

  function boot() {
    log("Booting content script");
    injectOverlay();
    startWatchers();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
