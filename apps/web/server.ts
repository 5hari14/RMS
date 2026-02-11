import { createServer } from "http";
import next from "next";
import { createSocketServer } from "@bites-rms/api";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const httpServer = createServer(handle);

  // Attach Socket.io to the HTTP server
  createSocketServer(httpServer);
  console.log("[socket.io] Attached to HTTP server at /api/socketio");

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
