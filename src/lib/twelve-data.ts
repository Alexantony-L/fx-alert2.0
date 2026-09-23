/**
 * Twelve Data API client — SERVER-SIDE ONLY.
 *
 * The API key lives in TWELVE_DATA_API_KEY and is never sent to the browser.
 * Only this module talks to Twelve Data.
 *
 * Docs: https://twelvedata.com/docs#price
 */

const DEFAULT_BASE_URL = "https://api.twelvedata.com";
const TIMEOUT_MS = 8_000;

type TwelveDataPriceResponse = {
  price?: string;
  status?: string;
  code?: number;
  message?: string;
};

/** Fetch the current price for a symbol, e.g. "XAUUSD" → 3651.2 */
export async function getCurrentPrice(symbol: string): Promise<number> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Twelve Data is not configured: TWELVE_DATA_API_KEY is missing");
  }

  const baseUrl = process.env.TWELVE_DATA_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl}/price?${new URLSearchParams({ symbol, apikey: apiKey })}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new Error(
      `Twelve Data request failed for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const data = (await response.json().catch(() => null)) as TwelveDataPriceResponse | null;

  if (!response.ok || data?.status === "error") {
    const detail = data?.message ?? `HTTP ${response.status}`;
    if (response.status === 429 || data?.code === 429) {
      throw new Error(`Twelve Data rate limit reached for ${symbol}: ${detail}`);
    }
    throw new Error(`Twelve Data error for ${symbol}: ${detail}`);
  }

  // Twelve Data returns the price as a string, e.g. { "price": "3647.20000" }
  const price = Number(data?.price);
  if (!Number.isFinite(price)) {
    throw new Error(`Invalid price response from Twelve Data for ${symbol}`);
  }

  return price;
}
