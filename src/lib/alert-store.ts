import type { Alert } from "@/types/alert";

/**
 * In-memory alert store — NO database.
 *
 * IMPORTANT
 * ---------
 * Alerts live in the Node.js process memory:
 *   - restarting the server (dev/prod) clears all alerts;
 *   - on serverless platforms every instance has its own memory.
 * This is intentional and acceptable for this version.
 *
 * REPLACING THE STORE LATER
 * -------------------------
 * This module is the ONLY place that knows how alerts are persisted.
 * Swap the function bodies for a database/Redis implementation while
 * keeping the same signatures, and the rest of the app (routes, monitor,
 * UI) keeps working without changes.
 */

type AlertStoreGlobal = typeof globalThis & {
  __forexAlerts?: Alert[];
};

// Keep the array on globalThis so it survives Next.js dev hot reloads.
const g = globalThis as AlertStoreGlobal;
const alerts: Alert[] = (g.__forexAlerts ??= []);

/** Create an alert and add it to the store. */
export function addAlert(pair: string, price: number): Alert {
  const alert: Alert = {
    id: crypto.randomUUID(),
    pair,
    price,
    triggered: false,
    createdAt: new Date().toISOString(),
  };
  alerts.push(alert);
  return alert;
}

/** Return a snapshot of all active alerts. */
export function getAlerts(): Alert[] {
  return [...alerts];
}

/** Return a single alert by id. */
export function getAlert(id: string): Alert | undefined {
  return alerts.find((alert) => alert.id === id);
}

/** Mark an alert as triggered (duplicate protection — see price-monitor). */
export function markTriggered(id: string): void {
  const alert = alerts.find((alert) => alert.id === id);
  if (alert) alert.triggered = true;
}

/** Revert the triggered flag (used when the Telegram send fails, so the alert is retried). */
export function unmarkTriggered(id: string): void {
  const alert = alerts.find((alert) => alert.id === id);
  if (alert) alert.triggered = false;
}

/** Remove an alert by id. Returns true if it existed. */
export function removeAlert(id: string): boolean {
  const index = alerts.findIndex((alert) => alert.id === id);
  if (index === -1) return false;
  alerts.splice(index, 1);
  return true;
}

/** Remove an alert only if it has been triggered. Returns true if it was removed. */
export function removeTriggeredAlert(id: string): boolean {
  const alert = alerts.find((alert) => alert.id === id);
  if (!alert || !alert.triggered) return false;
  return removeAlert(id);
}
