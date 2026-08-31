import { createServer } from "http";
import { createApp } from "./app";
import { initSocket } from "./socket";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Backend API listening on port ${env.port}`);
});
