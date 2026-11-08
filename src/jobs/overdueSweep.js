const cron = require("node-cron");
const logger = require("../config/logger");
const { markOverdueTasks } = require("../modules/tasks/tasks.service");

function startOverdueSweep(schedule = "* * * * *") {
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn("Previous overdue sweep still running; skipping this tick");
      return;
    }
    running = true;
    try {
      await markOverdueTasks();
    } catch (err) {
      logger.error({ err }, "Overdue sweep failed");
    } finally {
      running = false;
    }
  };

  const job = cron.schedule(schedule, run);
  run(); // catch up immediately at startup, don't wait a minute
  logger.info({ schedule }, "Overdue sweep scheduled");
  return job;
}

module.exports = { startOverdueSweep };