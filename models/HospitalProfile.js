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
    country: String,
    phone: String,
    specialties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Specialty",
      },
    ],
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DoctorProfile",
      },
    ],
    photos: [
      {
        url: String,
        publicId: String,
      },
    ],
    avatar: String,
  },
  { timestamps: true }
);

export default mongoose.model("HospitalProfile", hospitalProfileSchema);
