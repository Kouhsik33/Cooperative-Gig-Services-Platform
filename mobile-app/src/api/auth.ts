import { apiClient } from "./client";
import type { AuthUser } from "../store/AuthContext";

// Passwordless OTP auth (product-flow update §36-42). Real OTP delivery
// is muted server-side for this phase — see backend/src/services/otp.service.ts.
export async function requestOtp(phone: string): Promise<void> {
  await apiClient.post("/auth/otp/request", { phone });
}

export interface VerifyOtpResult {
  isNewUser: boolean;
  phone?: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const { data } = await apiClient.post<VerifyOtpResult>("/auth/otp/verify", { phone, otp });
  return data;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  role: "CUSTOMER" | "WORKER";
  language?: string;
}

export interface RegisterResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const { data } = await apiClient.post<RegisterResult>("/auth/register", payload);
  return data;
}

export interface SocietyOption {
  id: string;
  name: string;
  federation: { id: string; name: string };
}

export async function listSocieties(): Promise<SocietyOption[]> {
  const { data } = await apiClient.get<SocietyOption[]>("/societies");
  return data;
}

export interface CreateWorkerPayload {
  societyId: string;
  skills: string[];
  certifications?: string[];
  latitude: number;
  longitude: number;
}

export async function createWorkerProfile(payload: CreateWorkerPayload) {
  const { data } = await apiClient.post("/workers", payload);
  return data;
}
