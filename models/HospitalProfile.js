// models/HospitalProfile.js
import mongoose from "mongoose";

const multilingualField = {
  en: { type: String, default: "" },
  ar: { type: String, default: "" },
};

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

    hospitalName: multilingualField,
    description: multilingualField,
    address: multilingualField,
    city: multilingualField,
    state: multilingualField,
    country: multilingualField,

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
