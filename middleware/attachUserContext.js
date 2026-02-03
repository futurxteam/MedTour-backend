import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import AssistantProfile from "../models/AssistantProfile.js";

const attachUserContext = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1️⃣ Fetch base user
    const user = await User.findById(req.user.id).lean();

    if (!user || !user.active) {
      return res.status(401).json({ message: "User inactive or not found" });
    }

    // 2️⃣ Fetch role-specific profile
    let profile = null;

    switch (user.role) {
      case "user":
        profile = await PatientProfile.findOne({ userId: user._id }).lean();
        break;

      case "doctor":
        profile = await DoctorProfile.findOne({ userId: user._id }).lean();
        break;

      case "hospital":
        profile = await HospitalProfile.findOne({ userId: user._id }).lean();
        break;

      case "assistant":
        profile = await AssistantProfile.findOne({ userId: user._id }).lean();
        break;

      case "admin":
        profile = null; // admin usually has no profile
        break;
    }

    // 3️⃣ Attach full context
    req.user = {
      ...user,
      profile,
    };

    next();
  } catch (err) {
    console.error("attachUserContext error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export default attachUserContext;
