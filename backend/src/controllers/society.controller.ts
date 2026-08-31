import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Not in Part E's literal endpoint list — needed so a newly-registered
// worker (via the new passwordless /auth/register flow) can pick a
// society/locality during onboarding. Read-only, authenticated-only
// (no role restriction): harmless to expose to any signed-in user, and
// there was previously no way to discover societies outside the
// federation-admin-scoped routes.
export async function listSocieties(_req: Request, res: Response) {
  const societies = await prisma.society.findMany({
    include: { federation: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(societies);
}
