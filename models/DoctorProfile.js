import mongoose from "mongoose";
import HospitalProfile from "./HospitalProfile.js";

const multilingualField = {
  en: { type: String, default: "" },
  ar: { type: String, default: "" },
};

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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Specialty",
        required: true,
      },
    ],

    experience: Number,
    qualifications: multilingualField,
    licenseNumber: String,
    designation: multilingualField,
    consultationFee: Number,
    about: multilingualField,
    bio: multilingualField,

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

/**
 * 🔥 KEEP HOSPITAL.doctors[] IN SYNC
 * Runs ONLY when a new doctor is created
 */
doctorProfileSchema.post("save", async function (doc, next) {
  if (!doc.isNew) return next();

  try {
    await HospitalProfile.findOneAndUpdate(
      { userId: doc.hospitalId },
      { $addToSet: { doctors: doc._id } }
    );
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("DoctorProfile", doctorProfileSchema);