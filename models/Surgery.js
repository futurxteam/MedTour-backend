import mongoose from "mongoose";

const surgerySchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    surgeryName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    duration: {
      type: String, // e.g. "2–3 hours"
      required: true,
    },

    cost: {
      type: Number,
      required: true,
    },

    assignedDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Surgery", surgerySchema);
