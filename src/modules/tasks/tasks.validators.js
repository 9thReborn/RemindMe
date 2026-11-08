const { body, param, query } = require("express-validator");
const { STATUS } = require("../../models/Task");
const { USER_SETTABLE } = require("./taskStatus");

const createTaskRules = [
  body("title")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be at most 2000 characters"),
  body("dueDate")
    .isISO8601()
    .withMessage("dueDate must be a valid ISO 8601 date")
    .bail()
    .custom((value) => new Date(value) > new Date())
    .withMessage("dueDate must be in the future"),
];

const idRule = param("id").isMongoId().withMessage("Invalid task id");

const statusRules = [
  idRule,
  body("status")
    .isIn(USER_SETTABLE)
    .withMessage(`status must be one of: ${USER_SETTABLE.join(", ")}`),
];

const listRules = [
  query("status").optional().isIn(Object.values(STATUS)),
  query("sort").optional().isIn(["dueDate", "createdAt"]),
  query("order").optional().isIn(["asc", "desc"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = { createTaskRules, statusRules, listRules, idRule };