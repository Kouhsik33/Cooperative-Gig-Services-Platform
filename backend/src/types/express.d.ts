import "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
      // Captured by the express.json() verify callback so the Razorpay
      // webhook can validate the HMAC signature against the exact bytes
      // received (a parsed/re-serialized body would not match).
      rawBody?: Buffer;
    }
  }
}

export {};
