const { Server } = require("socket.io");
const logger = require("../config/logger");
const { verifyAccessToken } = require("../utils/tokens");

const roomFor = (userId) => `user:${userId}`;

function createSocketServer(httpServer) {
  const io = new Server(httpServer); // same origin as the UI, so no CORS config needed

  // Handshake auth: runs once per connection attempt
  io.use((socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      socket.data.userId = payload.sub;
      socket.data.tokenExp = payload.exp;
      next();
    } catch {
      next(new Error("Unauthorized")); // client receives this as connect_error
    }
  });

  io.on("connection", (socket) => {
    const { userId, tokenExp } = socket.data;
    socket.join(roomFor(userId));
    logger.info({ userId, socketId: socket.id }, "Socket connected");

    // Requirement: a socket must not outlive its token
    const msLeft = tokenExp * 1000 - Date.now();
    const expiryTimer = setTimeout(
      () => {
        socket.emit("auth:expired");
        socket.disconnect(true);
      },
      Math.max(msLeft, 0),
    );

    socket.on("disconnect", (reason) => {
      clearTimeout(expiryTimer);
      logger.info(
        { userId, socketId: socket.id, reason },
        "Socket disconnected",
      );
    });
  });

  function emitToUser(userId, event, payload) {
    io.to(roomFor(userId)).emit(event, payload);
  }

  return { io, emitToUser };
}

module.exports = { createSocketServer };
