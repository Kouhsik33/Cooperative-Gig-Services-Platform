import { createServer } from "http";
import { createApp } from "./app";
import { initSocket } from "./socket";
import { startBookingExpirySweeper } from "./services/bookingExpiry.service";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Backend API listening on port ${env.port}`);
  // Started after the server is up so a slow first sweep can never delay
  // the port binding.
  startBookingExpirySweeper();
});
