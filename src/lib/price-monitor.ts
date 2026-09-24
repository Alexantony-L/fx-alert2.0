import {
  getAlerts,
  markTriggered,
  unmarkTriggered,
  removeTriggeredAlert,
} from "@/lib/alert-store";
import { getCurrentPrice } from "@/lib/twelve-data";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Alert } from "@/types/alert";

/**
 * Price monitor — the business logic of the app:
 *
 *   get alerts → get current price → compare → send Telegram → remove triggered alert
 *
 * startPriceMonitor() is called automatically from src/instrumentation.ts and
 * runs checkAlerts() every 2 minutes by default using setInterval.
 */

export type PriceCheckResult = {
  checked: number;
  triggered: number;
  errors: string[];
  /** true when this call was skipped because a previous run was still in progress */
  skipped?: boolean;
};

type CachedPrice = { price: number; checkedAt: string };

type MonitorGlobal = typeof globalThis & {
  __forexPriceCache?: Map<string, CachedPrice>;
  __forexMonitorRunning?: boolean;
  __forexMonitorStarted?: boolean;
};

const g = globalThis as MonitorGlobal;

// Last known price per pair, filled by checkAlerts(). Read by GET /api/alerts
// so the UI can display a current price WITHOUT the browser calling Twelve Data.
const priceCache: Map<string, CachedPrice> = (g.__forexPriceCache ??= new Map());

const DEFAULT_INTERVAL_MINUTES = 2;

/** Last price the monitor saw for a pair (null if never checked). */
export function getCachedPrice(pair: string): CachedPrice | null {
  return priceCache.get(pair) ?? null;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value);
}

function buildAlertMessage(alert: Alert, currentPrice: number): string {
  return [
    "🚨 Price Alert!",
    "",
    `Pair: ${alert.pair}`,
    `Target: ${formatPrice(alert.price)}`,
    `Current: ${formatPrice(currentPrice)}`,
    "",
    "🎯 Target price reached.",
  ].join("\n");
}

/**
 * Check every active alert against the current market price.
 *
 * - One Twelve Data request per unique pair.
 * - A failure on one pair/alert NEVER stops the other alerts from being checked.
 * - Duplicate protection: an alert is marked as triggered BEFORE the Telegram
 *   message is sent and removed right after, so repeated executions can never
 *   send the same notification twice. If the Telegram send fails, the flag is
 *   reverted and the alert is retried on the next cycle.
 */
export async function checkAlerts(): Promise<PriceCheckResult> {
  // Mutex: never run two checks at the same time.
  if (g.__forexMonitorRunning) {
    return { checked: 0, triggered: 0, errors: [], skipped: true };
  }
  g.__forexMonitorRunning = true;

  const errors: string[] = [];
  let triggeredCount = 0;

  try {
    const activeAlerts = getAlerts();
    if (activeAlerts.length === 0) {
      return { checked: 0, triggered: 0, errors };
    }

    console.log(`[price-monitor] Checking prices for ${activeAlerts.length} alert(s)...`);

    // Fetch each unique pair once per cycle.
    const pairs = [...new Set(activeAlerts.map((alert) => alert.pair))];
    const currentPrices = new Map<string, number>();

    for (const pair of pairs) {
      try {
        const price = await getCurrentPrice(pair);
        currentPrices.set(pair, price);
        priceCache.set(pair, { price, checkedAt: new Date().toISOString() });
        console.log(`[price-monitor] ${pair}: ${formatPrice(price)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        console.error(`[price-monitor] ${message}`);
      }
    }

    for (const alert of activeAlerts) {
      if (alert.triggered) continue; // duplicate protection

      const currentPrice = currentPrices.get(alert.pair);
      if (currentPrice === undefined) continue; // price unavailable this cycle — retry later

      if (currentPrice >= alert.price) {
        markTriggered(alert.id);

        try {
          await sendTelegramMessage(buildAlertMessage(alert, currentPrice));
          removeTriggeredAlert(alert.id);
          triggeredCount++;
          console.log(
            `[price-monitor] Target reached! ${alert.pair} target ${formatPrice(alert.price)} / ` +
              `current ${formatPrice(currentPrice)} — Telegram notification sent, alert removed.`
          );
        } catch (error) {
          // Keep the alert so the next cycle retries the notification.
          unmarkTriggered(alert.id);
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Telegram send failed for ${alert.pair}: ${message}`);
          console.error(`[price-monitor] ${message}`);
        }
      }
    }

    return { checked: activeAlerts.length, triggered: triggeredCount, errors };
  } finally {
    g.__forexMonitorRunning = false;
  }
}

/**
 * Start the in-process scheduler (local development / self-hosted only).
 * Called once from src/instrumentation.ts when the Next.js server boots.
 */
export function startPriceMonitor(): void {
  if (g.__forexMonitorStarted) return;
  g.__forexMonitorStarted = true;

  const minutes = Number(process.env.MONITOR_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES;

  const intervalMs = minutes * 60_000;
  const intervalLabel = `${minutes} minute(s)`;
  console.log(`[price-monitor] Started — checking alerts every ${intervalLabel}.`);

  setInterval(() => {
    void checkAlerts().catch((error) =>
      console.error("[price-monitor] Unexpected error:", error)
    );
  }, intervalMs);

  // One check shortly after boot so the UI gets fresh prices quickly.
  setTimeout(() => {
    void checkAlerts().catch((error) =>
      console.error("[price-monitor] Unexpected error:", error)
    );
  }, 2_000);
}
