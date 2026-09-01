import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getFederationWorkers,
  getWelfareFund,
  getWelfareFundTransactions,
} from "../api/federations";
import { useAuth } from "../store/AuthContext";
import KpiCard from "../components/KpiCard";
import EmptyState from "../components/EmptyState";
import { HandHeart } from "lucide-react";

// Federation Admin journey (Part B) — Requirement 7. Transaction log,
// filterable by worker.
export default function WelfareFundLedger() {
  const { user } = useAuth();
  const federationId = user!.federationId!;
  const [workerFilter, setWorkerFilter] = useState<string>("");

  const { data: fund } = useQuery({
    queryKey: ["welfare-fund", federationId],
    queryFn: () => getWelfareFund(federationId),
  });

  const { data: workers } = useQuery({
    queryKey: ["federation-workers", federationId],
    queryFn: () => getFederationWorkers(federationId),
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["welfare-transactions", federationId, workerFilter],
    queryFn: () =>
      getWelfareFundTransactions(federationId, workerFilter || undefined),
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Welfare Fund Ledger</h1>
      <p className="mb-6 text-sm text-ink-muted">Every contribution, traceable to a worker and a booking.</p>

      {fund && (
        <div className="mb-6 max-w-xs">
          <KpiCard label="Fund balance" value={`₹${fund.balance.toFixed(2)}`} highlight />
        </div>
      )}

      <div className="mb-4">
        <label className="mr-2 text-sm text-ink-secondary">Filter by worker</label>
        <select
          className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
          value={workerFilter}
          onChange={(e) => setWorkerFilter(e.target.value)}
        >
          <option value="">All workers</option>
          {workers?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.user.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading || !transactions ? (
        <p className="text-ink-muted">Loading...</p>
      ) : transactions.length === 0 ? (
        <EmptyState Icon={HandHeart} title="No transactions yet." />
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full rounded-card border border-ink/10 bg-surface text-left text-sm shadow-card min-w-[720px]">
          <thead>
            <tr className="border-b border-ink/10 text-ink-muted">
              <th className="px-4 py-3">Date</th>
              <th>Worker</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 text-ink-secondary">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="text-ink">{tx.worker.user.name}</td>
                <td className="capitalize text-ink-secondary">{tx.type}</td>
                <td className="font-medium text-primary-dark">₹{tx.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
