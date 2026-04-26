from pathlib import Path
import asyncio
import base64
import io
import json
import urllib.request
import wave
import zipfile

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse, JSONResponse
from starlette.requests import Request
from starlette.staticfiles import StaticFiles
import uvicorn

from vosk import KaldiRecognizer, Model


app = Starlette(
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ]
)

MODEL_ROOT = Path("speech_models")
MODEL_DIR = MODEL_ROOT / "vosk-model-small-en-us-0.15"
MODEL_ZIP_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
_vosk_model = None

app.mount('/src', StaticFiles(directory='hand_model/src'), name='src')


def ensure_vosk_model() -> Path:
    if MODEL_DIR.exists():
        return MODEL_DIR

    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    zip_path = MODEL_ROOT / "vosk-model-small-en-us-0.15.zip"

    if not zip_path.exists():
        urllib.request.urlretrieve(MODEL_ZIP_URL, zip_path)

    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(MODEL_ROOT)

    return MODEL_DIR


def get_vosk_model() -> Model:
    global _vosk_model
    if _vosk_model is None:
        model_dir = ensure_vosk_model()
        _vosk_model = Model(str(model_dir))
    return _vosk_model


def transcribe_wav_bytes(audio_bytes: bytes) -> str:
    with wave.open(io.BytesIO(audio_bytes), "rb") as wav_file:
        if wav_file.getnchannels() != 1 or wav_file.getsampwidth() != 2:
            raise ValueError("Expected mono 16-bit WAV audio")

        recognizer = KaldiRecognizer(get_vosk_model(), wav_file.getframerate())
        recognizer.SetWords(False)

        while True:
            frames = wav_file.readframes(4000)
            if not frames:
                break
            recognizer.AcceptWaveform(frames)

        result = json.loads(recognizer.FinalResult())
        return (result.get("text") or "").strip()


async def transcribe(request: Request):
    content_type = request.headers.get("content-type", "")
    audio_bytes = b""

    if "application/json" in content_type:
        try:
            payload = await request.json()
            wav_base64 = payload.get("wavBase64") if isinstance(payload, dict) else None
            if not wav_base64:
                return JSONResponse({"error": "Missing wavBase64"}, status_code=400)
            audio_bytes = base64.b64decode(wav_base64)
        except Exception as exc:
            return JSONResponse({"error": f"Invalid JSON payload: {exc}"}, status_code=400)
    elif "audio/wav" in content_type or "audio/wave" in content_type:
        audio_bytes = await request.body()
    else:
        return JSONResponse(
            {"error": f"Unsupported content-type: {content_type}"},
            status_code=400,
        )

    if not audio_bytes:
        return JSONResponse({"text": ""}, status_code=200)

    try:
        text = await asyncio.to_thread(transcribe_wav_bytes, audio_bytes)
        return JSONResponse({"text": text})
    except Exception as exc:
        print(f"[ASL Backend] /api/transcribe failed: {exc}")
        return JSONResponse({"error": str(exc)}, status_code=400)

async def homepage(request: Request):
    return FileResponse('hand_model/asl_system.html')

app.add_route('/', homepage)
app.add_route('/api/transcribe', transcribe, methods=['POST'])


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
