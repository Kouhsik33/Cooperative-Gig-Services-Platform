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
    <div className="font-sans">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black uppercase tracking-tight text-ink">
              Sahakarya
            </h1>
            <span className="rounded-full border-2 border-ink bg-gold-light px-2.5 py-0.5 text-xs font-black text-gold-dark shadow-retro-sm">
              Live Operations
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-ink/60">
            {user?.name} · Federation Admin Command Center
          </p>
        </div>
      </div>

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
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-ink/70">
              Needs attention
            </h2>
            <AttentionPanel items={attentionItems(data)} />
          </section>

          {/* 2. What is happening now? */}
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-ink/70">
              Right now
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Active bookings" value={data.activeBookings} tone="coral" />
              <KpiCard
                label="Workers online"
                value={dispatch?.workersAvailable ?? "—"}
                sublabel={dispatch ? `${dispatch.workersBusy} on a job` : undefined}
                tone="cyan"
              />
              <KpiCard
                label="Avg. assignment time"
                value={dispatch?.avgAssignmentSeconds != null ? `${dispatch.avgAssignmentSeconds}s` : "—"}
                sublabel="broadcast to accepted"
                tone="yellow"
              />
              <KpiCard label="Finding a professional" value={dispatch?.stillSearching ?? "—"} tone="surface" />
            </div>
          </section>

          {/* 3. How well is it going? */}
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-ink/70">
              Service quality
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Completion rate"
                value={data.completionRatePercent != null ? `${data.completionRatePercent}%` : "—"}
                sublabel="completed vs cancelled"
                tone="cyan"
              />
              <KpiCard
                label="Customer rating"
                value={data.avgCustomerRating != null ? String(data.avgCustomerRating) : "—"}
                icon={Star}
                sublabel={`${data.ratingCount} ratings`}
                tone="yellow"
              />
              <KpiCard label="Registered workers" value={data.totalWorkers} tone="surface" />
              <KpiCard
                label="Welfare fund"
                value={`₹${data.welfareFundBalance.toFixed(2)}`}
                sublabel="available balance"
                tone="coral"
              />
            </div>
          </section>
        </>
      )}

      <div className="mt-6 rounded-card border-2 border-ink bg-vanilla p-6 shadow-card">
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-primary text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-retro-sm">
            Fairness Guarantee
          </span>
          <span className="rounded-full border-2 border-ink bg-gold-light text-gold-dark px-3 py-1 text-xs font-black uppercase tracking-wider shadow-retro-sm">
            Sahakarya Standard
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-8">
          <div>
            <p className="text-5xl font-black tracking-tight text-primary">
              {fairness ? `${fairness.avgWorkerSharePercent.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 text-sm font-black text-ink/80">Average worker share, all completed jobs</p>
          </div>
          <div className="flex gap-4 text-sm text-ink/80">
            <div className="rounded-xl border-2 border-ink bg-surface p-3 shadow-retro-sm">
              <p className="font-black text-ink text-lg">{fairness?.completedBookings ?? "—"}</p>
              <p className="text-xs font-bold text-ink/60">Completed bookings</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-surface p-3 shadow-retro-sm">
              <p className="font-black text-primary text-lg">10%</p>
              <p className="text-xs font-bold text-ink/60">Federation fee</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-surface p-3 shadow-retro-sm">
              <p className="font-black text-gold-dark text-lg">3%</p>
              <p className="text-xs font-bold text-ink/60">Welfare contribution</p>
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
