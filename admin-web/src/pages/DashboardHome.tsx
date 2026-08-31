import { useQuery } from "@tanstack/react-query";
import { getDashboard, getDispatchAnalytics, getFairnessMetrics } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import DemandForecastWidget from "../components/DemandForecastWidget";
import KpiCard from "../components/KpiCard";
import ChartCard from "../components/ChartCard";

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
        <p className="text-ink-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Active workers" value={data.totalWorkers} />
          <KpiCard label="Active bookings" value={data.activeBookings} />
          <KpiCard
            label="Welfare fund balance"
            value={`₹${data.welfareFundBalance.toFixed(2)}`}
          />
        </div>
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
        <ChartCard title="Live Dispatch" subtitle="First-accept-wins broadcast, updated every 15s">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DispatchStat
              label="Avg. assignment time"
              value={dispatch?.avgAssignmentSeconds != null ? `${dispatch.avgAssignmentSeconds}s` : "—"}
            />
            <DispatchStat label="Finding professional" value={dispatch?.stillSearching ?? "—"} />
            <DispatchStat label="Workers online" value={dispatch?.workersAvailable ?? "—"} />
            <DispatchStat label="Workers busy" value={dispatch?.workersBusy ?? "—"} />
          </div>
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="Demand Forecast" subtitle="Next 7 days, AI-assisted">
          <DemandForecastWidget />
        </ChartCard>
      </div>
    </div>
  );
}

function DispatchStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-canvas p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
