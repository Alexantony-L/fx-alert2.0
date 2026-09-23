"use client";

import { useCallback, useEffect, useState } from "react";
import AlertForm from "@/components/AlertForm";
import AlertList from "@/components/AlertList";
import type { AlertWithPrice } from "@/types/alert";

// UI-only refresh of the alert list. The browser NEVER calls Twelve Data or
// Telegram — it only talks to this app's own API routes.
const REFRESH_INTERVAL_MS = 5000;

export default function Home() {
  const [alerts, setAlerts] = useState<AlertWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAlerts = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const data = (await response.json()) as { alerts?: AlertWithPrice[] };
      if (Array.isArray(data.alerts)) setAlerts(data.alerts);
    } catch {
      // Network hiccup — keep showing the previous list.
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAlerts(true);
    const timer = setInterval(() => void refreshAlerts(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshAlerts]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          Forex Price Alert
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Get a Telegram message when your target price is reached.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
        <AlertForm onCreated={() => void refreshAlerts(false)} />

        <div className="my-8 border-t border-white/10" />

        <AlertList
          alerts={alerts}
          loading={loading}
          onRemoved={() => void refreshAlerts(false)}
        />
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Alerts are stored in server memory and disappear when the server restarts.
      </p>
    </main>
  );
}
