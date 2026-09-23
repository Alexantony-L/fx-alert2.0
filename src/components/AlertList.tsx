import type { AlertWithPrice } from "@/types/alert";
import AlertItem from "./AlertItem";

type AlertListProps = {
  alerts: AlertWithPrice[];
  loading: boolean;
  onRemoved: () => void;
};

export default function AlertList({ alerts, loading, onRemoved }: AlertListProps) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Active Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="text-xs text-slate-500">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading && alerts.length === 0 ? (
          <p className="animate-pulse rounded-xl border border-white/5 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-400">
            Checking...
          </p>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-300">No active alerts.</p>
            <p className="mt-1 text-xs text-slate-500">Create your first price alert.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onRemoved={onRemoved} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
