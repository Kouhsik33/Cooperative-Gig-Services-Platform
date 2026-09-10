import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  highlight?: boolean;
  sublabel?: string;
  tone?: "lime" | "yellow" | "cyan" | "purple" | "coral" | "peach" | "surface";
  icon?: LucideIcon;
}

const TONE_CLASSES: Record<string, string> = {
  lime: "bg-lime-light border-ink",
  yellow: "bg-yellow-light border-ink",
  cyan: "bg-cyan-light border-ink",
  purple: "bg-purple-light border-ink",
  coral: "bg-primary-light border-ink",
  peach: "bg-peach-light border-ink",
  surface: "bg-surface border-ink",
};

export default function KpiCard({
  label,
  value,
  highlight,
  sublabel,
  tone = "surface",
  icon: Icon,
}: Props) {
  const bgClass = highlight ? "bg-lime border-ink" : TONE_CLASSES[tone] || TONE_CLASSES.surface;

  return (
    <div
      className={`rounded-card border-2 p-5 shadow-card transition-transform hover:-translate-y-0.5 ${bgClass}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-ink/80">{label}</p>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-retro-sm">
            <Icon className="h-4 w-4 text-ink" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-3xl font-black text-ink">
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs font-bold text-ink/70">{sublabel}</p>}
    </div>
  );
}
