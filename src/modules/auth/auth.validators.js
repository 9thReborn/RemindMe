const { body } = require("express-validator");

exports.signupRules = [
  body("username")
    .isString()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3–30 characters")
    .matches(/^[a-z0-9_]+$/)
    .withMessage("Username may contain letters, numbers and underscores only"),
  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be 8–72 characters"),
  body("email")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isEmail()
    .withMessage("Invalid email address"),
];

exports.loginRules = [
  body("username")
    .isString()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Username is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
];