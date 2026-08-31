import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing access token" });
  }
  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Restricts a :id-scoped federation route to the requesting admin's own
// federation. Looks up federationId fresh from the DB on every request
// rather than trusting a JWT claim, since federation assignment could
// change between token issuance and use and access tokens are short-lived
// but not instantaneous. Must run after requireAuth + requireRole("FEDERATION_ADMIN").
export async function requireOwnFederation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.federationId) {
    return res
      .status(403)
      .json({ error: "This account is not assigned to a federation" });
  }
  if (admin.federationId !== req.params.id) {
    return res.status(403).json({ error: "Forbidden — not your federation" });
  }
  next();
}
