# Function Tracer

Trace math functions in the air with your finger. A webcam tracks your hand, the game scores your trace, and Claude explains what to try next in short, kid-friendly language.

## Run it
1. Install Node.js 20.6 or newer. No `npm install` needed; there are no dependencies.
2. Copy `.env.example` to `.env` and add your Anthropic API key.
3. `npm start`, then open http://localhost:3000 in Chrome and allow the camera.

Your thumb tip is the pen: bring your pointer finger down onto it and hold on the graph (or hold Space) to draw. Press Enter to check.

Hand controls:
- Quick pinch on a button, checkbox, or dropdown to click it
- Make a tight fist and hold it for about 1 second to clear (a ring fills up). Pinching always wins, so curling your fingers while drawing won't clear

Zoom with the − / + buttons in the corner of the graph, or the + and − keys.

Steady drawing (nobody's hand is steady in the air):
- While you draw, the pen moves less than your hand, like a mouse: slow, careful movement (and shake) is scaled down the most, quicker sweeps a bit less. **Pen speed** sets how much: 🐌 Steady (about 0.1–0.3× your hand), ✍️ Normal (about 0.2–0.45×), ⚡ Fast (about 0.4–1×). After you lift the pen it stays where you stopped while your hand holds still, so you can pinch again and carry on; as soon as your hand moves, the pointer catches up with it so you can reach the buttons.
- The line only breaks when you open your fingers. A pinch that looks open for a split second (motion blur), a tilted hand, or the camera losing your hand for a moment won't lift the pen.
- When you lift the pen, the game works out what you meant from your own stroke: a straight line (any angle), a curve, or a free shape. It never looks at the answer, so a wrong shape stays wrong; it just looks neater.
  - **Snap to clean shape ON:** the stroke becomes that clean line or curve.
  - **OFF:** the shake is smoothed out and the stroke is pulled partway toward the shape.
- Start a new stroke right where the last one ended (within a few seconds) to carry on the same line or curve.

If several people are on camera, the person closest to the camera gets the pen; hands of people in the background are ignored. Once a hand has the pen it keeps it. Another hand can take over after 2 seconds if the main hand has left, or after 1 second if it is clearly closer to the camera (a ring fills up while it waits). If the main hand is gone for 1.5 seconds, the game resets and gives the pen to the closest hand right away. For a few seconds after you lower your hand, much smaller hands (people behind you) still can't grab it.


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
