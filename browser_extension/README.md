# YouTube ASL Overlay Extension

This extension overlays a packaged ASL app above YouTube and syncs to video play/pause.

## Important Constraint

This extension does not modify your existing project files.
It controls the ASL page by sending messages and simulating clicks on existing UI buttons.

## How It Works

- `youtube_overlay.js` runs on `https://www.youtube.com/*`.
- It injects a floating iframe pointing to the packaged extension page `asl_app/asl_system.html`.
- It reads captions from YouTube subtitle nodes.
- It sends messages: `setTextAndSign`, `pause`, `resume`, `stop`.
- `asl_bridge.js` is loaded by `asl_app/asl_system.html` and maps messages to UI actions:
  - set text in `#textInput`
  - click `#signBtn`
  - click `#stopBtn`

## Endpoints Used

No backend endpoints are required. The extension runs fully from packaged files.

## Install Steps

1. In Chrome/Edge open extensions page:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`

2. Turn on Developer mode.
3. Click "Load unpacked".
4. Select the `browser_extension` folder.
5. Open a YouTube video with captions enabled.

## Overlay Controls

- `SYNC`: reads current caption and signs it.
- `STOP`: stops current ASL animation.
- `_`: minimize/restore overlay.

## Pause Behavior

- When YouTube video pauses, extension sends `pause` and ASL stops.
- When YouTube video resumes, extension sends `resume` and ASL replays the latest caption text.

Note: because we are not editing the ASL engine internals, pause is implemented as stop-and-replay on resume.

## If You Still See A Network Warning

1. Remove the extension from browser.
2. Load unpacked again from `browser_extension`.
3. Hard refresh YouTube tab (`Ctrl+Shift+R`).
4. Open DevTools and confirm iframe URL starts with `chrome-extension://` (or `edge-extension://`) not `http://127.0.0.1`.
