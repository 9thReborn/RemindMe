const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true }, // one login session
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL: MongoDB deletes each document once expiresAt has passed
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);