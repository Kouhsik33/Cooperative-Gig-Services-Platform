import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardHome from "./pages/DashboardHome";
import WorkerManagement from "./pages/WorkerManagement";
import WorkerVerificationQueue from "./pages/WorkerVerificationQueue";
import BookingsOverview from "./pages/BookingsOverview";
import WelfareFundLedger from "./pages/WelfareFundLedger";
import DemandForecast from "./pages/DemandForecast";
import GeoDemand from "./pages/GeoDemand";
import Sidebar from "./components/Sidebar";

// Federation Admin dashboard per Part B — Requirement 9. An operations
// command-center shell (master prompt §29): fixed sidebar + scrollable
// content area, replacing the flat top nav.

function AuthenticatedApp() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/workers" element={<WorkerManagement />} />
            <Route
              path="/workers/verification"
              element={<WorkerVerificationQueue />}
            />
            <Route path="/bookings" element={<BookingsOverview />} />
            <Route path="/welfare-fund" element={<WelfareFundLedger />} />
            <Route path="/forecast" element={<DemandForecast />} />
            <Route path="/geo-demand" element={<GeoDemand />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
