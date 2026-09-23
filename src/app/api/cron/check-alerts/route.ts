import { checkAlerts } from "@/lib/price-monitor";

/**
 * GET /api/cron/check-alerts — run one price-check cycle.
 *
 * This is the serverless-friendly entry point for the price monitor
 * (Vercel Cron, cron-job.org, GitHub Actions, your own crontab, ...).
 * It runs the exact same checkAlerts() used by the local in-process monitor.
 *
 * Authorized via the CRON_SECRET environment variable:
 *   - `Authorization: Bearer <CRON_SECRET>` header (used automatically by Vercel Cron)
 *   - or `?secret=<CRON_SECRET>` query parameter
 *
 * If CRON_SECRET is not set the endpoint still works (handy for local dev),
 * but the response includes a warning — set the secret before deploying.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const url = new URL(request.url);
    const authHeader = request.headers.get("authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const provided = bearer || url.searchParams.get("secret") || "";

    if (provided !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await checkAlerts();

  return Response.json({
    message: "Check complete",
    checked: result.checked,
    triggered: result.triggered,
    errors: result.errors,
    ...(result.skipped ? { skipped: true } : {}),
    ...(secret
      ? {}
      : {
          warning:
            "CRON_SECRET is not set — this endpoint is unprotected. Set CRON_SECRET before deploying.",
        }),
  });
}
