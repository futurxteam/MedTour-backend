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

    // For flight-specific stages
    flightDetails: {
      flightNumber: String,
      departureTime: Date,
      arrivalTime: Date,
      airline: String,
    },

    // Notes visible to patient
    notes: String,
    durationHours: Number,
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
    currentDay: {
      type: Number,
      default: 0,
    },
    estimatedCompletionDate: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// progressPercentage virtual
serviceJourneySchema.virtual("progressPercentage").get(function () {
  if (!this.stages || this.stages.length === 0) return 0;
  const completedStages = this.stages.filter(
    (s) => s.status === "completed"
  ).length;
  return Math.round((completedStages / this.stages.length) * 100);
});

// Index for faster queries
serviceJourneySchema.index({ assignedPA: 1, status: 1 });
serviceJourneySchema.index({ enquiryId: 1 });

// Method to calculate durations

serviceJourneySchema.methods.calculateTotalDuration = function () {
  const stages = this.stages || [];

  if (stages.length === 0) {
    this.totalDuration = 0;
    this.currentDay = 0;
    return 0;
  }

  let minTime = null;
  let maxTime = null;

  // Find earliest startDate & latest endDate
  stages.forEach((stage) => {
    if (stage.startDate) {
      const time = new Date(stage.startDate).getTime();
      if (!isNaN(time)) {
        if (minTime === null || time < minTime) minTime = time;
      }
    }

    if (stage.endDate) {
      const time = new Date(stage.endDate).getTime();
      if (!isNaN(time)) {
        if (maxTime === null || time > maxTime) maxTime = time;
      }
    }
  });

  if (minTime === null) {
    this.totalDuration = 0;
    this.currentDay = 0;
    return 0;
  }

  const DAY = 1000 * 60 * 60 * 24;

  const start = new Date(minTime);
  const startMillis = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );

  const now = new Date();
  const todayMillis = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  // ✅ TOTAL DURATION (Inclusive)
  if (maxTime !== null) {
    const end = new Date(maxTime);
    const endMillis = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    );

    const diffDays = Math.floor((endMillis - startMillis) / DAY);
    this.totalDuration = diffDays + 1; // ✅ Inclusive
  } else {
    this.totalDuration = 1;
  }

  // ✅ CURRENT DAY
  if (todayMillis < startMillis) {
    this.currentDay = 0; // Not started yet
  } else {
    const elapsedDays = Math.floor((todayMillis - startMillis) / DAY) + 1;
    this.currentDay = Math.min(elapsedDays, this.totalDuration);
  }

  // If journey completed → lock currentDay
  if (this.status === "completed") {
    this.currentDay = this.totalDuration;
  }

  return this.totalDuration;
};

// Pre-save hook to ensure duration and progress are always recalculated
serviceJourneySchema.pre("save", function () {
  this.calculateTotalDuration();
});

export default mongoose.model("ServiceJourney", serviceJourneySchema);
