import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Surgery from "../models/Surgery.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Specialty from "../models/Speciality.js";

/* =====================================================
   ADD DOCTOR
===================================================== */
export const addDoctor = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      name,
      email,
      password,
      specializations = [],
      designation = "",
      experience = 0,
      consultationFee = 0,
      about = "",
      qualifications = "",
      licenseNumber = ""
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Fetch valid specialties by IDs
    const validSpecialties = await Specialty.find({
      _id: { $in: specializations },
      active: true
    });

    if (validSpecialties.length !== specializations.length) {
      return res.status(400).json({
        message: "One or more invalid specialization IDs provided",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "doctor",
      active: true,
    });

    await DoctorProfile.create({
      userId: doctor._id,
      hospitalId: req.user.id,
      specializations,
      designation,
      experience,
      consultationFee,
      about,
      qualifications,
      licenseNumber,
      profileCompleted: false,
    });

    res.status(201).json({
      message: "Doctor added successfully",
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specializations,
      },
    });
  } catch (err) {
    console.error("Add doctor error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   LIST DOCTORS
===================================================== */
export const listDoctors = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = req.user._id || req.user.id;

    const profiles = await DoctorProfile.find({
      hospitalId: userId,
    })
      .populate("userId", "-password")
      .populate("specializations", "name");

    const formattedDoctors = profiles
      .filter((p) => p.userId)
      .map((p) => ({
        id: p.userId._id,
        _id: p.userId._id,
        name: p.userId.name || "Unknown",
        email: p.userId.email || "",
        active: p.userId.active ?? true,
        specializations: (p.specializations || []).map(s => s.name || s),
        specializationIds: (p.specializations || []).map(s => s._id || s),
        designation: p.designation || "",
        experience: p.experience || 0,
        consultationFee: p.consultationFee || 0,
        about: p.about || "",
        qualifications: p.qualifications || "",
        licenseNumber: p.licenseNumber || "",
        profileCompleted: !!p.profileCompleted,
      }));

    res.json(formattedDoctors);
  } catch (err) {
    console.error("List doctors error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   TOGGLE DOCTOR STATUS
===================================================== */
export const toggleDoctorStatus = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const doctor = await User.findOne({
      _id: req.params.id,
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const profile = await DoctorProfile.findOne({
      userId: doctor._id,
      hospitalId: req.user.id,
    });

    if (!profile) {
      return res.status(403).json({ message: "Access denied" });
    }

    doctor.active = !doctor.active;
    await doctor.save();

    res.json({
      message: "Doctor status updated",
      active: doctor.active,
    });
  } catch (err) {
    console.error("Toggle doctor error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   UPDATE DOCTOR PROFILE BY HOSPITAL
   PUT /api/hospital/doctors/:id/profile
===================================================== */
export const updateDoctorProfileByHospital = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const doctorId = req.params.id;
    const {
      name,
      designation,
      experience,
      consultationFee,
      about,
      qualifications,
      licenseNumber,
      specializations
    } = req.body;

    // 1. Update User (Name)
    const user = await User.findOneAndUpdate(
      { _id: doctorId, role: "doctor" },
      { name },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Doctor user not found" });
    }

    // 2. Update DoctorProfile
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: doctorId, hospitalId: req.user.id },
      {
        designation,
        experience,
        consultationFee,
        about,
        qualifications,
        licenseNumber,
        specializations
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    res.json({
      message: "Doctor profile updated successfully",
      doctor: {
        ...user.toObject(),
        profile
      }
    });
  } catch (err) {
    console.error("Update doctor profile by hospital error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET HOSPITAL PROFILE
===================================================== */
export const getHospitalMe = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.user.id).select("-password");
    const profile = await HospitalProfile.findOne({ userId: user._id });

    res.json({
      ...user.toObject(),
      profile,
      profileCompleted: profile?.profileCompleted || false,
    });
  } catch (err) {
    console.error("Get hospital me error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   ADD SURGERY
===================================================== */
export const addSurgery = async (req, res) => {
  try {
    const hospitalUserId = req.user.id;

    const {
      specializationId,
      surgeryName,
      description,
      duration,
      cost,
      assignedDoctors = [],
    } = req.body;

    // Validate hospital profile
    const hospitalProfile = await HospitalProfile.findOne({
      userId: hospitalUserId,
      hospitalStatus: "approved",
    });

    if (!hospitalProfile) {
      return res.status(403).json({ message: "Hospital not approved" });
    }

    // Validate specialty
    const validSpecialty = await Specialty.findById(specializationId);
    if (!validSpecialty || !validSpecialty.active) {
      return res.status(400).json({ message: "Invalid specialization" });
    }

    // Validate assigned doctors belong to hospital
    if (assignedDoctors.length > 0) {
      const validDoctors = await DoctorProfile.countDocuments({
        userId: { $in: assignedDoctors },
        hospitalId: hospitalUserId,
      });

      if (validDoctors !== assignedDoctors.length) {
        return res.status(400).json({
          message: "One or more doctors do not belong to this hospital",
        });
      }
    }

    const surgery = await Surgery.create({
      hospitalId: hospitalUserId,
      specialization: validSpecialty._id,
      surgeryName,
      description,
      duration,
      cost,
      assignedDoctors,
      active: true,
    });

    res.status(201).json({
      message: "Surgery added successfully",
      surgery,
    });
  } catch (error) {
    console.error("Add surgery error:", error);
    res.status(500).json({
      message: "Failed to add surgery",
      error: error.message,
    });
  }
};

/* =====================================================
   LIST SURGERIES
===================================================== */
export const listSurgeries = async (req, res) => {
  try {
    const hospitalUserId = req.user.id;

    const surgeries = await Surgery.find({
      hospitalId: hospitalUserId,
    })
      .populate("specialization", "name")
      .populate("assignedDoctors", "name email")
      .sort({ createdAt: -1 });

    res.json(surgeries);
  } catch (error) {
    console.error("List surgeries error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   TOGGLE SURGERY STATUS
===================================================== */
export const toggleSurgeryStatus = async (req, res) => {
  try {
    const hospitalUserId = req.user.id;
    const { id } = req.params;

    const surgery = await Surgery.findOne({
      _id: id,
      hospitalId: hospitalUserId,
    });

    if (!surgery) {
      return res.status(404).json({ message: "Surgery not found" });
    }

    surgery.active = !surgery.active;
    await surgery.save();

    res.json({
      message: "Surgery status updated",
      active: surgery.active,
    });
  } catch (error) {
    console.error("Toggle surgery error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   UPDATE HOSPITAL PROFILE
===================================================== */
export const updateHospitalProfile = async (req, res) => {
  try {
    if (req.user.role !== "hospital") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      hospitalName,
      description,
      address,
      city,
      state,
      country,
      phone,
      specialties,
      avatar,
    } = req.body;

    const profile = await HospitalProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        hospitalName,
        description,
        address,
        city,
        state,
        country,
        phone,
        specialties,
        avatar,
        profileCompleted: true,
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Hospital profile updated",
      profile,
      profileCompleted: profile.profileCompleted,
    });
  } catch (err) {
    console.error("Update hospital profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET ALL SPECIALTIES
===================================================== */
export const getHospitalSpecializations = async (req, res) => {
  try {
    const specializations = await Specialty.find({ active: true }, "name");
    res.json({ specializations });
  } catch (err) {
    console.error("Get specializations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSurgeriesBySpecialization = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { specializationId } = req.params;

    const surgeries = await Surgery.find({
      hospitalId,
      specialization: specializationId,
      active: true,
    }).select("surgeryName");

    res.json(surgeries);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch surgeries" });
  }
};

// POST /api/hospital/surgeries/:surgeryId/assign-doctor
export const assignDoctorToSurgery = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { surgeryId } = req.params;
    const { doctorId } = req.body;

    const surgery = await Surgery.findOne({
      _id: surgeryId,
      hospitalId,
    });

    if (!surgery) {
      return res.status(404).json({ message: "Surgery not found" });
    }

    if (!surgery.assignedDoctors.includes(doctorId)) {
      surgery.assignedDoctors.push(doctorId);
      await surgery.save();
    }

    res.json({ message: "Doctor assigned successfully" });
  } catch (err) {
    console.error("Assign doctor error:", err);
    res.status(500).json({ message: "Assignment failed" });
  }
};

// GET /api/hospital/surgeries/by-doctor/:doctorId
export const getSurgeriesByDoctor = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { doctorId } = req.params;

    // 1. Find doctor profile
    const doctorProfile = await DoctorProfile.findOne({
      userId: doctorId,
      hospitalId,
    });

    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // 2. Resolve specialization IDs if they are stored as names
    let specialtyIds = doctorProfile.specializations;

    // Check if any specialization is a string that doesn't look like an ID
    const hasNames = specialtyIds.some(s => typeof s === 'string' && s.length > 24); // Not a perfect check but helpful
    // Actually, let's just fetch everything matching names OR IDs

    const matchedSpecialties = await Specialty.find({
      $or: [
        { _id: { $in: specialtyIds } },
        { name: { $in: specialtyIds } }
      ],
      active: true
    }).select("_id");

    const resolvedIds = matchedSpecialties.map(s => s._id);

    // 3. Fetch active surgeries matching any of the resolved specialization IDs
    const surgeries = await Surgery.find({
      hospitalId,
      specialization: { $in: resolvedIds },
      active: true,
    })
      .select("surgeryName specialization assignedDoctors")
      .populate("specialization", "name");

    res.json(surgeries);
  } catch (err) {
    console.error("Get surgeries by doctor error:", err);
    res.status(500).json({ message: "Failed to fetch surgeries" });
  }
};

// PATCH /api/hospital/doctors/:doctorId/surgeries
export const updateDoctorSurgeries = async (req, res) => {
  try {
    const hospitalId = req.user._id || req.user.id;
    const { doctorId } = req.params;
    const { surgeryIds = [] } = req.body;

    console.log(`Updating surgeries for doctor ${doctorId}. Selected:`, surgeryIds);

    // 1. Validate doctor belongs to hospital
    const doctorProfile = await DoctorProfile.findOne({
      userId: doctorId,
      hospitalId,
    });

    if (!doctorProfile) {
      console.error(`Doctor ${doctorId} not found or not belonging to hospital ${hospitalId}`);
      return res.status(404).json({ message: "Doctor not found or access denied" });
    }

    // 2. Resolve specialization IDs (handling both IDs and names safely)
    const specIds = [];
    const specNames = [];

    (doctorProfile.specializations || []).forEach(s => {
      const val = s?.toString() || s;
      if (mongoose.Types.ObjectId.isValid(val)) specIds.push(val);
      else specNames.push(val);
    });

    const matchedSpecialties = await Specialty.find({
      $or: [
        { _id: { $in: specIds } },
        { name: { $in: specNames } }
      ],
      active: true
    }).select("_id");

    const resolvedSpecializationIds = matchedSpecialties.map(s => s._id);

    // 3. Find all relevant surgeries for this doctor's specialization in this hospital
    const relevantSurgeries = await Surgery.find({
      hospitalId,
      specialization: { $in: resolvedSpecializationIds }
    });

    // 4. Update each surgery's assignedDoctors list
    const updatePromises = relevantSurgeries.map(async (surgery) => {
      const surgeryIdStr = surgery._id.toString();
      const isSelected = surgeryIds.includes(surgeryIdStr);

      // Normalize comparison to string for safety
      const hasDoctor = surgery.assignedDoctors.some(id => id.toString() === doctorId);

      if (isSelected && !hasDoctor) {
        // Add doctor
        surgery.assignedDoctors.push(doctorId);
        return surgery.save();
      } else if (!isSelected && hasDoctor) {
        // Remove doctor
        surgery.assignedDoctors = surgery.assignedDoctors.filter(id => id.toString() !== doctorId);
        return surgery.save();
      }
      return null; // No change needed
    });

    await Promise.all(updatePromises);

    res.json({ message: "Assignments updated successfully" });
  } catch (err) {
    console.error("Update doctor surgeries error:", err);
    res.status(500).json({ message: "Failed to update assignments", error: err.message });
  }
};
