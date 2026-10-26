// Pushing events to signed-in browsers (Socket.io). The socket server is set
// up in socketServer.ts when the web server starts; scripts (seeders,
// migrations) never start one, so emitting there is simply a no-op.

type Emitter = { to: (room: string) => { emit: (event: string, payload: unknown) => void } };
let io: Emitter | null = null;

export const setRealtime = (server: Emitter | null) => {
  io = server;
};

export const userRoom = (userId: string) => `user:${userId}`;

export const emitToUser = (userId: string | undefined | null, event: string, payload: unknown) => {
  if (!io || !userId) return;
  try {
    io.to(userRoom(String(userId))).emit(event, payload);
  } catch (error: any) {
    // a push that fails is not worth failing the request over: the bell still polls
    console.error("Realtime emit failed:", error.message);
  }
};

// What a browser is told about a new notification (it refetches the list).
export const notificationEvent = (n: any) => ({
  _id: String(n._id),
  title: n.title,
  message: n.message,
  link: n.link,
  createdAt: n.createdAt,
});
