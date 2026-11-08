const router = require("express").Router();
const controller = require("./tasks.controller");
const requireAuth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  createTaskRules,
  statusRules,
  listRules,
  idRule,
} = require("./tasks.validators");

router.use(requireAuth); // every task route needs a logged-in user

router.get("/", validate(listRules), controller.list);
router.post("/", validate(createTaskRules), controller.create);
router.get("/:id", validate([idRule]), controller.get);
router.patch("/:id/status", validate(statusRules), controller.updateStatus);
router.delete("/:id", validate([idRule]), controller.remove);

module.exports = router;