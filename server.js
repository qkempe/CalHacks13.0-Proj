// Function Tracer server: serves the game and asks Claude to explain each attempt.
// No dependencies: uses Node's built-in http server and fetch (Node 20.6+).
//
// The game's code computes every score and measurement. Claude only explains them,
// so it can never give a student a wrong math answer.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5"; // fast + cheap; good for short feedback
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

if (!API_KEY) console.warn("⚠️  ANTHROPIC_API_KEY is not set. The game will use its backup messages.");

const SYSTEM = `You are a warm, patient math coach inside a game where students trace graphs in the air with their finger, using a webcam.
The players are students with learning differences (such as dyscalculia or ADHD), roughly ages 10 to 15. Your words may be read aloud.

You receive the target equation and measurements that the game's code already computed. Those measurements are the truth.

Rules:
- Never calculate, guess, or invent numbers, slopes, points, or answers beyond what you are given. Never contradict the score.
- At most 2 short sentences, under 30 words total. Use simple, everyday words at about a 3rd-grade reading level.
- First say one specific thing that went well. Then give exactly ONE small, concrete thing to try next time.
- Never use the words "wrong", "bad", "easy", "just", or "simply". No emojis. Plain text only.
- If there is no mistake and the score is 80 or higher, celebrate briefly and specifically instead.

What the fields mean (for each piece of the graph):
- mistake "wrong_direction": the trace slopes the opposite way from the real graph (compare signs of userSlope and trueSlope).
- mistake "off_target": the shape is close but shifted. avgOffset > 0 means drawn too high; avgOffset < 0 means too low.
- mistake "incomplete": only part of the graph was drawn. coverage is the fraction covered (1 = all of it).
- mistake null: no major mistake.
- avgErr: average distance from the real graph, in grid squares. Smaller is better.
- score: 0 to 100.`;

// Only pass along the fields we expect, so nothing unexpected reaches Claude.
function cleanAttempt(body) {
  const { equation, overall, pieces } = body ?? {};
  if (typeof equation !== "string" || !Array.isArray(pieces) || pieces.length === 0) return null;
  const num = v => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  const MISTAKES = ["wrong_direction", "off_target", "incomplete", "missing_piece"];
  return {
    equation: equation.slice(0, 40),
    overall: num(overall),
    pieces: pieces.slice(0, 5).map(p => ({
      score: num(p?.score),
      mistake: MISTAKES.includes(p?.mistake) ? p.mistake : null,
      userSlope: num(p?.userSlope), trueSlope: num(p?.trueSlope),
      avgErr: num(p?.avgErr), avgOffset: num(p?.avgOffset), coverage: num(p?.coverage),
    })),
  };
}

async function askClaude(attempt) {
  if (!API_KEY) throw new Error("no API key");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 150,
      system: SYSTEM,
      messages: [{ role: "user", content: `Student attempt:\n${JSON.stringify(attempt, null, 2)}` }],
    }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`API ${resp.status}: ${data?.error?.message ?? "unknown error"}`);
  const text = (data.content ?? []).filter(b => b.type === "text").map(b => b.text).join(" ").trim();
  if (!text) throw new Error("empty response");
  return text.slice(0, 400);
}

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/feedback") {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 20_000) return send(res, 413, { error: "too_large" });
      }
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: "bad_json" }); }
      const attempt = cleanAttempt(body);
      if (!attempt) return send(res, 400, { error: "bad_request" });
      try {
        const text = await askClaude(attempt);
        console.log(`[${attempt.equation}] score ${attempt.overall} → ${text}`);
        return send(res, 200, { text });
      } catch (err) {
        console.error("Claude error:", err.message);
        return send(res, 502, { error: "claude_unavailable" }); // the page shows its backup message
      }
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      return send(res, 200, await readFile(path.join(PUBLIC, "index.html")), "text/html; charset=utf-8");
    }
    send(res, 404, "Not found", "text/plain");
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "server_error" });
  }
});

server.listen(PORT, () => console.log(`Function Tracer running at http://localhost:${PORT}`));
