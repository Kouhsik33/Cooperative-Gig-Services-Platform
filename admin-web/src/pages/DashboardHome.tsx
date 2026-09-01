import { useQuery } from "@tanstack/react-query";
import { getDashboard, getDispatchAnalytics, getFairnessMetrics } from "../api/federations";
import type { DashboardSummary } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import DemandForecastWidget from "../components/DemandForecastWidget";
import KpiCard from "../components/KpiCard";
import ChartCard from "../components/ChartCard";
import AttentionPanel from "../components/AttentionPanel";
import { Star } from "lucide-react";
import type { AttentionItem } from "../components/AttentionPanel";

// Federation Admin journey (Part B) — Requirement 9, 12. Aggregate cards:
// total workers, active bookings, welfare fund balance, average worker
// earning share % (a fairness KPI, not just revenue) — with the fairness
// metric given the visually largest treatment per master prompt §31.
export default function DashboardHome() {
  const { user } = useAuth();
  const federationId = user!.federationId!;

  const { data, isLoading } = useQuery({
    queryKey: ["federation-dashboard", federationId],
    queryFn: () => getDashboard(federationId),
  });

  const { data: fairness } = useQuery({
    queryKey: ["fairness-metrics", federationId],
    queryFn: () => getFairnessMetrics(federationId),
  });

  const { data: dispatch } = useQuery({
    queryKey: ["dispatch-analytics", federationId],
    queryFn: () => getDispatchAnalytics(federationId),
    refetchInterval: 15000,
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Overview</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {user?.name} · Federation Admin
      </p>

      {isLoading || !data ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-20 animate-pulse rounded-card bg-ink/5" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-ink/5" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 1. Where are the problems? */}
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Needs attention
            </h2>
            <AttentionPanel items={attentionItems(data)} />
          </section>

          {/* 2. What is happening now? */}
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Right now
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Active bookings" value={data.activeBookings} />
              <KpiCard
                label="Workers online"
                value={dispatch?.workersAvailable ?? "—"}
                sublabel={dispatch ? `${dispatch.workersBusy} on a job` : undefined}
              />
              <KpiCard
                label="Avg. assignment time"
                value={dispatch?.avgAssignmentSeconds != null ? `${dispatch.avgAssignmentSeconds}s` : "—"}
                sublabel="broadcast to accepted"
              />
              <KpiCard label="Finding a professional" value={dispatch?.stillSearching ?? "—"} />
            </div>
          </section>

          {/* 3. How well is it going? */}
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Service quality
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Completion rate"
                value={data.completionRatePercent != null ? `${data.completionRatePercent}%` : "—"}
                sublabel="completed vs cancelled"
              />
              <KpiCard
                label="Customer rating"
                value={data.avgCustomerRating != null ? String(data.avgCustomerRating) : "—"}
                icon={Star}
                sublabel={`${data.ratingCount} ratings`}
              />
              <KpiCard label="Registered workers" value={data.totalWorkers} />
              <KpiCard
                label="Welfare fund"
                value={`₹${data.welfareFundBalance.toFixed(2)}`}
                sublabel="available balance"
              />
            </div>
          </section>
        </>
      )}

      <div className="mt-6 rounded-card border-2 border-primary bg-primary-light p-6 shadow-card">
        <p className="text-sm font-medium text-primary-dark">Fairness metric</p>
        <div className="mt-3 flex flex-wrap items-end gap-8">
          <div>
            <p className="text-4xl font-bold text-primary-dark">
              {fairness ? `${fairness.avgWorkerSharePercent.toFixed(1)}%` : "—"}
            </p>
            <p className="text-sm text-ink-secondary">avg. worker share, all completed jobs</p>
          </div>
          <div className="flex gap-6 text-sm text-ink-secondary">
            <div>
              <p className="font-semibold text-ink">{fairness?.completedBookings ?? "—"}</p>
              <p>completed bookings</p>
            </div>
            <div>
              <p className="font-semibold text-ink">10%</p>
              <p>federation fee (of base price)</p>
            </div>
            <div>
              <p className="font-semibold text-ink">3%</p>
              <p>welfare contribution (of base price)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ChartCard title="Demand Forecast" subtitle="Next 7 days, AI-assisted">
          <DemandForecastWidget />
        </ChartCard>
      </div>
    </div>
  );
}

// Only genuinely actionable conditions belong here — each row names what
// the operator should do about it and links straight there.
function attentionItems(d: DashboardSummary): AttentionItem[] {
  return [
    {
      key: "unserved",
      count: d.unservedBookings,
      label: "Bookings with no available worker",
      detail: "Broadcast reached zero eligible workers — a coverage gap in that area.",
      to: "/geo-demand",
      action: "See where",
      tone: "critical",
    },
    {
      key: "verification",
      count: d.pendingVerification,
      label: "Workers awaiting verification",
      detail: "They cannot receive any job until their profile is reviewed.",
      to: "/workers/verification",
      action: "Review",
      tone: "warn",
    },
  ];
}
