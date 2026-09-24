/**
 * Next.js instrumentation hook — runs ONCE when the server process boots.
 *
 * Purpose: start the in-process price monitor whenever the Node.js server boots.
 * The monitor uses setInterval and checks active alerts every two minutes.
 *
 * The /api/cron/check-alerts endpoint remains available for manual or external
 * invocations, but it is no longer scheduled automatically by Vercel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startPriceMonitor } = await import("./lib/price-monitor");
  startPriceMonitor();
}
