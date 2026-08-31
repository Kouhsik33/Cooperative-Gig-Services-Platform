import { NavLink } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: "📊", end: true },
  { to: "/workers", label: "Workers", icon: "👷" },
  { to: "/workers/verification", label: "Verification", icon: "✅" },
  { to: "/bookings", label: "Bookings", icon: "📅" },
  { to: "/welfare-fund", label: "Welfare Fund", icon: "🤝" },
  { to: "/forecast", label: "Demand Forecast", icon: "📈" },
  { to: "/geo-demand", label: "Geo Demand", icon: "🗺️" },
];

// Operations command-center shell (master prompt §29) — replaces the flat
// text-link row that used to sit in App.tsx.
export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-ink/10 bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-2xl">🤝</span>
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
            <span className="text-base">{item.icon}</span>
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
