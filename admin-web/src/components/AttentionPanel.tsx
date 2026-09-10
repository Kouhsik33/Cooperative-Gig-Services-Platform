import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

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
      <div className="rounded-card border-2 border-ink bg-lime-light p-5 shadow-card">
        <p className="flex items-center gap-2 text-sm font-black text-ink">
          <CheckCircle2 className="h-5 w-5 text-ink" aria-hidden="true" />
          All clear! No unserved bookings, no pending verifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {live.map((item) => (
        <div
          key={item.key}
          className={`flex flex-wrap items-center gap-4 rounded-card border-2 border-ink p-5 shadow-card ${
            item.tone === "critical" ? "bg-primary-light" : "bg-yellow-light"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-surface text-base font-black text-ink shadow-retro-sm">
            {item.count}
          </span>
          <div className="flex-1">
            <p className="text-sm font-black text-ink">
              {item.label}
            </p>
            <p className="text-xs font-semibold text-ink/70">{item.detail}</p>
          </div>
          <Link
            to={item.to}
            className={`rounded-xl border-2 border-ink px-4 py-2 text-xs font-black text-ink shadow-retro-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 ${
              item.tone === "critical" ? "bg-primary hover:bg-primary-dark" : "bg-yellow hover:bg-yellow-dark"
            }`}
          >
            {item.action}
          </Link>
        </div>
      ))}
    </div>
  );
}
