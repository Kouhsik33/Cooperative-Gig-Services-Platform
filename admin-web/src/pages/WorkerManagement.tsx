import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFederationWorkers } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { Users } from "lucide-react";

// Federation admin's full worker roster — distinct from the Worker
// Verification Queue (which is an action-oriented approve/reject queue).
// This page is a read-only directory: browse/filter every worker in the
// federation regardless of verification status.
export default function WorkerManagement() {
  const { user } = useAuth();
  const federationId = user!.federationId!;
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [societyFilter, setSocietyFilter] = useState<string>("");

  const { data: workers, isLoading } = useQuery({
    queryKey: ["federation-workers", federationId],
    queryFn: () => getFederationWorkers(federationId),
  });

  const societies = useMemo(() => {
    const map = new Map<string, string>();
    workers?.forEach((w) => map.set(w.society.id, w.society.name));
    return Array.from(map.entries());
  }, [workers]);

  const filtered = (workers ?? []).filter(
    (w) =>
      (!statusFilter || w.verificationStatus === statusFilter) &&
      (!societyFilter || w.society.id === societyFilter)
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Worker Management</h1>
      <p className="mb-6 text-sm text-ink-muted">Full roster across every society in the federation.</p>

      <div className="mb-4 flex gap-4">
        <div>
          <label className="mr-2 text-sm text-ink-secondary">Status</label>
          <select
            className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm text-ink-secondary">Society</label>
          <select
            className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            value={societyFilter}
            onChange={(e) => setSocietyFilter(e.target.value)}
          >
            <option value="">All societies</option>
            {societies.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-ink-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Users} title="No workers match these filters." />
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full rounded-card border border-ink/10 bg-surface text-left text-sm shadow-card min-w-[720px]">
          <thead>
            <tr className="border-b border-ink/10 text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th>Phone</th>
              <th>Society</th>
              <th>Skills</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 text-ink">{w.user.name}</td>
                <td className="text-ink-secondary">{w.user.phone}</td>
                <td className="text-ink-secondary">{w.society.name}</td>
                <td className="text-ink-secondary">{w.skills.join(", ")}</td>
                <td>
                  <StatusBadge status={w.verificationStatus} />
                </td>
                <td>
                  <span
                    className={
                      w.availability === "AVAILABLE"
                        ? "text-emerald-600"
                        : w.availability === "BUSY"
                        ? "text-amber-600"
                        : "text-gray-400"
                    }
                  >
                    {w.availability}
                  </span>
                </td>
                <td className="text-ink-secondary">{w.ratingAvg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
