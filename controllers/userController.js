import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import PatientProfile from "../models/PatientProfile.js";

export const getCurrentUser = async (req, res) => {
  try {
    console.log("👤 Fetching current user, ID:", req.user.id);

    // 🔥 User identity
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Dynamic Profile Fetching
    let profile = null;
    if (user.role === "doctor") {
      profile = await DoctorProfile.findOne({ userId: user._id });
    } else if (user.role === "hospital") {
      profile = await HospitalProfile.findOne({ userId: user._id });
    } else {
      // Default to PatientProfile for role "user" or "patient"
      profile = await PatientProfile.findOne({ userId: user._id });
    }

    console.log("User found:", user?.email);

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: user.role === "hospital" ? true : (profile?.profileCompleted || false),
      profile,
    });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    console.log("📖 Fetching patient profile for user:", req.user.id);

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await PatientProfile.findOne({ userId: user._id });

    console.log("✅ Profile fetched:", user.email);

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: profile?.profileCompleted || false,
      profile,
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const updatePatientProfile = async (req, res) => {
  try {
    console.log("📝 Profile update request received");
    console.log("User ID:", req.user.id);
    console.log("Request body:", req.body);

    const {
      dob,
      nationality,
      country,
      phone,
      preferredLanguage,
      emergencyContact,
    } = req.body;

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    console.log("Calculated age:", age);

    // 🔥 Update patient profile (NOT User)
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        dob,
        age,
        nationality,
        country,
        phone,
        preferredLanguage,
        emergencyContact,
        profileCompleted: true,
      },
      { new: true, upsert: true }
    );

    console.log("✅ Profile updated successfully");
    console.log("Updated profile:", profile);
    console.log("Profile completed:", profile.profileCompleted);

    // 🔥 JWT stays identity-only (NO regeneration needed)
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: req.user.id,
        role: "user",
        profileCompleted: profile.profileCompleted,
        profile,
      },
    });
  } catch (error) {
    console.error("❌ Profile update error:", error);
    res.status(500).json({ message: "Profile update failed" });
  }
};
