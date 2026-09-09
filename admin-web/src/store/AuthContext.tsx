import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import { connectSocket, disconnectSocket } from "../lib/socket";

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: "CUSTOMER" | "WORKER" | "FEDERATION_ADMIN";
  federationId: string | null;
}

interface AuthContextValue {
  user: AdminUser | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The session is persisted to localStorage so a page refresh doesn't log
// the admin out. The access token is short-lived (15 min); the refresh
// token (7 days) is used by the 401 interceptor to get a new one
// silently. Only cleared on an explicit logout or a failed refresh.
const STORAGE_KEY = "sih26089-admin-session";

interface StoredSession {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.user && s.accessToken && s.refreshToken) return s as StoredSession;
  } catch {
    // corrupt / unavailable — treat as logged out
  }
  return null;
}

function saveSession(s: StoredSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled — session just won't survive refresh */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous rehydration in the initializer → no login-page flash.
  const initial = loadSession();
  const [user, setUser] = useState<AdminUser | null>(initial?.user ?? null);
  const refreshTokenRef = useRef<string | null>(initial?.refreshToken ?? null);

  // Restore the axios auth header + socket on first mount if a session
  // was rehydrated.
  useEffect(() => {
    if (initial) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${initial.accessToken}`;
      connectSocket(initial.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    clearSession();
    refreshTokenRef.current = null;
    delete apiClient.defaults.headers.common.Authorization;
    disconnectSocket();
    setUser(null);
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { phone, password });
    if (data.user.role !== "FEDERATION_ADMIN") {
      throw new Error("This dashboard is for federation admins only.");
    }
    if (!data.user.federationId) {
      throw new Error("This admin account is not assigned to a federation.");
    }
    apiClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
    refreshTokenRef.current = data.refreshToken;
    saveSession({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    connectSocket(data.accessToken);
    setUser(data.user);
  }, []);

  // 401 → refresh the access token once and retry the request; if the
  // refresh itself fails, the session is genuinely dead → logout.
  useEffect(() => {
    let refreshing: Promise<string> | null = null;

    const interceptorId = apiClient.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        const status = error.response?.status;

        if (status !== 401 || !original || original._retry || !refreshTokenRef.current) {
          return Promise.reject(error);
        }
        if (typeof original.url === "string" && original.url.includes("/auth/refresh")) {
          logout();
          return Promise.reject(error);
        }

        original._retry = true;
        try {
          if (!refreshing) {
            refreshing = apiClient
              .post("/auth/refresh", { refreshToken: refreshTokenRef.current })
              .then((r) => {
                const token = r.data.accessToken as string;
                apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
                const cur = loadSession();
                if (cur) saveSession({ ...cur, accessToken: token });
                connectSocket(token);
                return token;
              })
              .finally(() => {
                refreshing = null;
              });
          }
          const token = await refreshing;
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        } catch (e) {
          logout();
          return Promise.reject(e);
        }
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
