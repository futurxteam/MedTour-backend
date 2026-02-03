// models/HospitalProfile.js
import mongoose from "mongoose";

const hospitalProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    hospitalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    hospitalName: String,
    description: String,
    address: String,
    city: String,
    state: String,
    phone: String,
    specialties: [String],

    avatar: String,
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HospitalProfile", hospitalProfileSchema);
