import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { consumeVerifiedLoginOtp, requestOtp, verifyOtp } from "../services/otp.service";

const REGISTERABLE_ROLES = ["CUSTOMER", "WORKER"];

// Auth — Part E, extended per the passwordless-login product update
// (master prompt §36-42). Two auth paths now coexist by design:
//   - Mobile app (CUSTOMER/WORKER): POST /auth/otp/request + /otp/verify.
//   - admin-web (FEDERATION_ADMIN): POST /auth/login (phone+password),
//     unchanged — the OTP-login mockups in the spec are all mobile-app
//     screens, and rewriting the admin dashboard's auth wasn't asked for.

function publicUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  language: string;
  federationId: string | null;
  worker?: unknown;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    language: user.language,
    federationId: user.federationId,
    ...(user.worker !== undefined ? { worker: user.worker } : {}),
  };
}

function issueTokens(user: { id: string; role: string }) {
  return {
    accessToken: signAccessToken({ id: user.id, role: user.role }),
    refreshToken: signRefreshToken({ id: user.id, role: user.role }),
  };
}

// Step 1 of passwordless login/signup — request an OTP for a phone
// number. Always responds the same way whether or not the phone is
// already registered (registration vs login is disambiguated at verify
// time), so this endpoint can't be used to enumerate accounts.
export async function requestLoginOtp(req: Request, res: Response) {
  const { phone } = req.body ?? {};
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "phone is required" });
  }

  await requestOtp({ purpose: OtpPurpose.LOGIN, phone });
  res.json({ requested: true });
}

// Step 2 — verify the OTP. If the phone belongs to an existing user, logs
// them in directly. If not, the OTP is still marked verified (consumable
// by /auth/register within the next 10 minutes) and the response signals
// the client to collect a name/role and call /auth/register next.
export async function verifyLoginOtp(req: Request, res: Response) {
  const { phone, otp } = req.body ?? {};
  if (!phone || !otp) {
    return res.status(400).json({ error: "phone and otp are required" });
  }

  const result = await verifyOtp({ purpose: OtpPurpose.LOGIN, phone, otp });
  if (!result.ok) {
    return res.status(401).json({ error: otpErrorMessage(result.reason) });
  }

  const user = await prisma.user.findUnique({ where: { phone }, include: { worker: true } });
  if (!user) {
    return res.json({ isNewUser: true, phone });
  }

  res.json({ isNewUser: false, user: publicUser(user), ...issueTokens(user) });
}

function otpErrorMessage(reason: string): string {
  switch (reason) {
    case "expired":
      return "This code has expired. Request a new one.";
    case "too_many_attempts":
      return "Too many incorrect attempts. Request a new code.";
    case "not_found":
      return "Request a new code first.";
    default:
      return "Incorrect code. Please try again.";
  }
}

// Registration now requires a phone already verified via /auth/otp/verify
// in the last 10 minutes (checked server-side, not trusted from the
// client) instead of a password.
export async function register(req: Request, res: Response) {
  const { name, phone, role, language } = req.body ?? {};

  if (!name || !phone || !REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({
      error: "name, phone and role (CUSTOMER|WORKER) are required",
    });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  const otpVerified = await consumeVerifiedLoginOtp(phone);
  if (!otpVerified) {
    return res.status(400).json({ error: "Verify your phone number first" });
  }

  const user = await prisma.user.create({
    data: { name, phone, role, language: language ?? "en" },
  });

  res.status(201).json({ user: publicUser(user), ...issueTokens(user) });
}

// Unchanged — admin-web's own login path (phone+password). Any account
// with passwordHash === null (every OTP-only mobile account) is rejected
// outright, never falls through to a bcrypt compare against null.
export async function login(req: Request, res: Response) {
  const { phone, password } = req.body ?? {};
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { worker: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }

  res.json({ user: publicUser(user), ...issueTokens(user) });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ id: payload.id, role: payload.role });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

// Part G — the languages the mobile app ships translations for.
const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "te"];

export async function updateLanguage(req: Request, res: Response) {
  const { language } = req.body ?? {};
  if (!language) {
    return res.status(400).json({ error: "language is required" });
  }
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { language },
  });
  res.json({ id: user.id, language: user.language });
}
