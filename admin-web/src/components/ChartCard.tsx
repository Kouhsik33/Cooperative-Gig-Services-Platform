interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children, action }: Props) {
  return (
    <div className="rounded-card border border-ink/10 bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
