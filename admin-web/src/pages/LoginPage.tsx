import { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { Handshake, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("9000000001");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-card border-2 border-ink bg-surface p-8 shadow-retro"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink bg-primary text-white shadow-retro">
            <Handshake className="h-9 w-9 text-gold-light" aria-hidden="true" />
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <h1 className="text-3xl font-black tracking-tight text-ink uppercase">
              Sahakarya
            </h1>
            <Sparkles className="h-5 w-5 text-gold fill-gold" />
          </div>
          <p className="text-sm font-bold text-gold-dark mt-1">Federation Operations Portal</p>
          <p className="text-xs font-semibold text-ink/60 mt-0.5">Cooperative Gig Services Network</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-ink bg-primary-light px-3 py-2 text-xs font-black text-ink shadow-retro-sm">
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs font-black uppercase tracking-wider text-ink">
          Admin Phone Number
        </label>
        <input
          className="mb-4 w-full rounded-xl border-2 border-ink bg-surface px-4 py-2.5 font-bold text-ink shadow-retro-sm focus:bg-vanilla focus:outline-none"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="username"
        />

        <label className="mb-1 block text-xs font-black uppercase tracking-wider text-ink">
          Password
        </label>
        <input
          type="password"
          className="mb-6 w-full rounded-xl border-2 border-ink bg-surface px-4 py-2.5 font-bold text-ink shadow-retro-sm focus:bg-vanilla focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border-2 border-ink bg-primary text-white px-4 py-3.5 text-sm font-black uppercase tracking-wider shadow-retro transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In to Sahakarya"}
        </button>

        <div className="mt-6 rounded-xl border-2 border-ink bg-sky-light p-3.5 text-center shadow-retro-sm">
          <p className="text-xs font-black text-ink flex items-center justify-center gap-1">
            <span>✨</span> Demo Admin Credentials
          </p>
          <p className="text-xs font-bold text-ink/80 mt-0.5">Phone: 9000000001 • Password: password123</p>
        </div>
      </form>
    </div>
  );
}
