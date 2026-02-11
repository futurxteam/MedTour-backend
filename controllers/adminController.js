import bcrypt from "bcryptjs";
import User from "../models/User.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Specialty from "../models/Speciality.js";
import Enquiry from "../models/Enquiry.js";


/* =====================================================
   GET USERS (SEARCH + FILTER + PAGINATION)
   GET /admin/users
   Query:
   - page
   - limit
   - role
   - search
===================================================== */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { role, search } = req.query;

    const query = {};

    // 🔒 EXCLUDE REJECTED HOSPITALS FROM USER MANAGEMENT
    const rejectedHospitalIds = await HospitalProfile.find({
      hospitalStatus: "rejected",
    }).distinct("userId");

    query._id = { $nin: rejectedHospitalIds };

    if (role) {
      query.role = role;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Pagination fetch error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* =====================================================
   CREATE USER
   POST /admin/users
===================================================== */
export const createUser = async (req, res) => {
  try {
    const { role, email, password } = req.body;

    if (!role || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (role === "admin") {
      return res.status(403).json({ message: "Admin creation not allowed" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: email.split("@")[0],
      email,
      password: hashedPassword,
      role,
      active: true,
      provider: "local",
      mustChangePassword: true,
    });

    // 🔥 Create hospital profile if role = hospital
    if (role === "hospital") {
      await HospitalProfile.create({
        userId: user._id,
        hospitalStatus: "pending",
        profileCompleted: false,
      });
    }

    res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      active: user.active,
    });
  } catch (error) {
    res.status(500).json({ message: "User creation failed" });
  }
};

/* =====================================================
   UPDATE USER
===================================================== */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (role === "admin") {
      return res.status(403).json({ message: "Admin role cannot be assigned" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { name, email, role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

/* =====================================================
   ACTIVATE / DEACTIVATE
===================================================== */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // 🔒 Explicit intent required
    if (typeof active !== "boolean") {
      return res.status(400).json({
        message: "Active status (true/false) is required",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin cannot be modified",
      });
    }

    user.active = active;
    await user.save();

    res.status(200).json({
      id: user._id,
      active: user.active,
    });
  } catch (error) {
    console.error("User status update failed:", error);
    res.status(500).json({ message: "Status update failed" });
  }
};

/* =====================================================
   DELETE USER
===================================================== */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin cannot be deleted" });
    }

    await HospitalProfile.deleteOne({ userId: user._id });
    await user.deleteOne();

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

export const getPendingHospitals = async (req, res) => {
  const profiles = await HospitalProfile.find({
    hospitalStatus: "pending",
  }).populate("userId", "-password");

  res.json(
    profiles.map((p) => ({
      ...p.userId.toObject(),
      hospitalStatus: p.hospitalStatus,
    }))
  );
};

export const approveHospital = async (req, res) => {
  const profile = await HospitalProfile.findOne({ userId: req.params.id });

  profile.hospitalStatus = "approved";
  await profile.save();

  await User.findByIdAndUpdate(req.params.id, { active: true });

  res.json({ message: "Hospital approved" });
};

export const getApprovedHospitals = async (req, res) => {
  try {
    const profiles = await HospitalProfile.find({
      hospitalStatus: "approved",
    }).populate("userId", "-password");

    res.status(200).json(
      profiles.map((p) => ({
        ...p.userId.toObject(),
        hospitalStatus: p.hospitalStatus,
      }))
    );
  } catch (error) {
    console.error("Fetch approved hospitals failed:", error);
    res.status(500).json({ message: "Failed to fetch hospitals" });
  }
};

export const rejectHospital = async (req, res) => {
  try {
    const profile = await HospitalProfile.findOne({ userId: req.params.id });

    if (!profile) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    profile.hospitalStatus = "rejected";
    await profile.save();

    await User.findByIdAndUpdate(req.params.id, { active: false });

    res.status(200).json({ message: "Hospital rejected" });
  } catch (error) {
    console.error("Reject hospital failed:", error);
    res.status(500).json({ message: "Rejection failed" });
  }
};

export const getHospitals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const profileQuery = {};

    if (status && status !== "all") {
      profileQuery.hospitalStatus = status;
    }

    const profiles = await HospitalProfile.find(profileQuery)
      .populate("userId", "-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await HospitalProfile.countDocuments(profileQuery);

    let hospitals = profiles.map((p) => ({
      ...p.userId.toObject(),
      hospitalStatus: p.hospitalStatus,
    }));

    if (search) {
      hospitals = hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).json({
      hospitals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch hospitals failed:", error);
    res.status(500).json({ message: "Failed to fetch hospitals" });
  }
};

export const addSpecialty = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Specialty name required" });
    }

    const exists = await Specialty.findOne({ name });
    if (exists) {
      return res.status(409).json({ message: "Specialty already exists" });
    }

    const specialty = await Specialty.create({ name, description });
    res.status(201).json(specialty);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const listSpecialties = async (req, res) => {
  const specialties = await Specialty.find().sort({ name: 1 });
  res.json(specialties);
};

export const toggleSpecialty = async (req, res) => {
  const specialty = await Specialty.findById(req.params.id);
  if (!specialty) {
    return res.status(404).json({ message: "Not found" });
  }

  specialty.active = !specialty.active;
  await specialty.save();

  res.json({ active: specialty.active });
};


export const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .sort({ createdAt: -1 })
      .populate("specialtyId", "name")
      .populate("surgeryId", "surgeryName")
      .populate("doctorId", "name")
      .populate("assignedPA", "name");

    res.json(enquiries);
  } catch (error) {
    console.error("Fetch enquiries error:", error);
    res.status(500).json({ message: "Failed to fetch enquiries" });
  }
};

export const getAssistants = async (req, res) => {
  try {
    const assistants = await User.find({ role: "assistant", active: true }).select("name email _id");
    res.json(assistants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assistants" });
  }
};

export const assignPAtoEnquiry = async (req, res) => {
  const { paId } = req.body;

  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) {
    return res.status(404).json({ message: "Enquiry not found" });
  }

  enquiry.assignedPA = paId;
  enquiry.status = "assigned";
  await enquiry.save();

  res.json({ message: "PA assigned successfully" });
};

export const updateEnquiryStatus = async (req, res) => {
  const { status } = req.body;

  await Enquiry.findByIdAndUpdate(req.params.id, { status });
  res.json({ message: "Status updated" });
};
