import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

// "Where are the problems?" — the one question an operations dashboard must
// answer before any of the others (master prompt §10).
//
// Renders nothing at all when nothing is wrong. A permanently-visible
// "alerts" panel that usually says "0 issues" trains the operator to stop
// looking at it, which is precisely when it matters most.

export interface AttentionItem {
  key: string;
  count: number;
  label: string;
  detail: string;
  to: string;
  action: string;
  tone: "warn" | "critical";
}

export default function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const live = items.filter((i) => i.count > 0);
  if (live.length === 0) {
    return (
      <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Nothing needs attention — no unserved bookings, no pending verifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {live.map((item) => (
        <div
          key={item.key}
          className={`flex flex-wrap items-center gap-3 rounded-card border p-4 ${
            item.tone === "critical"
              ? "border-red-300 bg-red-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <span
            className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-bold text-white ${
              item.tone === "critical" ? "bg-red-600" : "bg-amber-600"
            }`}
          >
            {item.count}
          </span>
          <div className="flex-1">
            <p
              className={`text-sm font-semibold ${
                item.tone === "critical" ? "text-red-900" : "text-amber-900"
              }`}
            >
              {item.label}
            </p>
            <p className="text-xs text-ink-secondary">{item.detail}</p>
          </div>
          <Link
            to={item.to}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
              item.tone === "critical" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {item.action}
          </Link>
        </div>
      ))}
    </div>
  );
}
