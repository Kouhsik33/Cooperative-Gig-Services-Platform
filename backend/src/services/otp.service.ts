import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { OtpPurpose } from "@prisma/client";

// Centralized OTP generation/validation (master prompt §38-42). Every
// caller — login, service-start, service-completion — goes through this
// module so "the dummy number always gets 0000" and "muted SMS for real
// numbers" are each implemented in exactly one place, never as scattered
// `if (phone === "...")` checks in controllers.

export function isDemoPhone(phone: string | null | undefined): boolean {
  return !!phone && phone.startsWith(env.otp.demoPhonePrefix);
}

function generateOtp(phone: string | null): string {
  if (isDemoPhone(phone)) {
    return env.otp.demoOtp;
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface RequestOtpParams {
  purpose: OtpPurpose;
  // For LOGIN this is the phone signing in. For SERVICE_START/
  // SERVICE_COMPLETION it should still be passed — the *customer's*
  // phone on that booking — purely so demo detection works; the OTP
  // itself is looked up by bookingId, not phone, for those purposes.
  phone?: string;
  bookingId?: string;
  expiryMinutes?: number;
}

// Creates a fresh OTP row, invalidating any prior unverified row for the
// same (phone|bookingId, purpose) pair so only the latest code is valid.
export async function requestOtp({
  purpose,
  phone,
  bookingId,
  expiryMinutes,
}: RequestOtpParams) {
  const otp = generateOtp(phone ?? null);
  const expiresAt = new Date(
    Date.now() + (expiryMinutes ?? env.otp.expiryMinutes) * 60_000
  );

  await prisma.otpVerification.updateMany({
    where: {
      purpose,
      verifiedAt: null,
      ...(phone ? { phone } : {}),
      ...(bookingId ? { bookingId } : {}),
    },
    data: { expiresAt: new Date(0) }, // immediately invalidate superseded codes
  });

  const record = await prisma.otpVerification.create({
    data: { phone: phone ?? "", otp, purpose, bookingId, expiresAt },
  });

  // Real-SMS integration point (master prompt §40) — muted for this
  // phase. When OTP_SMS_ENABLED=true, call the actual provider here
  // instead of this console line. Never log the OTP itself once a real
  // provider is wired in.
  if (env.otp.smsEnabled) {
    // TODO: call real SMS provider with `otp`.
  } else if (phone) {
    console.log(`[otp:muted] purpose=${purpose} phone=${phone} otp=${otp}`);
  }

  return record;
}

interface VerifyOtpParams {
  purpose: OtpPurpose;
  otp: string;
  phone?: string;
  bookingId?: string;
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "incorrect" };

// Server-side OTP validation (master prompt §20 — "do not trust
// frontend-only OTP validation"). Always looks up the latest matching row
// fresh from the DB; never compares against a client-supplied value alone.
export async function verifyOtp({
  purpose,
  otp,
  phone,
  bookingId,
}: VerifyOtpParams): Promise<VerifyOtpResult> {
  const record = await prisma.otpVerification.findFirst({
    where: {
      purpose,
      verifiedAt: null,
      ...(phone ? { phone } : {}),
      ...(bookingId ? { bookingId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "not_found" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (record.attempts >= env.otp.maxAttempts) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.otp !== otp) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "incorrect" };
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });
  return { ok: true };
}

// Used by registration: was this phone verified via a LOGIN OTP recently,
// and not already consumed by a previous registration? Marks it consumed
// on success so the same verification can't be replayed.
export async function consumeVerifiedLoginOtp(phone: string): Promise<boolean> {
  const record = await prisma.otpVerification.findFirst({
    where: { phone, purpose: OtpPurpose.LOGIN, verifiedAt: { not: null }, consumedAt: null },
    orderBy: { verifiedAt: "desc" },
  });
  if (!record) return false;
  // A verified OTP is only good for registration for a short window after
  // verification, same idea as an access-token lifetime.
  const stillFresh = Date.now() - record.verifiedAt!.getTime() < 10 * 60_000;
  if (!stillFresh) return false;

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
