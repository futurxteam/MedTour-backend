// controllers/doctorController.js
import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Specialty from "../models/Speciality.js";

/**
 * GET /api/doctor/profile
 */
export const getDoctorProfile = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const profile = await DoctorProfile.findOne({
      userId: req.user.id,
    });

    if (!profile) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Get doctor profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/doctor/profile
 */
export const updateDoctorProfile = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }


    const { experience, qualifications, licenseNumber, bio, about, designation, consultationFee } = req.body;

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        experience,
        qualifications,
        licenseNumber,
        bio,
        about,
        designation,
        consultationFee,
        profileCompleted: true,
      },
      { new: true, upsert: true }
    );
    if (experience < 0) {
      return res.status(400).json({
        message: "Experience cannot be negative",
      });
    }
    res.json(profile);
  } catch (err) {
    console.error("Update doctor profile error:", err);
    res.status(500).json({ message: "Server error" });
  }

};


/**
 * GET /api/doctor/specializations
 */
export const getDoctorSpecializations = async (req, res) => {
  try {
    const specialties = await Specialty.find({ active: true }, "name");
    res.json({ specializations: specialties.map((s) => s.name) });
  } catch (err) {
    console.error("Get specializations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/doctor/assigned-patients
 */
export const getAssignedPatients = async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json({
    patients: [],
    message: "Assigned patients will appear here",
  });
};