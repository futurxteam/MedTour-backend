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

    // models/DoctorProfile.js
    specializations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Specialty",
        required: true,
      },
    ],



    experience: Number,
    qualifications: String,
    licenseNumber: String,
    designation: String,
    consultationFee: Number,
    about: String,
    bio: String, // Keeping bio for compatibility, but 'about' will be used more extensively

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    profilePhoto: {
      data: Buffer,
      contentType: String,
      hash: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("DoctorProfile", doctorProfileSchema);
