/**
 * Next.js instrumentation hook — runs ONCE when the server process boots.
 *
 * Purpose: start the in-process price monitor for LOCAL DEVELOPMENT and
 * SELF-HOSTED deployments (a plain Node.js process, like the old Express app).
 *
 * On serverless platforms (Vercel, etc.) a long-running timer is NOT reliable —
 * functions freeze and are recycled — so we skip it there and rely on the
 * protected cron endpoint instead:
 *
 *     GET /api/cron/check-alerts  (driven by Vercel Cron or any external scheduler)
 *
 * Both paths run the exact same checkAlerts() logic from src/lib/price-monitor.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.VERCEL) {
    console.log(
      "[price-monitor] Serverless deployment detected — in-process scheduler disabled. " +
        "Use /api/cron/check-alerts via Vercel Cron or an external scheduler."
    );
    return;
  }

  const { startPriceMonitor } = await import("./lib/price-monitor");
  startPriceMonitor();
}
