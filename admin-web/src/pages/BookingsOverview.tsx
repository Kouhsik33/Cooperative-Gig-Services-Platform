import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFederationBookings } from "../api/federations";
import { useAuth } from "../store/AuthContext";
import { getSocket } from "../lib/socket";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { CalendarDays, Siren } from "lucide-react";

interface EmergencyAlert {
  id: string;
  serviceName: string;
  customerName: string;
  workerShare: number;
  emergencyBonus: number;
}

// Federation Admin journey (Part B) — Requirement 9, live booking
// oversight, and Requirement 8, a distinct emergency alert. Pushed via
// Socket.io (booking:new / booking:statusUpdate / booking:emergency) —
// replaces the earlier 10s-polling stand-in.
export default function BookingsOverview() {
  const { user } = useAuth();
  const federationId = user!.federationId!;
  const queryClient = useQueryClient();
  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyAlert | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["federation-bookings", federationId],
    queryFn: () => getFederationBookings(federationId),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ["federation-bookings", federationId] });

    function onEmergency(payload: EmergencyAlert) {
      setEmergencyAlert(payload);
      refresh();
    }

    socket.on("booking:new", refresh);
    socket.on("booking:statusUpdate", refresh);
    socket.on("booking:emergency", onEmergency);

    return () => {
      socket.off("booking:new", refresh);
      socket.off("booking:statusUpdate", refresh);
      socket.off("booking:emergency", onEmergency);
    };
  }, [federationId, queryClient]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Bookings Overview</h1>
      <p className="mb-6 text-sm text-ink-muted">Live, federation-wide booking activity.</p>

      {emergencyAlert && (
        <div className="mb-4 flex items-center justify-between rounded-card border-2 border-red-500 bg-red-50 p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-red-700">
              <Siren className="h-4 w-4" aria-hidden="true" />
              Emergency booking: {emergencyAlert.serviceName}
            </p>
            <p className="text-sm text-red-600">
              Customer: {emergencyAlert.customerName} · Worker share incl. bonus: ₹
              {emergencyAlert.workerShare.toFixed(2)} (+₹
              {emergencyAlert.emergencyBonus.toFixed(2)} bonus)
            </p>
          </div>
          <button
            onClick={() => setEmergencyAlert(null)}
            className="text-sm font-medium text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading || !bookings ? (
        <p className="text-ink-muted">Loading...</p>
      ) : bookings.length === 0 ? (
        <EmptyState Icon={CalendarDays} title="No bookings yet." />
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full rounded-card border border-ink/10 bg-surface text-left text-sm shadow-card min-w-[720px]">
          <thead>
            <tr className="border-b border-ink/10 text-ink-muted">
              <th className="px-4 py-3">Service</th>
              <th>Customer</th>
              <th>Worker</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Started</th>
              <th>Completed</th>
              <th>Total</th>
              <th>Worker share</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 text-ink">
                  {b.service.name}
                  {b.isEmergency && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                      Emergency
                    </span>
                  )}
                </td>
                <td className="text-ink-secondary">{b.customer.name}</td>
                <td className="text-ink-secondary">
                  {b.worker ? (
                    b.worker.user.name
                  ) : (
                    <span className="text-amber-700">
                      Finding professional{b.eligibleWorkerCount != null ? ` (${b.eligibleWorkerCount} eligible)` : ""}
                    </span>
                  )}
                </td>
                <td>
                  <StatusBadge status={b.status} />
                </td>
                <td className="text-ink-secondary">{new Date(b.scheduledAt).toLocaleString()}</td>
                <td className="text-ink-secondary">
                  {b.serviceStartedAt ? new Date(b.serviceStartedAt).toLocaleTimeString() : "—"}
                </td>
                <td className="text-ink-secondary">
                  {b.serviceCompletedAt ? new Date(b.serviceCompletedAt).toLocaleTimeString() : "—"}
                </td>
                <td className="text-ink-secondary">₹{b.totalAmount.toFixed(2)}</td>
                <td className="font-medium text-primary-dark">₹{b.workerShare.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
