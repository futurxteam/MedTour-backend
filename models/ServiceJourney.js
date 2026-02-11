import mongoose from "mongoose";

const stageSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    // Optional dates
    startDate: Date,
    endDate: Date,
    estimatedDate: Date,

    // For flight-specific stages
    flightDetails: {
      flightNumber: String,
      departureTime: Date,
      arrivalTime: Date,
      airline: String,
    },

    // Notes visible to patient
    notes: String,
  },
  { timestamps: true }
);

const serviceJourneySchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      unique: true,
    },
    assignedPA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    stages: [stageSchema],

    // Calculated fields
    totalDuration: {
      type: Number,
      default: 0,
    },
    estimatedCompletionDate: Date,
  },
  { timestamps: true }
);

// Index for faster queries
serviceJourneySchema.index({ assignedPA: 1, status: 1 });
serviceJourneySchema.index({ enquiryId: 1 });

// Method to calculate total duration
serviceJourneySchema.methods.calculateTotalDuration = function () {
  let total = 0;
  this.stages.forEach((stage) => {
    if (stage.startDate && stage.endDate) {
      const duration =
        (stage.endDate - stage.startDate) / (1000 * 60 * 60 * 24);
      total += duration;
    }
  });
  this.totalDuration = Math.round(total);
  return this.totalDuration;
};

// Method to calculate progress percentage
serviceJourneySchema.methods.getProgressPercentage = function () {
  if (this.stages.length === 0) return 0;
  const completedStages = this.stages.filter(
    (s) => s.status === "completed"
  ).length;
  return Math.round((completedStages / this.stages.length) * 100);
};

export default mongoose.model("ServiceJourney", serviceJourneySchema);
