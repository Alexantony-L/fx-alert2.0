/**
 * Shared alert types.
 */

export type Alert = {
  id: string;
  pair: string;
  price: number;
  triggered: boolean;
  createdAt: string;
};

/**
 * An alert enriched with the last known market price.
 * `currentPrice` comes from the server-side price cache (filled by the
 * price monitor) — the browser never calls Twelve Data directly.
 * `null` means "no price available yet" and the UI shows "Unavailable".
 */
export type AlertWithPrice = Alert & {
  currentPrice: number | null;
  lastCheckedAt: string | null;
};
