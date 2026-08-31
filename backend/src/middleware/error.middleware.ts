import { NextFunction, Request, Response } from "express";

// TODO(Phase 1): centralized error formatting.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
