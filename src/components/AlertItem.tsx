"use client";

import { useState } from "react";
import type { AlertWithPrice } from "@/types/alert";

type AlertItemProps = {
  alert: AlertWithPrice;
  onRemoved: () => void;
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value);
}

export default function AlertItem({ alert, onRemoved }: AlertItemProps) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    try {
      await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
    } catch {
      // Ignore — the list refresh below reconciles the UI with the server.
    } finally {
      setRemoving(false);
    }
    onRemoved();
  }

  return (
    <li className="rounded-xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <span className="text-lg font-semibold tracking-wide text-slate-100">
          {alert.pair}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="rounded-lg border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removing ? "Removing..." : "Remove"}
        </button>
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Target</span>
          <span className="font-medium text-slate-100">{formatPrice(alert.price)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Current</span>
          <span className="font-medium text-slate-100">
            {alert.currentPrice === null ? (
              <span className="text-slate-500">Unavailable</span>
            ) : (
              formatPrice(alert.currentPrice)
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Status</span>
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              alert.triggered ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                alert.triggered ? "bg-emerald-400" : "animate-pulse bg-amber-400"
              }`}
            />
            {alert.triggered ? "Triggered" : "Waiting"}
          </span>
        </div>
      </div>
    </li>
  );
}
