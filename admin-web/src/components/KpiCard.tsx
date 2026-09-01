import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  highlight?: boolean;
  sublabel?: string;
  /** Decorative accent for the metric — never the only carrier of meaning. */
  icon?: LucideIcon;
}

export default function KpiCard({ label, value, highlight, sublabel, icon: Icon }: Props) {
  return (
    <div
      className={`rounded-card border p-5 shadow-card ${
        highlight ? "border-primary bg-primary-light" : "border-ink/10 bg-surface"
      }`}
    >
      <p className="text-sm text-ink-secondary">{label}</p>
      <p
        className={`mt-2 flex items-center gap-1.5 text-2xl font-semibold ${
          highlight ? "text-primary-dark" : "text-ink"
        }`}
      >
        {Icon && <Icon className="h-5 w-5 text-amber-500" aria-hidden="true" />}
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}
