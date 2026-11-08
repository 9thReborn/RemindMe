const mongoose = require("mongoose");

const STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  OVERDUE: "overdue",
  DELETED: "deleted",
});

const taskSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.PENDING,
    },
    completedAt: { type: Date, default: null },
    overdueAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.owner = ret.owner.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// The user's list: filter by owner + status, sort by dueDate
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });
// The sweep: find pending tasks past their dueDate, across all users
taskSchema.index({ status: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = { Task, STATUS };