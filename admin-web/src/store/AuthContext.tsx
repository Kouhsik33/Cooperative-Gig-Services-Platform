import React, { createContext, useCallback, useContext, useState } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { phone, password });
    if (data.user.role !== "FEDERATION_ADMIN") {
      throw new Error("This dashboard is for federation admins only.");
    }
    if (!data.user.federationId) {
      throw new Error("This admin account is not assigned to a federation.");
    }
    apiClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
    connectSocket(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    delete apiClient.defaults.headers.common.Authorization;
    disconnectSocket();
    setUser(null);
  }, []);

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
