import "dotenv/config";

export const env = {
  port: process.env.PORT ?? "4000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  fairness: {
    // Part F — wage-split & fairness logic. Implement exactly as specified.
    emergencySurgePercent: Number(process.env.EMERGENCY_SURGE_PERCENT ?? 0.2),
    federationFeePercent: Number(process.env.FEDERATION_FEE_PERCENT ?? 0.1),
    welfarePercent: Number(process.env.WELFARE_PERCENT ?? 0.03),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  booking: {
    // How long a REQUESTED booking keeps searching before it is swept
    // into EXPIRED (master prompt §18). 30 minutes is a demo-friendly
    // default: long enough that a judge tapping through never sees a
    // booking expire mid-demo, short enough that the sweeper is
    // observable if you go looking.
    requestTtlMinutes: Number(process.env.BOOKING_REQUEST_TTL_MINUTES ?? 30),
    expirySweepSeconds: Number(process.env.BOOKING_EXPIRY_SWEEP_SECONDS ?? 60),
  },
  otp: {
    // Demo OTP configuration — a single, named place for "every dummy/
    // demo phone number always gets a fixed OTP", instead of an
    // `if (phone === "...")` scattered through the codebase. Every
    // seeded demo account (customer 9000000201, worker 9000000100, and
    // the additional dispatch-testing workers 9000000101-103/111-113/
    // 121-123 — see prisma/seed.ts) shares this one prefix, so this
    // check generalizes to all of them without enumerating each number.
    // "900000" isn't a real Indian mobile prefix (those start 6/7/8/9
    // followed by a real subscriber block, not five more zeros), so it's
    // safe to treat as an unambiguous demo marker.
    demoPhonePrefix: process.env.DEMO_PHONE_PREFIX ?? "900000",
    demoOtp: process.env.DEMO_OTP ?? "0000",
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? 5),
    serviceOtpExpiryMinutes: Number(process.env.SERVICE_OTP_EXPIRY_MINUTES ?? 60),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    // Real-SMS integration point (master prompt §40) — muted for this
    // phase. Flip to true (and implement the provider call in
    // otp.service.ts) when a real SMS provider is wired up.
    smsEnabled: process.env.OTP_SMS_ENABLED === "true",
  },
};
