interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children, action }: Props) {
  return (
    <div className="rounded-card border-2 border-ink bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="text-sm font-semibold text-ink/70">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
