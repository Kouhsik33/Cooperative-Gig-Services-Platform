import { useQuery } from "@tanstack/react-query";
import { getGeoDemand } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import ChartCard from "../components/ChartCard";
import EmptyState from "../components/EmptyState";
import { Map } from "lucide-react";

const DEMAND_LEVEL = (demand: number, max: number): { label: string; className: string } => {
  if (max === 0) return { label: "No data", className: "bg-gray-100 text-gray-600" };
  const ratio = demand / max;
  if (ratio >= 0.7) return { label: "High", className: "bg-red-100 text-red-700" };
  if (ratio >= 0.35) return { label: "Medium", className: "bg-amber-100 text-amber-700" };
  return { label: "Low", className: "bg-emerald-100 text-emerald-700" };
};

// Federation Admin journey — Requirement 4/34, the geo-spatial component
// made visible: booking demand and available verified workers grouped by
// locality pincode. Demand only counts bookings whose service address
// actually recorded a pincode (product-flow update §9/§43) — older
// bookings without one simply aren't counted, not folded into a bucket.
export default function GeoDemand() {
  const { user } = useAuth();
  const federationId = user!.federationId!;

  const { data, isLoading } = useQuery({
    queryKey: ["geo-demand", federationId],
    queryFn: () => getGeoDemand(federationId),
  });

  const maxDemand = Math.max(0, ...(data?.map((r) => r.demand) ?? []));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Geo-Spatial Demand</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Service demand and available workforce, grouped by cooperative society pincode.
      </p>

      <ChartCard title="Demand by area">
        {isLoading || !data ? (
          <p className="text-ink-muted">Loading...</p>
        ) : data.length === 0 ? (
          <EmptyState Icon={Map} title="No pincode data yet — societies need a pincode assigned." />
        ) : (
          <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-ink/10 text-ink-muted">
                <th className="py-2">Pincode</th>
                <th>Society</th>
                <th>Demand</th>
                <th>Available workers</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const level = DEMAND_LEVEL(row.demand, maxDemand);
                return (
                  <tr key={row.pincode} className="border-b border-ink/5 last:border-0">
                    <td className="py-3 font-medium text-ink">{row.pincode}</td>
                    <td className="text-ink-secondary">{row.society}</td>
                    <td>
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${level.className}`}>
                        {level.label}
                      </span>
                      <span className="ml-2 text-ink-muted">({row.demand} bookings)</span>
                    </td>
                    <td className="text-ink-secondary">{row.availableWorkers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </ChartCard>
    </div>
  );
}
