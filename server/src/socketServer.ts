import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setRealtime, userRoom } from "./utils/realtime";
import { socketUserId } from "./services/socketAuth.service";

// Real-time pushes (new notifications) over Socket.io. Each signed-in browser
// joins its own room, "user:<id>"; nothing is ever sent to everyone. The login
// cookie authenticates the connection, exactly like a normal request.
export const startSocketServer = (http: HttpServer) => {
  const origins = (process.env.ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
  const io = new Server(http, {
    cors: { origin: origins, credentials: true },
    serveClient: false,
  });

  io.use(async (socket, next) => {
    try {
      const userId = await socketUserId(socket.handshake.headers.cookie);
      if (!userId) return next(new Error("AUTH_REQUIRED"));
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("AUTH_REQUIRED"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  setRealtime(io);
  return io;
};
