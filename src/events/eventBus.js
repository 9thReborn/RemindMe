const { EventEmitter } = require("node:events");
const logger = require("../config/logger");

const bus = new EventEmitter();

const EVENTS = Object.freeze({
  TASK_COMPLETED: "task.completed",
  TASK_OVERDUE: "task.overdue",
});

const VALID = new Set(Object.values(EVENTS));
function assertEvent(event) {
  if (!VALID.has(event)) throw new Error(`Unknown event: ${String(event)}`);
}

function subscribe(event, handler) {
  assertEvent(event);
  bus.on(event, async (payload) => {
    try {
      await handler(payload);
    } catch (err) {
      logger.error({ err, event }, "Event handler failed");
    }
  });
}

function publish(event, payload) {
  assertEvent(event);
  logger.debug({ event, taskId: payload?.task?.id }, "Event published");
  bus.emit(event, payload);
}

module.exports = { EVENTS, publish, subscribe };