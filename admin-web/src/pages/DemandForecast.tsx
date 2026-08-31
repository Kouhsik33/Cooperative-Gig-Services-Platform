import DemandForecastWidget from "../components/DemandForecastWidget";
import ChartCard from "../components/ChartCard";

// Federation Admin journey (Part B) — Requirement 11. Same widget also
// appears embedded on DashboardHome; this page is the dedicated,
// full-width view for it.
export default function DemandForecast() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Demand Forecast</h1>
      <p className="mb-6 text-sm text-ink-muted">
        A 14-day simple moving average over booking history, per service category.
      </p>
      <ChartCard title="7-Day Service Demand Forecast" subtitle="AI-assisted, not guaranteed">
        <DemandForecastWidget />
      </ChartCard>
    </div>
  );
}
