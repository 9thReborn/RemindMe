const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const config = require("../config");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, config.bcryptRounds);
};

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);