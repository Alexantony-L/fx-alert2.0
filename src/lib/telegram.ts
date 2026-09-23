/**
 * Telegram Bot API client — SERVER-SIDE ONLY.
 *
 * The bot token and chat id live in TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 * and are never sent to the browser. Only this module talks to Telegram.
 *
 * Docs: https://core.telegram.org/bots/api#sendmessage
 */

const DEFAULT_API_BASE = "https://api.telegram.org";
const TIMEOUT_MS = 8_000;

type TelegramResponse = {
  ok?: boolean;
  description?: string;
};

/** Send a text message to the chat configured via TELEGRAM_CHAT_ID. Throws on failure. */
export async function sendTelegramMessage(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error(
      "Telegram is not configured: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID is missing"
    );
  }

  const apiBase = process.env.TELEGRAM_API_BASE || DEFAULT_API_BASE;
  const url = `${apiBase}/bot${botToken}/sendMessage`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `Telegram request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const data = (await response.json().catch(() => null)) as TelegramResponse | null;

  if (!response.ok || data?.ok !== true) {
    throw new Error(`Telegram error: ${data?.description ?? `HTTP ${response.status}`}`);
  }
}
