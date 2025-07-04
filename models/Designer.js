const mongoose = require("mongoose");

const designerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Nữ", "Nam", "Khác"],
    },
    dob: {
      type: Date,
    },
    avatar: {
      type: String,
      trim: true,
    },
    resetCode: {
      type: String,
    },
    resetCodeExpiry: {
      type: Number,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
    },
    verificationCodeExpiry: {
      type: Date,
    },
    // Ban management fields
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: "",
    },
    banExpiry: {
      type: Date,
      default: null,
    },
    bannedBy: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Designer", designerSchema);