// models/PatientProfile.js
import mongoose from "mongoose";

const patientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    dob: Date,
    age: Number,
    nationality: String,
    country: String,
    phone: String,
    preferredLanguage: String,
    emergencyContact: String,

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PatientProfile", patientProfileSchema);
