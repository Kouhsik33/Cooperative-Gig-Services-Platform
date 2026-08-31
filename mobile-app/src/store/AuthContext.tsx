import React, { createContext, useCallback, useContext, useState } from "react";
import { apiClient } from "../api/client";
import { connectSocket, disconnectSocket } from "../lib/socket";
import * as authApi from "../api/auth";
import type { RegisterPayload } from "../api/auth";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: "CUSTOMER" | "WORKER" | "FEDERATION_ADMIN";
  language: string;
  worker?: { id: string; verificationStatus: string } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  // Passwordless login (product-flow update §36-42): request a code, then
  // verify it. verifyOtp itself logs the user in when the phone already
  // has an account; when it doesn't, it returns isNewUser so the screen
  // can collect a name/role and call register() next.
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean; user?: AuthUser }>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  // Patches user.worker client-side right after a fresh WORKER account
  // creates its Worker profile (see OnboardingStatusScreen) — there's no
  // token refresh involved, just updating what's already in memory.
  setWorkerInfo: (worker: { id: string; verificationStatus: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applySession(user: AuthUser, accessToken: string, refreshToken: string) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  connectSocket(accessToken);
  return user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const requestOtp = useCallback(async (phone: string) => {
    await authApi.requestOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const result = await authApi.verifyOtp(phone, otp);
    if (!result.isNewUser && result.user && result.accessToken && result.refreshToken) {
      const loggedInUser = applySession(result.user, result.accessToken, result.refreshToken);
      setUser(loggedInUser);
      return { isNewUser: false, user: loggedInUser };
    }
    return { isNewUser: result.isNewUser };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    setUser(applySession(result.user, result.accessToken, result.refreshToken));
    return result.user;
  }, []);

  const setWorkerInfo = useCallback((worker: { id: string; verificationStatus: string }) => {
    setUser((current) => (current ? { ...current, worker } : current));
  }, []);

  const logout = useCallback(() => {
    delete apiClient.defaults.headers.common.Authorization;
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, requestOtp, verifyOtp, register, setWorkerInfo, logout }}>
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
