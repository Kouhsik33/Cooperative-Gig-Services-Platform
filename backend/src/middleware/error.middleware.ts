import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";

// The last line of defence for anything a controller throws rather than
// returning explicitly. Every route is wrapped in catchAsync, so a rejected
// promise lands here instead of hanging the request.
//
// Controllers already return their own 4xx codes for expected outcomes, so
// what reaches this handler is genuinely unexpected — but "unexpected" is
// not the same as "server's fault". A Prisma P2025 means the client asked
// for something that isn't there, and answering 500 to that both misleads
// the caller and hides real faults inside the same bucket.

/** Thrown deliberately by a service when it wants a specific status. */
export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

function classify(err: unknown): { status: number; message: string } {
  if (err instanceof HttpError) {
    return { status: err.statusCode, message: err.message };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025": // "An operation failed because it depends on records that were required but not found"
        return { status: 404, message: "Not found" };
      case "P2002": // unique constraint
        return { status: 409, message: "That already exists" };
      case "P2003": // foreign key constraint
        return { status: 400, message: "Referenced record does not exist" };
      default:
        break;
    }
  }

  // A malformed query is the caller's problem, not an outage.
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 400, message: "Invalid request" };
  }

  return { status: 500, message: "Internal server error" };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // Express cannot take over once headers are out; handing back to the
  // default handler is the only correct move.
  if (res.headersSent) return next(err);

  const { status, message } = classify(err);

  // Only genuine server faults are worth a stack trace in the log; a 404
  // from a mistyped id is noise that buries the ones that matter.
  if (status >= 500) {
    console.error("[error]", err);
  } else {
    console.warn(`[error] ${status} ${message}`);
  }

  res.status(status).json({
    error: message,
    // Never leaked in production — the detail is for a developer reading a
    // local console, not for the caller.
    ...(env.nodeEnv === "development" && err instanceof Error
      ? { detail: err.message }
      : {}),
  });
}
