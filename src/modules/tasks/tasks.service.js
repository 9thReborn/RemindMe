const { Task, STATUS } = require("../../models/Task");
const AppError = require("../../utils/AppError");
const logger = require("../../config/logger");
const { publish, EVENTS } = require("../../events/eventBus");
const { canTransition } = require("./taskStatus");

const SWEEP_BATCH = 200;

// Event payloads are plain data, never live Mongoose documents
const toEvent = (task) => ({
  task: task.toJSON(),
  ownerId: task.owner.toString(),
});

async function createTask(ownerId, { title, description, dueDate }) {
  const task = await Task.create({
    owner: ownerId,
    title,
    description,
    dueDate,
  });
  logger.info({ userId: ownerId, taskId: task.id }, "Task created");
  return task;
}

async function listTasks(
  ownerId,
  { status, sort = "dueDate", order = "asc", page = 1, limit = 50 } = {},
) {
  // Catch-up: make sure this user's states are correct before we show them
  await markOverdueTasks({ ownerId });

  const filter = { owner: ownerId };
  filter.status = status || { $ne: STATUS.DELETED }; // hide deleted unless asked

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sort]: order === "desc" ? -1 : 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);
  return { tasks, total, page, limit };
}

async function getTask(ownerId, taskId) {
  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) throw AppError.notFound("Task not found");
  return task;
}

function fieldsFor(to, now) {
  const fields = { status: to };
  if (to === STATUS.COMPLETED) fields.completedAt = now;
  if (to === STATUS.PENDING)
    Object.assign(fields, { completedAt: null, overdueAt: null });
  if (to === STATUS.DELETED) fields.deletedAt = now;
  return fields;
}

async function updateStatus(ownerId, taskId, to) {
  const task = await getTask(ownerId, taskId);
  if (task.status === to) return task; // already there: nothing to do (idempotent)

  if (!canTransition(task.status, to)) {
    throw AppError.conflict(`Cannot change a ${task.status} task to ${to}`);
  }

  // Optimistic concurrency: only update if nobody changed it since we read it
  const updated = await Task.findOneAndUpdate(
    { _id: task._id, owner: ownerId, status: task.status },
    { $set: fieldsFor(to, new Date()) },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated)
    throw AppError.conflict(
      "Task was updated elsewhere. Please refresh and try again.",
    );

  logger.info(
    { userId: ownerId, taskId: updated.id, from: task.status, to },
    "Task status changed",
  );
  if (to === STATUS.COMPLETED) publish(EVENTS.TASK_COMPLETED, toEvent(updated));
  return updated;
}

// Used by the cron job (all users) and by listTasks (one user)
async function markOverdueTasks({ now = new Date(), ownerId } = {}) {
  const filter = { status: STATUS.PENDING, dueDate: { $lte: now } };
  if (ownerId) filter.owner = ownerId;

  const candidates = await Task.find(filter).select('_id').limit(SWEEP_BATCH).lean();
  let marked = 0;

  for (const { _id } of candidates) {
    try {
      const task = await Task.findOneAndUpdate(
        { _id, status: STATUS.PENDING, dueDate: { $lte: now } },
        { $set: { status: STATUS.OVERDUE, overdueAt: now } },
        { returnDocument: "after" },
      );
      if (!task) continue;  // the user completed it, or another sweep got there first
      marked += 1;
      publish(EVENTS.TASK_OVERDUE, toEvent(task));
    } catch (err) {
      logger.error({ err, taskId: _id.toString() }, 'Failed to mark task overdue');
    }
  }

  if (marked) logger.info({ candidates: candidates.length, marked, ownerId }, 'Tasks marked overdue');
  return marked;
}

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateStatus,
  markOverdueTasks,
};
