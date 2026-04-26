// Service worker proxy to local transcription backend.

const LOCAL_TRANSCRIBE_URL = "http://127.0.0.1:8000/api/transcribe";

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "TRANSCRIBE_WAV") {
    return;
  }

  (async () => {
    try {
      let wavBytes = null;

      if (typeof msg.wavBase64 === "string" && msg.wavBase64.length > 0) {
        wavBytes = base64ToUint8Array(msg.wavBase64);
      } else if (Array.isArray(msg.wavBytes)) {
        wavBytes = new Uint8Array(msg.wavBytes);
      } else {
        sendResponse({ ok: false, error: "missing_wav_payload" });
        return;
      }

      if (
        wavBytes.length < 12 ||
        wavBytes[0] !== 0x52 ||
        wavBytes[1] !== 0x49 ||
        wavBytes[2] !== 0x46 ||
        wavBytes[3] !== 0x46
      ) {
        sendResponse({ ok: false, error: "invalid_wav_header_no_riff" });
        return;
      }

      const res = await fetch(LOCAL_TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wavBase64: uint8ArrayToBase64(wavBytes) }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        sendResponse({
          ok: false,
          error: `local_transcribe_http_${res.status}: ${errorText}`,
        });
        return;
      }

      const data = await res.json();
      sendResponse({ ok: true, text: data && data.text ? data.text : "" });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});
