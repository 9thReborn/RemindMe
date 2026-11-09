const http = require("node:http");
const config = require("./config");
const logger = require("./config/logger");
const { connectDB, disconnectDB } = require("./config/db");
const app = require("./app");

// Phase 5: attach Socket.IO to `server` here
const { createSocketServer } = require("./sockets");
const {
  registerNotificationHandlers,
} = require("./notifications/notificationService");
const mailer = require("./notifications/mailer");

// Phase 4: start the overdue sweep here
const { startOverdueSweep } = require("./jobs/overdueSweep");


const server = http.createServer(app);
const { io, emitToUser } = createSocketServer(server);
registerNotificationHandlers({ emitToUser, mailer });
let sweepJob;

async function start() {
  try {
    await connectDB();
    sweepJob = startOverdueSweep(); // only once the DB is up
    server.listen(config.port, () =>
      logger.info({ port: config.port }, "Server listening"),
    );
  } catch (err) {
    logger.fatal({ err }, "Failed to start");
    process.exit(1);
  }
}

let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");

  // If cleanup hangs, force-exit after 10 seconds
  setTimeout(() => process.exit(1), 10000).unref();

  sweepJob?.stop();
  io.close(async () => {
    // stop new connections, finish in-flight requests
    await disconnectDB();
    logger.info("Shutdown complete");
    process.exit(exitCode);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM")); // Render sends this on redeploy
process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C locally

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1); // state may be corrupt; don't try anything clever
});

start();