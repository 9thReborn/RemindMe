const { STATUS } = require("../../models/Task");

const TRANSITIONS = Object.freeze({
  [STATUS.PENDING]: [STATUS.COMPLETED, STATUS.DELETED, STATUS.OVERDUE],
  [STATUS.OVERDUE]: [STATUS.COMPLETED, STATUS.DELETED],
  [STATUS.COMPLETED]: [STATUS.PENDING, STATUS.DELETED], // reopen
  [STATUS.DELETED]: [],
});

const USER_SETTABLE = Object.freeze([
  STATUS.PENDING,
  STATUS.COMPLETED,
  STATUS.DELETED,
]);

function canTransition(from, to, { bySystem = false } = {}) {
  if (!bySystem && !USER_SETTABLE.includes(to)) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { canTransition, USER_SETTABLE };