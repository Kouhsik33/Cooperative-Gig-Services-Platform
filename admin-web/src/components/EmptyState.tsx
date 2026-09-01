import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Link } from "react-router-dom";

// Empty states should offer a way forward, not just report absence
// (UI/UX Pro Max: "show helpful message and action").
export default function EmptyState({
  Icon = Inbox,
  title,
  body,
  actionLabel,
  actionTo,
}: {
  Icon?: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-ink/10 bg-surface px-6 py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-ink-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs text-ink-muted">{body}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
