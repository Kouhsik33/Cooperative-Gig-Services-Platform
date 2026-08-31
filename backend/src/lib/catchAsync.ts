import { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 does not catch a rejected promise thrown inside an async
// route handler — without this, a thrown/rejected error inside any
// `async function` controller becomes an unhandled promise rejection
// (Node logs "UnhandledPromiseRejectionWarning" / an uncaught exception
// trace) and the request just hangs forever instead of getting the
// centralized error.middleware.ts's 500 response. Wrapping every async
// handler in this forwards the rejection to `next(err)` like a
// synchronous throw already would.
export function catchAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
