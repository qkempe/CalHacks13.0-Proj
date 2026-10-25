# Function Tracer

Trace math functions in the air with your finger. A webcam tracks your hand, the game scores your trace, and Claude explains what to try next in short, kid-friendly language.

## Run it
1. Install Node.js 20.6 or newer. No `npm install` needed; there are no dependencies.
2. Copy `.env.example` to `.env` and add your Anthropic API key.
3. `npm start`, then open http://localhost:3000 in Chrome and allow the camera.

Your thumb tip is the pen: bring your pointer finger down onto it and hold on the graph (or hold Space) to draw. Press Enter to check.

Hand controls:
- Quick pinch on a button, checkbox, or dropdown to click it
- Two fingers up (✌️) and move your hand to scroll
- Make a fist for 1 second to clear
- Two open hands held together to zoom in; push them apart quickly to zoom out

If two hands are on screen, the first hand that appeared stays in control of the pen. Another hand can only take over after it has been alone on screen for 2 seconds (a ring fills up while it waits).

## How Claude is used
- The game's code computes every score, slope, and distance. Claude never does the math.
- Claude receives only those measurements (no video, no images, no personal data) and turns them into one encouraging sentence plus one concrete tip.
- If Claude is slow (over 8 seconds) or unavailable, the game shows a built-in backup message.

## Where it could go wrong, and what we do
- **Claude states a wrong number:** it is told to use only the provided measurements, and all scoring is shown from the game's code.
- **Feedback too long or hard to read:** limited to 2 short sentences at about a 3rd-grade reading level.
- **Discouraging tone:** words like "wrong" and "easy" are banned; it always starts with something that went well.
- **Privacy:** video never leaves the browser. Only numbers about the trace are sent.

## Files
- `public/index.html`: hand tracking, game, scoring
- `server.js`: serves the page and calls Claude at `/api/feedback`
