const { matchedData } = require("express-validator");
const tasksService = require("./tasks.service");

exports.list = async (req, res) => {
  const options = matchedData(req, { locations: ["query"] });
  const result = await tasksService.listTasks(req.user.id, options);
  res.json({ status: "success", data: result });
};

exports.create = async (req, res) => {
  const task = await tasksService.createTask(
    req.user.id,
    matchedData(req, { locations: ["body"] }),
  );
  res.status(201).json({ status: "success", data: { task } });
};

exports.get = async (req, res) => {
  const task = await tasksService.getTask(req.user.id, req.params.id);
  res.json({ status: "success", data: { task } });
};

exports.updateStatus = async (req, res) => {
  const task = await tasksService.updateStatus(
    req.user.id,
    req.params.id,
    req.body.status,
  );
  res.json({ status: "success", data: { task } });
};

exports.remove = async (req, res) => {
  const task = await tasksService.updateStatus(
    req.user.id,
    req.params.id,
    "deleted",
  );
  res.json({ status: "success", data: { task } });
};