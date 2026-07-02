import bcrypt from "bcryptjs";
import User from "../models/User.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Specialty from "../models/Speciality.js";
import Enquiry from "../models/Enquiry.js";
import GlobalSurgery from "../models/GlobalSurgery.js";
import ServicePackage from "../models/ServicePackage.js";
import { v2 as cloudinary } from "cloudinary";

/**
 * Ensures Admin UI always receives English strings.
 */
function toEnglish(field) {
  if (!field) return "";
  if (typeof field === "object") return field.en || "";
  return field;
}


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
        .sort({ createdAt: -1 })
        .lean(),

      User.countDocuments(query),
    ]);

    const cleanUsers = users.map(u => ({
      ...u,
      name: toEnglish(u.name)
    }));

    res.status(200).json({
      users: cleanUsers,
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
      name: { en: email.split("@")[0], ar: "" },
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
  }).populate("userId", "-password").lean();

  res.json(
    profiles.map((p) => ({
      ...p.userId,
      name: toEnglish(p.userId?.name),
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
    }).populate("userId", "-password").lean();

    res.status(200).json(
      profiles.map((p) => ({
        ...p.userId,
        name: toEnglish(p.userId?.name),
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
      .populate("specialties", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await HospitalProfile.countDocuments(profileQuery);

    let hospitals = profiles.map((p) => ({
      ...p,
      ...p.userId,
      name: toEnglish(p.userId?.name),
      hospitalName: toEnglish(p.hospitalName),
      city: toEnglish(p.city),
      country: toEnglish(p.country),
      description: toEnglish(p.description),
      specialties: (p.specialties || []).map(s => ({
        ...s,
        name: toEnglish(s.name)
      })),
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

export const adminUpdateHospital = async (req, res) => {
  try {
    const { userId } = req.params;
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
      { userId },
      {
        hospitalName: { en: toEnglish(hospitalName), ar: req.body.hospitalName_ar || "" },
        description: { en: toEnglish(description), ar: req.body.description_ar || "" },
        address: { en: toEnglish(address), ar: req.body.address_ar || "" },
        city: { en: toEnglish(city), ar: req.body.city_ar || "" },
        state: { en: toEnglish(state), ar: req.body.state_ar || "" },
        country: { en: toEnglish(country), ar: req.body.country_ar || "" },
        phone,
        specialties,
        avatar,
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Hospital profile updated by admin",
      profile
    });
  } catch (err) {
    console.error("Admin update hospital profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminAddHospital = async (req, res) => {
  try {
    const {
      email,
      password,
      hospitalName,
      hospitalName_ar,
      description,
      description_ar,
      address,
      address_ar,
      city,
      city_ar,
      state,
      state_ar,
      country,
      country_ar,
      phone,
      specialties,
      avatar,
    } = req.body;

    if (!email || !password || !hospitalName) {
      return res.status(400).json({ message: "Email, password, and hospital name are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: { en: hospitalName, ar: hospitalName_ar || "" },
      email,
      password: hashedPassword,
      role: "hospital",
      active: true,
    });

    const profile = await HospitalProfile.create({
      userId: user._id,
      hospitalStatus: "approved", // Set to approved to show on homepage
      hospitalName: { en: hospitalName, ar: hospitalName_ar || "" },
      description: { en: description || "", ar: description_ar || "" },
      address: { en: address || "", ar: address_ar || "" },
      city: { en: city || "", ar: city_ar || "" },
      state: { en: state || "", ar: state_ar || "" },
      country: { en: country || "", ar: country_ar || "" },
      phone: phone || "",
      specialties: specialties || [],
      avatar: avatar || "",
      photos: [],
    });

    res.status(201).json({
      message: "Hospital created successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      profile,
    });
  } catch (error) {
    console.error("Admin add hospital error:", error);
    res.status(500).json({ message: error.message || "Failed to add hospital" });
  }
};

export const adminUpdateHospitalSpecialties = async (req, res) => {
  try {
    const { userId } = req.params;
    const { specialties } = req.body;

    if (!Array.isArray(specialties)) {
      return res.status(400).json({ message: "Specialties must be an array" });
    }

    const hospitalProfile = await HospitalProfile.findOne({ userId });

    if (!hospitalProfile) {
      return res.status(404).json({ message: "Hospital profile not found" });
    }

    hospitalProfile.specialties = specialties;
    await hospitalProfile.save();

    res.json({
      message: "Hospital specialties updated successfully",
      profile: hospitalProfile
    });
  } catch (err) {
    console.error("Update hospital specialties error:", err);
    res.status(500).json({ message: "Failed to update specialties" });
  }
};

export const adminUploadHospitalPhotos = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const hospitalProfile = await HospitalProfile.findOne({ userId });
    if (!hospitalProfile) return res.status(404).json({ message: "Hospital profile not found" });

    const newPhotos = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));

    hospitalProfile.photos.push(...newPhotos);
    await hospitalProfile.save();

    res.json({
      message: "Photos uploaded successfully by admin",
      photos: hospitalProfile.photos
    });
  } catch (err) {
    console.error("Admin upload hospital photos error:", err);
    res.status(500).json({ message: "Failed to upload photos" });
  }
};

export const adminRemoveHospitalPhoto = async (req, res) => {
  try {
    const { userId, publicId } = req.params;
    const hospitalProfile = await HospitalProfile.findOne({ userId });
    if (!hospitalProfile) return res.status(404).json({ message: "Hospital profile not found" });

    // Remove from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Remove from DB
    hospitalProfile.photos = hospitalProfile.photos.filter(p => p.publicId !== publicId);
    await hospitalProfile.save();

    res.json({
      message: "Photo removed successfully by admin",
      photos: hospitalProfile.photos
    });
  } catch (err) {
    console.error("Admin remove hospital photo error:", err);
    res.status(500).json({ message: "Failed to remove photo" });
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

    const specialty = await Specialty.create({
      name: { en: name, ar: req.body.name_ar || "" },
      description: { en: description, ar: req.body.description_ar || "" }
    });
    res.status(201).json(specialty);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const listSpecialties = async (req, res) => {
  const specialties = await Specialty.find({
    active: true
  }).lean();
  const localized = specialties.map(s => ({
    ...s,
    name: toEnglish(s.name),
    description: toEnglish(s.description)
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json(localized);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const [enquiries, total] = await Promise.all([
      Enquiry.find()
        .sort({ createdAt: -1 })
        .populate("specialtyId", "name")
        .populate("surgeryId", "surgeryName")
        .populate("doctorId", "name")
        .populate("assignedPA", "name")
        .populate("hospitalProfileId", "hospitalName city")
        .skip(skip)
        .limit(limit)
        .lean(),
      Enquiry.countDocuments(),
    ]);

    const cleanEnquiries = enquiries.map(e => ({
      ...e,
      patientName: toEnglish(e.patientName),
      specialtyId: e.specialtyId ? { ...e.specialtyId, name: toEnglish(e.specialtyId.name) } : null,
      surgeryId: e.surgeryId ? { ...e.surgeryId, surgeryName: toEnglish(e.surgeryId.surgeryName) } : null,
      doctorId: e.doctorId ? { ...e.doctorId, name: toEnglish(e.doctorId.name) } : null,
      assignedPA: e.assignedPA ? { ...e.assignedPA, name: toEnglish(e.assignedPA.name) } : null,
      hospitalProfileId: e.hospitalProfileId ? {
        ...e.hospitalProfileId,
        hospitalName: toEnglish(e.hospitalProfileId.hospitalName),
        city: toEnglish(e.hospitalProfileId.city)
      } : null,
    }));

    res.json({
      enquiries: cleanEnquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch enquiries error:", error);
    res.status(500).json({ message: "Failed to fetch enquiries" });
  }
};

export const getAssistants = async (req, res) => {
  try {
    const assistants = await User.find({ role: "assistant", active: true }).select("name email _id").lean();
    const cleanAssistants = assistants.map(a => ({
      ...a,
      name: toEnglish(a.name)
    }));
    res.json(cleanAssistants);
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

/* =====================================================
   GLOBAL SURGERY REGISTRY
===================================================== */
export const listGlobalSurgeries = async (req, res) => {
  try {
    const surgeries = await GlobalSurgery.find()
      .populate("specialization", "name")
      .lean();

    const localized = surgeries.map(s => ({
      ...s,
      surgeryName: toEnglish(s.surgeryName),
      description: toEnglish(s.description),
      specialization: s.specialization ? {
        ...s.specialization,
        name: toEnglish(s.specialization.name)
      } : null
    })).sort((a, b) => a.surgeryName.localeCompare(b.surgeryName));

    res.json(localized);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch global surgeries" });
  }
};

export const addGlobalSurgery = async (req, res) => {
  try {
    const { surgeryName, specialization, description, duration, minimumCost } = req.body;

    if (!surgeryName || !specialization || !minimumCost) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await GlobalSurgery.findOne({ surgeryName: { $regex: new RegExp(`^${surgeryName}$`, "i") } });
    if (exists) {
      return res.status(409).json({ message: "Surgery name already exists" });
    }

    const surgery = await GlobalSurgery.create({
      surgeryName: { en: surgeryName, ar: req.body.surgeryName_ar || "" },
      specialization,
      description: { en: description, ar: req.body.description_ar || "" },
      duration,
      minimumCost,
    });

    res.status(201).json(surgery);
  } catch (error) {
    console.error("Add global surgery error:", error);
    res.status(500).json({ message: "Failed to add global surgery" });
  }
};

export const toggleGlobalSurgeryStatus = async (req, res) => {
  try {
    const surgery = await GlobalSurgery.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: "Surgery not found" });

    surgery.active = !surgery.active;
    await surgery.save();
    res.json({ active: surgery.active });
  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }
};

export const updateGlobalSurgery = async (req, res) => {
  try {
    const { surgeryName, specialization, description, duration, minimumCost, active } = req.body;
    const surgery = await GlobalSurgery.findByIdAndUpdate(
      req.params.id,
      {
        surgeryName: typeof surgeryName === "object" ? surgeryName : { en: surgeryName, ar: req.body.surgeryName_ar || "" },
        specialization,
        description: typeof description === "object" ? description : { en: description, ar: req.body.description_ar || "" },
        duration,
        minimumCost,
        active
      },
      { new: true }
    );

    if (!surgery) return res.status(404).json({ message: "Surgery not found" });
    res.json(surgery);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

/* =====================================================
   SERVICE PACKAGES – ADMIN
===================================================== */

export const createServicePackage = async (req, res) => {
  try {
    const { name, type, language, place, description, price, currency } = req.body;

    if (!name || !type || price === undefined) {
      return res.status(400).json({ message: "name, type, and price are required" });
    }

    if (!["translator", "tourism"].includes(type)) {
      return res.status(400).json({ message: "type must be 'translator' or 'tourism'" });
    }

    if (type === "translator") {
      if (!language || !["english", "arabic"].includes(language)) {
        return res.status(400).json({
          message: "Translator packages require a valid language (english | arabic)",
        });
      }
    }

    if (type === "tourism") {
      if (!place) {
        return res.status(400).json({ message: "Tourism packages require a place name" });
      }
    }

    const pkg = await ServicePackage.create({
      name,
      type,
      language: type === "translator" ? language : undefined,
      place: type === "tourism" ? place : undefined,
      description,
      price,
      currency: currency || "USD",
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error("Create service package error:", error);
    res.status(500).json({ message: "Failed to create service package" });
  }
};

export const listServicePackages = async (req, res) => {
  try {
    const packages = await ServicePackage.find().sort({ createdAt: -1 }).lean();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch service packages" });
  }
};

export const toggleServicePackage = async (req, res) => {
  try {
    const pkg = await ServicePackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    pkg.active = !pkg.active;
    await pkg.save();

    res.json({ active: pkg.active });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle package status" });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalHospitals, pendingRequests, pendingHospitals] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      HospitalProfile.countDocuments({ hospitalStatus: "approved" }),
      Enquiry.countDocuments({ assignedPA: null }),
      HospitalProfile.countDocuments({ hospitalStatus: "pending" }),
    ]);

    res.json({
      totalUsers,
      totalHospitals,
      pendingRequests,
      pendingHospitalsCount: pendingHospitals,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
