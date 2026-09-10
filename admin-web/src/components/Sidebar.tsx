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

const NAV_ITEMS = [
  { to: "/", label: "Overview", Icon: BarChart3, end: true },
  { to: "/workers", label: "Workers", Icon: Users },
  { to: "/workers/verification", label: "Verification", Icon: ShieldCheck },
  { to: "/bookings", label: "Bookings", Icon: CalendarDays },
  { to: "/welfare-fund", label: "Welfare Fund", Icon: HandHeart },
  { to: "/forecast", label: "Demand Forecast", Icon: TrendingUp },
  { to: "/geo-demand", label: "Geo Demand", Icon: Map },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r-2 border-ink bg-surface shadow-retro font-sans">
      <div className="flex items-center gap-3 px-6 py-6 border-b-2 border-ink bg-vanilla">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink bg-primary text-white shadow-retro-sm">
          <Handshake className="h-6 w-6 text-gold-light" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-black leading-tight text-ink tracking-tight flex items-center gap-1.5">
            Sahakarya
            <span className="inline-block h-2 w-2 rounded-full bg-gold"></span>
          </h1>
          <p className="text-[11px] font-bold leading-tight uppercase tracking-wider text-ink/60">
            Federation Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-black transition-all ${
                isActive
                  ? "bg-primary text-white border-2 border-ink shadow-retro-sm translate-x-1"
                  : "text-ink/80 hover:bg-vanilla hover:text-ink border-2 border-transparent"
              }`
            }
          >
            <item.Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t-2 border-ink bg-vanilla px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="truncate text-sm font-black text-ink">{user?.name}</p>
          <span className="rounded-full border border-ink bg-sky-light px-2 py-0.5 text-[10px] font-extrabold text-ink">
            Admin
          </span>
        </div>
        <p className="mb-3 truncate text-xs font-semibold text-ink/70">Cooperative Operations</p>
        <button
          onClick={logout}
          className="w-full rounded-xl border-2 border-ink bg-surface px-3 py-2 text-center text-xs font-black text-ink shadow-retro-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 hover:bg-primary hover:text-white"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
