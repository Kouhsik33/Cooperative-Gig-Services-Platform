const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-gray-100 text-gray-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ON_THE_WAY: "bg-blue-100 text-blue-700",
  ARRIVED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETION_PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
  SUBMITTED: "bg-gray-100 text-gray-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
