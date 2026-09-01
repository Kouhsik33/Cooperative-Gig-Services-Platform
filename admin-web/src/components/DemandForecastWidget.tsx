import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDemandForecast } from "../api/forecast";
import { getFederationWorkers } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import EmptyState from "./EmptyState";
import { TrendingUp } from "lucide-react";

// Requirement 11 — bar chart of predicted demand per service category for
// the next 7 days, with a "Recommended worker allocation" line beneath
// it, now showing shortage/surplus (product-flow update §35) computed
// from the AI's recommendation against the federation's *actual* verified
// headcount per skill — not another AI number, just real roster data
// already available via getFederationWorkers. Model: simple moving
// average over the seeded 60-day booking history (Part H), computed by
// the Python ai-service and proxied through the backend's
// GET /api/forecast/demand. Labeled "AI-assisted" per master prompt §34
// — a forecast, not a guarantee.
// Demand band relative to each category's own history — a busy plumber
// week and a busy gardener week are not the same absolute number.
function DemandPill({ level }: { level?: "none" | "low" | "medium" | "high" }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-emerald-100 text-emerald-800",
    none: "bg-ink/10 text-ink-muted",
  };
  const key = level ?? "none";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${styles[key]}`}>
      {key === "none" ? "no data" : key}
    </span>
  );
}

export default function DemandForecastWidget() {
  const { user } = useAuth();
  const federationId = user!.federationId!;

  const { data, isLoading, error } = useQuery({
    queryKey: ["demand-forecast", federationId],
    queryFn: () => getDemandForecast(federationId, 7),
  });

  const { data: workers } = useQuery({
    queryKey: ["federation-workers", federationId],
    queryFn: () => getFederationWorkers(federationId),
  });

  if (isLoading) {
    return <p className="text-ink-muted">Loading forecast...</p>;
  }
  if (error) {
    return <p className="text-red-600">Could not load demand forecast.</p>;
  }
  if (!data || data.forecast.length === 0) {
    return <EmptyState Icon={TrendingUp} title="Not enough booking history yet to forecast demand." />;
  }

  const availableByCategory = new Map<string, number>();
  workers
    ?.filter((w) => w.verificationStatus === "VERIFIED")
    .forEach((w) => {
      w.skills.forEach((skill) => {
        availableByCategory.set(skill, (availableByCategory.get(skill) ?? 0) + 1);
      });
    });

  return (
    <div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data.forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E7E4" />
            <XAxis dataKey="serviceCategory" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar
              dataKey="predictedBookings"
              fill="var(--color-primary)"
              name="Predicted bookings (7d)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-ink">
          AI-assisted recommended worker allocation (next {data.days} days):
        </p>
        <ul className="space-y-1.5">
          {data.forecast.map((f) => {
            const available = availableByCategory.get(f.serviceCategory) ?? 0;
            const shortage = f.recommendedWorkers - available;
            return (
              <li key={f.serviceCategory} className="rounded-lg bg-canvas px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <DemandPill level={f.demandLevel} />
                    <span className="font-medium capitalize text-ink">{f.serviceCategory}</span>
                  </span>
                  <span className="text-ink-secondary">
                    <span className="font-semibold text-primary-dark">
                      {f.recommendedWorkers} recommended
                    </span>{" "}
                    · {available} available · {f.predictedBookings} predicted
                  </span>
                </div>
                {/* Why the model is asking, not just what it wants. */}
                {f.reason && <p className="mt-1.5 text-xs text-ink-secondary">{f.reason}</p>}
                {f.basis && <p className="mt-0.5 text-xs text-ink-muted">Based on {f.basis}</p>}
                {shortage > 0 && (
                  <p className="mt-1.5 text-xs font-medium text-amber-700">
                    Shortage of {shortage} — consider allocating {shortage} more worker
                    {shortage === 1 ? "" : "s"} from nearby societies.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
