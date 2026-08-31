import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFederationWorkers, verifyWorker } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

// Federation Admin journey (Part B) — Requirement 1. Card-based
// approve/reject review with skill/certification detail (master prompt
// §33) — not a plain CRUD table.
export default function WorkerVerificationQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const federationId = user!.federationId!;

  const { data: workers, isLoading } = useQuery({
    queryKey: ["federation-workers", federationId],
    queryFn: () => getFederationWorkers(federationId!),
    enabled: !!federationId,
  });

  const mutation = useMutation({
    mutationFn: ({
      workerId,
      status,
    }: {
      workerId: string;
      status: "VERIFIED" | "REJECTED";
    }) => verifyWorker(workerId, status),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["federation-workers", federationId],
      }),
  });

  if (isLoading || !workers) {
    return <h1 className="text-2xl font-semibold text-ink">Worker Verification Queue</h1>;
  }

  const pending = workers.filter(
    (w) => w.verificationStatus === "SUBMITTED" || w.verificationStatus === "UNDER_REVIEW"
  );
  const reviewed = workers.filter(
    (w) => w.verificationStatus === "VERIFIED" || w.verificationStatus === "REJECTED"
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Worker Verification Queue</h1>
      <p className="mb-6 text-sm text-ink-muted">Review skills, certifications, and approve or reject.</p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-ink">Pending review ({pending.length})</h2>
        {pending.length === 0 && <EmptyState icon="✅" title="No workers awaiting review." />}
        <div className="space-y-3">
          {pending.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-card border border-ink/10 bg-surface p-4 shadow-card"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{w.user.name}</p>
                  <StatusBadge status={w.verificationStatus} />
                </div>
                <p className="text-sm text-ink-muted">
                  {w.user.phone} · {w.society.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Certifications:{" "}
                  {w.certifications.length > 0 ? w.certifications.join(", ") : "none uploaded"}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={() => mutation.mutate({ workerId: w.id, status: "VERIFIED" })}
                  disabled={mutation.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => mutation.mutate({ workerId: w.id, status: "REJECTED" })}
                  disabled={mutation.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-ink">Already reviewed ({reviewed.length})</h2>
        {reviewed.length === 0 ? (
          <EmptyState icon="🗂️" title="No workers reviewed yet." />
        ) : (
          <table className="w-full rounded-card border border-ink/10 bg-surface text-left text-sm shadow-card">
            <thead>
              <tr className="border-b border-ink/10 text-ink-muted">
                <th className="px-4 py-3">Name</th>
                <th>Society</th>
                <th>Status</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((w) => (
                <tr key={w.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 text-ink">{w.user.name}</td>
                  <td className="text-ink-secondary">{w.society.name}</td>
                  <td>
                    <StatusBadge status={w.verificationStatus} />
                  </td>
                  <td className="text-ink-secondary">{w.ratingAvg.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
