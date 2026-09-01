import { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { Handshake } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card border border-ink/10 bg-surface p-8 shadow-card"
      >
        <div className="mb-6 text-center">
          <Handshake className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="mt-2 text-xl font-semibold text-ink">Federation Admin</h1>
          <p className="text-sm text-ink-muted">Operations command center</p>
        </div>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <label className="mb-1 block text-sm text-ink-secondary">Phone number</label>
        <input
          className="mb-4 w-full rounded-lg border border-ink/15 px-3 py-2 focus:border-primary focus:outline-none"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="username"
        />
        <label className="mb-1 block text-sm text-ink-secondary">Password</label>
        <input
          type="password"
          className="mb-6 w-full rounded-lg border border-ink/15 px-3 py-2 focus:border-primary focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
