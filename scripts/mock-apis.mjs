#!/usr/bin/env node
/**
 * Tiny mock of the Twelve Data + Telegram APIs — dev/testing utility only.
 *
 * Lets you run and test the FULL alert → trigger → notification flow
 * locally without any real API keys.
 *
 *   node scripts/mock-apis.mjs          # listens on http://localhost:4010
 *
 * Endpoints:
 *   GET  /price?symbol=XAUUSD              → { "price": "3651.20" }
 *   POST /bot<token>/sendMessage           → { "ok": true }   (message is stored)
 *   GET  /__log                            → all messages received by the fake Telegram
 *   GET  /__set?symbol=XAUUSD&price=3600   → change a mock price at runtime
 *
 * Then run the app against the mock:
 *
 *   TWELVE_DATA_BASE_URL=http://localhost:4010 \
 *   TELEGRAM_API_BASE=http://localhost:4010 \
 *   TELEGRAM_BOT_TOKEN=mock-token \
 *   TELEGRAM_CHAT_ID=12345 \
 *   CRON_SECRET=test-secret \
 *   npm run dev
 */
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4010);

const prices = new Map([
  ["XAUUSD", 3651.2],
  ["XAGUSD", 42.61],
  ["EURUSD", 1.085],
]);

/** Messages received by the fake Telegram API. */
const messages = [];

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // --- Twelve Data: /price ---
  if (req.method === "GET" && url.pathname === "/price") {
    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    const price = prices.get(symbol);
    if (price === undefined) {
      return send(res, 404, {
        status: "error",
        code: 404,
        message: `Symbol "${symbol}" not found in the mock price list`,
      });
    }
    console.log(`[mock] price  ${symbol} → ${price}`);
    return send(res, 200, { price: String(price) });
  }

  // --- test helper: change a mock price at runtime ---
  if (req.method === "GET" && url.pathname === "/__set") {
    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    const price = Number(url.searchParams.get("price"));
    if (!symbol || !Number.isFinite(price)) {
      return send(res, 400, { error: "symbol and price query params are required" });
    }
    prices.set(symbol, price);
    console.log(`[mock] set   ${symbol} = ${price}`);
    return send(res, 200, { ok: true, symbol, price });
  }

  // --- test helper: messages received by the fake Telegram ---
  if (req.method === "GET" && url.pathname === "/__log") {
    return send(res, 200, { count: messages.length, messages });
  }

  // --- Telegram Bot API: /bot<token>/sendMessage ---
  if (req.method === "POST" && url.pathname.startsWith("/bot") && url.pathname.endsWith("/sendMessage")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        messages.push({ receivedAt: new Date().toISOString(), ...payload });
        console.log("[mock] Telegram message received:\n" + (payload.text ?? "") + "\n");
        send(res, 200, { ok: true, result: { message_id: messages.length } });
      } catch {
        send(res, 400, { ok: false, description: "Bad JSON" });
      }
    });
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[mock] Twelve Data + Telegram mock listening on http://localhost:${PORT}`);
  console.log(`[mock] prices: ${[...prices.entries()].map(([s, p]) => `${s}=${p}`).join(", ")}`);
});
