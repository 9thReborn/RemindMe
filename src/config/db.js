const mongoose = require("mongoose");
const config = require("./index");
const logger = require("./logger");

mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
mongoose.connection.on("disconnected", () =>
  logger.warn("MongoDB disconnected"),
);
mongoose.connection.on("error", (err) =>
  logger.error({ err }, "MongoDB error"),
);

async function connectDB(uri = config.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };