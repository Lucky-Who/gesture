import re
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url: str):
    match = re.search(r"v=([^&]+)", url)
    if match:
        return match.group(1)

    match = re.search(r"youtu\.be/([^?&]+)", url)
    if match:
        return match.group(1)

    return None


def get_transcript(video_id: str):
    api = YouTubeTranscriptApi()
    print("Fetching captions for video ID:", video_id)
    return api.fetch(video_id)

