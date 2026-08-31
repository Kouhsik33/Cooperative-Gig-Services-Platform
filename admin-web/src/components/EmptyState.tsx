export default function EmptyState({ icon = "🗂️", title }: { icon?: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="mb-3 text-3xl">{icon}</span>
      <p className="text-sm text-ink-muted">{title}</p>
    </div>
  );
}
