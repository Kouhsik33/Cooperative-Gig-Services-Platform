import { Request, Response } from "express";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

// Forecasting — Part E, Requirement 11. Proxies to the Python AI service
// (see /ai-service) for GET /api/forecast/demand?federationId=&days=7.

export async function getDemandForecast(req: Request, res: Response) {
  const federationId = req.query.federationId as string | undefined;
  const days = req.query.days ? Number(req.query.days) : 7;

  if (!federationId) {
    return res.status(400).json({ error: "federationId is required" });
  }

  // Same ownership check as requireOwnFederation, but reading federationId
  // from a query param rather than a route param — this endpoint's shape
  // (GET /forecast/demand?federationId=) doesn't fit that middleware.
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (admin?.federationId !== federationId) {
    return res.status(403).json({ error: "Forbidden — not your federation" });
  }

  try {
    const { data } = await axios.get(`${env.aiServiceUrl}/forecast/demand`, {
      params: { federationId, days },
    });
    res.json(data);
  } catch {
    res.status(502).json({ error: "AI forecasting service is unavailable" });
  }
}
