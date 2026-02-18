import mongoose from "mongoose";

const surgerySchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    globalSurgeryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalSurgery",
      required: true,
      index: true,
    },

    specialization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    duration: {
      type: String,
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
