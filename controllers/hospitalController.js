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

    const { name, email, password, specializations = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Fetch all valid specialties from database
    const validSpecialties = await Specialty.find({ active: true }, "name");
    const validSpecialtyNames = validSpecialties.map((s) => s.name);

    // Validate specializations against database
    const invalid = specializations.filter(
      (s) => !validSpecialtyNames.includes(s)
    );

    if (invalid.length) {
      return res.status(400).json({
        message: "Invalid specialization(s)",
        invalid,
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
    }).populate("userId", "-password");

    res.json(
      profiles.map((p) => ({
        _id: p.userId._id,
        id: p.userId._id,
        name: p.userId.name,
        email: p.userId.email,
        active: p.userId.active,
        specializations: p.specializations,
        profileCompleted: p.profileCompleted,
      }))
    );
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
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET HOSPITAL PROFILE (FOR HEADER / DASHBOARD)
   GET /api/hospital/me
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
      specialization,
      surgeryName,
      description,
      duration,
      cost,
      assignedDoctors = [],
    } = req.body;

    // 1. Validate hospital profile
    const hospitalProfile = await HospitalProfile.findOne({
      userId: hospitalUserId,
      hospitalStatus: "approved",
    });

    if (!hospitalProfile) {
      return res.status(403).json({ message: "Hospital not approved" });
    }

    // 2. Validate specialization exists in database
    const validSpecialty = await Specialty.findOne({
      name: specialization,
      active: true,
    });

    if (!validSpecialty) {
      return res.status(400).json({
        message: "Invalid specialization",
      });
    }

    // 3. Validate assigned doctors belong to this hospital
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

    // 4. Create surgery
    const surgery = await Surgery.create({
      hospitalId: hospitalUserId,
      specialization,
      surgeryName,
      description,
      duration,
      cost,
      assignedDoctors,
    });

    res.status(201).json({
      message: "Surgery added successfully",
      surgery,
    });
  } catch (error) {
    console.error("Add surgery error:", error);
    res.status(500).json({ message: "Server error" });
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
      .populate("assignedDoctors", "name email")
      .sort({ specialization: 1, createdAt: -1 });

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
   PUT /api/hospital/profile
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
        phone,
        country,
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
   GET ALL SPECIALTIES (FROM DATABASE)
   GET /api/hospital/specializations
===================================================== */
export const getHospitalSpecializations = async (req, res) => {
  try {
    // Fetch all active specialties from database
    const specialties = await Specialty.find({ active: true }, "name");
    const specialtyNames = specialties.map((s) => s.name);

    res.json({ specializations: specialtyNames });
  } catch (err) {
    console.error("Get specializations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};