interface Props {
  label: string;
  value: string | number;
  highlight?: boolean;
  sublabel?: string;
}

export default function KpiCard({ label, value, highlight, sublabel }: Props) {
  return (
    <div
      className={`rounded-card border p-5 shadow-card ${
        highlight ? "border-primary bg-primary-light" : "border-ink/10 bg-surface"
      }`}
    >
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlight ? "text-primary-dark" : "text-ink"}`}>
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}
