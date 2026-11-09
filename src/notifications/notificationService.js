const User = require("../models/User");
const logger = require("../config/logger");
const { subscribe, EVENTS } = require("../events/eventBus");

function registerNotificationHandlers({ emitToUser, mailer }) {
  // Overdue → socket
  subscribe(EVENTS.TASK_OVERDUE, ({ task, ownerId }) => {
    emitToUser(ownerId, "task:overdue", { task });
  });

  // Overdue → email (separate listener: its failures can't affect the socket)
  subscribe(EVENTS.TASK_OVERDUE, async ({ task, ownerId }) => {
    const user = await User.findById(ownerId).select("email username").lean();
    if (!user?.email) return; // email is optional
    await mailer.send({
      to: user.email,
      subject: `Overdue: ${task.title}`,
      text: `Hi ${user.username},\n\nYour task "${task.title}" was due on ${new Date(task.dueDate).toUTCString()} and is now overdue.\n\n— RemindMe`,
    });
    logger.info({ userId: ownerId, taskId: task.id }, "Overdue email sent");
  });

  // Completed → socket
  subscribe(EVENTS.TASK_COMPLETED, ({ task, ownerId }) => {
    emitToUser(ownerId, "task:completed", { task });
  });
}

module.exports = { registerNotificationHandlers };