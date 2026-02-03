// models/DoctorProfile.js
import mongoose from "mongoose";


const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // hospital user
      required: true,
    },

    specializations: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],


    experience: Number,
    qualifications: String,
    licenseNumber: String,
    bio: String,

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DoctorProfile", doctorProfileSchema);
