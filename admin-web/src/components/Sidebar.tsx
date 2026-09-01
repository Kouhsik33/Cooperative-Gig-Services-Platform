import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  HandHeart,
  Handshake,
  Map,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";

// Vector icons, not emoji: navigation glyphs must render identically on
// every OS and take their colour from the active/inactive state.
const NAV_ITEMS = [
  { to: "/", label: "Overview", Icon: BarChart3, end: true },
  { to: "/workers", label: "Workers", Icon: Users },
  { to: "/workers/verification", label: "Verification", Icon: ShieldCheck },
  { to: "/bookings", label: "Bookings", Icon: CalendarDays },
  { to: "/welfare-fund", label: "Welfare Fund", Icon: HandHeart },
  { to: "/forecast", label: "Demand Forecast", Icon: TrendingUp },
  { to: "/geo-demand", label: "Geo Demand", Icon: Map },
];

// Operations command-center shell (master prompt §29) — replaces the flat
// text-link row that used to sit in App.tsx.
export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-ink/10 bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <Handshake className="h-7 w-7 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold leading-tight text-ink">Cooperative</p>
          <p className="text-xs leading-tight text-ink-muted">Federation Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-light text-primary-dark"
                  : "text-ink-secondary hover:bg-canvas hover:text-ink"
              }`
            }
          >
            <item.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink/10 px-4 py-4">
        <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
        <p className="mb-3 truncate text-xs text-ink-muted">Federation Admin</p>
        <button
          onClick={logout}
          className="w-full rounded-lg border border-ink/10 px-3 py-1.5 text-left text-xs font-medium text-ink-secondary hover:bg-canvas"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
