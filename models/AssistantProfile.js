// models/AssistantProfile.js
import mongoose from "mongoose";

const assistantProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    assignedHospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    experience: Number,
    languages: [String],

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AssistantProfile", assistantProfileSchema);
