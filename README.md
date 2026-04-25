# Lucky Voice – ASL Hand Gesture YouTube Extension

A browser extension that translates YouTube video transcripts to American Sign Language (ASL) hand gestures in real-time, synced with video playback.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  YouTube Page (content scripts)                          │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  YT Sync    │──│Controller│──│  3D Hand Renderer   │ │
│  │ (polls video│  │(brain)   │  │  (Three.js)         │ │
│  │  currentTime│  │          │  │  - HandRig          │ │
│  │  segments)  │  │          │  │  - AnimPlayer        │ │
│  └─────────────┘  └────┬─────┘  └─────────────────────┘ │
│                        │                                 │
│  ┌─────────────┐  ┌────┴─────┐  ┌─────────────────────┐ │
│  │  Footprint  │  │Transcript│  │  DOM Overlay        │ │
│  │  Tracker    │  │  Cache   │  │  - Canvas           │ │
│  │  (events)   │  │(storage) │  │  - Subtitles        │ │
│  └─────────────┘  └──────────┘  │  - Progress bar     │ │
│                                 └─────────────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ chrome.runtime messages
┌──────────────────────┴───────────────────────────────────┐
│  Popup UI                                                │
│  - Start/Stop button                                     │
│  - Live signing info (current gloss, text, progress)     │
│  - Opacity slider                                        │
│  - Session activity footprint                            │
│  - Backend status indicator                              │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (fetch)
┌──────────────────────┴───────────────────────────────────┐
│  FastAPI Backend (port 8000)                             │
│  POST /process { url } → { segments: [{start, end,      │
│                              text, asl}] }               │
│  GET  /health → { ok: true }                             │
│                                                          │
│  Pipeline: YouTube URL → extract video ID →              │
│            fetch transcript → POS tag → lemmatize →      │
│            drop ASL fillers → time-topic-first reorder → │
│            return timed ASL gloss segments                │
└──────────────────────────────────────────────────────────┘
```

## How It Works

1. **User opens a YouTube video** and clicks the Lucky Voice popup
2. **Popup detects** it's a YouTube page and checks backend health
3. **User clicks Start** → popup tells the content script to start the pipeline
4. **Content script fetches** transcript from the backend (or cache)
5. **YT Sync module** polls the `<video>` element's `currentTime` every 120ms
6. **When video enters a segment's time window**, the controller:
   - Converts the ASL gloss to gesture tokens
   - Calculates adaptive speed (faster for long sentences in short segments)
   - Plays the tokens on the 3D hand model
   - Shows subtitle overlay with ASL gloss + original text
7. **When video pauses**, gestures pause. **When resumed**, gestures resume from the correct position
8. **User footprint** (start/pause/resume/seek/stop) is recorded with timestamps
9. **Transcripts are cached** in `chrome.storage.local` to avoid redundant backend calls

## Setup

### Backend

```bash
cd backend
pip install -e .    # or: uv sync
python main.py      # starts on http://127.0.0.1:8000
```

### Extension

1. Open `chrome://extensions` (or `about:debugging` in Firefox)
2. Enable Developer Mode
3. Click "Load unpacked" and select the `ext/` folder
4. Navigate to any YouTube video
5. Click the Lucky Voice icon → Start

## Features

- **Real-time YT sync**: Hand gestures follow the video timeline exactly
- **Adaptive speed**: Gesture playback speed adjusts based on segment duration
- **Pause/Resume sync**: Gestures pause when video pauses, resume when it plays
- **Seek handling**: Seeking the video jumps gestures to the correct segment
- **Transcript caching**: Backend responses cached locally (last 20 videos)
- **User footprint**: All interactions logged with timestamps for session restore
- **53+ ASL signs**: Full sign animations for common words
- **26 fingerspell letters**: A–Z hand shapes for unknown words
- **Draggable overlay**: Position the hand model anywhere on screen
- **Scroll to resize**: Mouse wheel resizes the overlay
- **Opacity control**: Adjust hand model transparency
- **Subtitle bar**: Shows current ASL gloss and original text
- **Progress indicator**: Visual segment progress bar
- **Status badge**: Green (active) / Yellow (paused) indicator

## ASL Dictionary

The extension includes sign animations for:

**Core**: HELLO, YES, NO, THANK_YOU, PLEASE, SORRY, HELP, LOVE  
**Pronouns**: I, ME, YOU, MY, YOUR  
**Questions**: WHAT, WHERE, HOW, WHY, WHEN  
**Actions**: KNOW, THINK, WANT, NEED, UNDERSTAND, GO, COME, SEE, STOP, LIKE, LEARN, WORK, EAT, DRINK, GIVE, TRY, FEEL, LIVE, DO, HAVE, CAN  
**People**: NAME, FRIEND, FAMILY, PEOPLE  
**Places**: SCHOOL, HOME  
**Emotions**: GOOD, BAD, GREAT, HAPPY, SAD  
**Other**: TIME, MORE, AGAIN, FINISH  

Words not in the dictionary are **fingerspelled** using A–Z hand shapes.

## Extension File Structure

```
ext/
├── manifest.json              # Extension manifest (v2)
├── content.js                 # Entry point for content scripts
├── popup.html                 # Popup UI
├── popup.js                   # Popup logic
├── popup.css                  # Popup styles
├── modules/
│   ├── config.js              # Configuration constants
│   ├── storage.js             # State persistence
│   ├── styles.js              # Injected CSS (overlay, animations)
│   ├── drag-resize.js         # Draggable/resizable overlay
│   ├── dom.js                 # DOM creation (overlay, subtitles, progress)
│   ├── renderer.js            # Three.js hand renderer wrapper
│   ├── transcript-cache.js    # Transcript caching in storage
│   ├── footprint.js           # User interaction tracker
│   ├── yt-sync.js             # YouTube video synchronization
│   └── controller.js          # Main orchestrator
├── hand-model/
│   ├── bootstrap.js           # Three.js scene setup
│   ├── hand-rig.js            # 3D hand bone structure
│   ├── anim-player.js         # Animation queue player
│   ├── utils.js               # Math utilities
│   └── data/
│       ├── shapes.js          # A-Z hand shape poses
│       ├── signs.js           # Word sign animations
│       └── gloss.js           # Text-to-ASL dictionary
└── lib/
    └── three.module.js        # Three.js library
```