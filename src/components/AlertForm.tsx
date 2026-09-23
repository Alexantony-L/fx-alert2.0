"use client";

import { useEffect, useState } from "react";

type FormStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

type AlertFormProps = {
  onCreated: () => void;
};

const PAIR_OPTIONS = [
  { value: "EUR/USD", label: "EUR/USD - Euro / US Dollar" },
  { value: "GBP/USD", label: "GBP/USD - British Pound / US Dollar" },
  { value: "USD/JPY", label: "USD/JPY - US Dollar / Japanese Yen" },
  { value: "USD/CHF", label: "USD/CHF - US Dollar / Swiss Franc" },
  { value: "AUD/USD", label: "AUD/USD - Australian Dollar / US Dollar" },
  { value: "USD/CAD", label: "USD/CAD - US Dollar / Canadian Dollar" },
  { value: "NZD/USD", label: "NZD/USD - New Zealand Dollar / US Dollar" },
  { value: "EUR/GBP", label: "EUR/GBP - Euro / British Pound" },
  { value: "EUR/JPY", label: "EUR/JPY - Euro / Japanese Yen" },
  { value: "GBP/JPY", label: "GBP/JPY - British Pound / Japanese Yen" },
  { value: "XAU/USD", label: "XAU/USD - Gold / US Dollar" },
  { value: "XAG/USD", label: "XAG/USD - Silver / US Dollar" },
];

export default function AlertForm({ onCreated }: AlertFormProps) {
  const [pair, setPair] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  // Clear the success message after a few seconds.
  useEffect(() => {
    if (status.kind !== "success") return;
    const timer = setTimeout(() => setStatus({ kind: "idle" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatus({ kind: "loading" });

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, price }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setStatus({ kind: "error", text: `✕ ${data.error ?? "Failed to create alert"}` });
        return;
      }

      setStatus({ kind: "success", text: "✓ Alert created" });
      setPair("");
      setPrice("");
      onCreated();
    } catch {
      setStatus({ kind: "error", text: "✕ Failed to create alert" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="pair" className="mb-1.5 block text-sm font-medium text-slate-300">
          Pair
        </label>
        <select
          id="pair"
          name="pair"
          value={pair}
          onChange={(event) => setPair(event.target.value)}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Select a pair
          </option>
          {PAIR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-slate-300">
          Target Price
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="3650.50"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Checking..." : "Set Alert"}
      </button>

      <p aria-live="polite" className="min-h-5 text-center text-sm">
        {status.kind === "success" && (
          <span className="text-emerald-400">{status.text}</span>
        )}
        {status.kind === "error" && <span className="text-rose-400">{status.text}</span>}
      </p>
    </form>
  );
}
