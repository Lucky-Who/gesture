import uvicorn

from utils.extract_transcript import extract_video_id, get_transcript
from utils.asl import asl_convert

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process")
def process(req: dict):

    url = req.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL required")

    print("\n🎬 Processing:", url)

    video_id = extract_video_id(url)

    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    try:
        segments = get_transcript(video_id)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"No captions available: {str(e)}"
        )

    formatted_segments = [
        {
            "start": round(item.start, 2),
            "end": round(item.start + item.duration, 2),
            "text": item.text,
            "asl": asl_convert(item.text) 
        }
        for item in segments
    ]

    return {
        "video_id": video_id,
        "url": url,
        "count": len(formatted_segments),
        "segments": formatted_segments
    }


@app.get("/health")
def health():
    return {"ok": True}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)