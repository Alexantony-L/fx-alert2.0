import { addAlert, getAlerts } from "@/lib/alert-store";
import { getCachedPrice } from "@/lib/price-monitor";
import type { AlertWithPrice } from "@/types/alert";

// Alerts change constantly — never cache this route.
export const dynamic = "force-dynamic";

/**
 * POST /api/alerts  — create an alert      body: { "pair": "XAUUSD", "price": 3650.50 }
 * GET  /api/alerts  — list active alerts   (enriched with the last cached market price)
 */

const PAIR_PATTERN = /^[A-Z]{3,12}(?:\/[A-Z]{3,12})?$/;

function serializeAlerts(): AlertWithPrice[] {
  return getAlerts().map((alert) => {
    const cached = getCachedPrice(alert.pair);
    return {
      ...alert,
      currentPrice: cached?.price ?? null,
      lastCheckedAt: cached?.checkedAt ?? null,
    };
  });
}

export async function GET() {
  return Response.json({ alerts: serializeAlerts() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { pair, price } = (body ?? {}) as { pair?: unknown; price?: unknown };

  // --- Validate pair: required, trimmed, upper-cased ---
  const normalizedPair = typeof pair === "string" ? pair.trim().toUpperCase() : "";
  if (!normalizedPair) {
    return Response.json({ error: "Pair is required" }, { status: 400 });
  }
  if (!PAIR_PATTERN.test(normalizedPair)) {
    return Response.json(
      { error: "Invalid pair format. Use something like XAUUSD or EUR/USD" },
      { status: 400 }
    );
  }

  // --- Validate price: required, positive number (number or numeric string) ---
  if (typeof price !== "number" && typeof price !== "string") {
    return Response.json({ error: "Price must be a positive number" }, { status: 400 });
  }
  const numericPrice = Number(typeof price === "string" ? price.trim() : price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return Response.json({ error: "Price must be a positive number" }, { status: 400 });
  }

  const alert = addAlert(normalizedPair, numericPrice);

  return Response.json({ message: "Alert created", alert }, { status: 201 });
}
