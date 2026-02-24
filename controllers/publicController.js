import Surgery from "../models/Surgery.js";
import User from "../models/User.js";
import Enquiry from "../models/Enquiry.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Country from "../models/Country.js";
import City from "../models/City.js";
import Specialty from "../models/Speciality.js";
import GlobalSurgery from "../models/GlobalSurgery.js";

export const verifyOtpAndCreateEnquiry = async (req, res) => {
    try {
        const {
            patientName,
            phone,
            otp,
            contactMode,
            specialtyId,
            surgeryId,
            doctorId,
            source,
            country,
            city,
            medicalProblem,
            ageOrDob,
            consultationDate,
        } = req.body;

        if (otp !== "123") {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const enquiryData = {
            patientName,
            phone,
            contactMode: contactMode || "call",
            otpVerified: true,
            source: source || "services",
        };

        // Add service-specific fields if provided
        if (specialtyId) enquiryData.specialtyId = specialtyId;
        if (surgeryId) enquiryData.surgeryId = surgeryId;
        if (doctorId) enquiryData.doctorId = doctorId;

        // Add homepage-specific fields if provided
        if (country) enquiryData.country = country;
        if (city) enquiryData.city = city;
        if (medicalProblem) enquiryData.medicalProblem = medicalProblem;
        if (ageOrDob) enquiryData.ageOrDob = ageOrDob;
        if (consultationDate) enquiryData.consultationDate = consultationDate;

        const enquiry = await Enquiry.create(enquiryData);

        res.status(201).json({
            message: "Enquiry created successfully",
            enquiryId: enquiry._id,
        });
    } catch (error) {
        console.error("Create enquiry error:", error);
        res.status(500).json({ message: "Failed to create enquiry" });
    }
};

// publicController.js
export const sendEnquiryOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone number required" });
        }

        // DEV MODE OTP
        console.log("DEV OTP for", phone, "is 123");

        res.json({
            message: "OTP sent successfully",
            otp: "123", // optional: remove later
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to send OTP" });
    }
};


export const getSurgeriesMenu = async (req, res) => {
    try {
        // 1. Fetch all active specializations
        const specializations = await Specialty.find({ active: true }).sort({ name: 1 }).lean();

        // 2. Fetch all active surgeries
        const surgeries = await Surgery.find({ active: true })
            .populate("specialization", "name")
            .select("surgeryName specialization")
            .lean();

        // 3. Initialize grouped object with all active specializations
        // This ensures newly added specializations (with no surgeries yet) appear.
        const grouped = {};
        specializations.forEach(spec => {
            grouped[spec.name] = {
                _id: spec._id,
                surgeries: []
            };
        });

        // 4. Fill in the surgeries for these specializations
        surgeries.forEach(s => {
            if (!s.specialization?.name) return;

            const specName = s.specialization.name;

            // Only add if it's an active specialization (already in grouped)
            if (grouped[specName]) {
                const alreadyExists = grouped[specName].surgeries.find(item => item.name === s.surgeryName);
                if (!alreadyExists) {
                    grouped[specName].surgeries.push({
                        id: s._id,
                        name: s.surgeryName
                    });
                }
            }
        });

        res.json(grouped);
    } catch (err) {
        console.error("Public menu error:", err);
        res.status(500).json({ message: "Failed to load surgeries" });
    }
};

export const getPublicSurgeriesBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;

        // Verify the specialization exists and is active
        const specialty = await Specialty.findOne({ _id: specialtyId, active: true });
        if (!specialty) {
            return res.status(404).json({ message: "Specialization not found or inactive" });
        }

        // Fetch all surgeries for this specialty
        const surgeries = await Surgery.find({
            specialization: specialtyId,
            active: true,
        })
            .populate("specialization", "name")
            .populate("globalSurgeryId", "minimumCost")
            .select("_id surgeryName description duration cost specialization globalSurgeryId");

        res.json({ surgeries });
    } catch (err) {
        console.error("Fetch specialty surgeries error:", err);
        res.status(500).json({ message: "Failed to fetch surgeries" });
    }
};

export const getPublicDoctorsBySurgery = async (req, res) => {
    try {
        const { surgeryId } = req.params;

        const surgery = await Surgery.findOne({
            _id: surgeryId,
            active: true,
        });

        if (!surgery) {
            return res.status(404).json({ message: "Surgery not found" });
        }

        const doctorUsers = await User.find({
            _id: { $in: surgery.assignedDoctors },
            role: "doctor",
            active: true,
        }).select("_id name email").lean();

        const doctorIds = doctorUsers.map(d => d._id);
        const profiles = await DoctorProfile.find({
            userId: { $in: doctorIds }
        }).lean();

        const enrichedDoctors = doctorUsers.map(doc => {
            const profile = profiles.find(p => p.userId.toString() === doc._id.toString());
            return {
                ...doc,
                designation: profile?.designation || "Specialist Surgeon",
                about: profile?.about || "",
                experience: profile?.experience || 0,
                consultationFee: profile?.consultationFee || 0,
                qualifications: profile?.qualifications || "",
                specializations: profile?.specializations || [],
                hasPhoto: !!profile?.profilePhoto?.data
            };
        });

        res.json({ doctors: enrichedDoctors });
    } catch (err) {
        console.error("Fetch surgery doctors error:", err);
        res.status(500).json({ message: "Failed to fetch doctors" });
    }
};

/**
 * Global Search API
 * Searches across doctors, surgeries, and hospitals
 * Returns structured results grouped by type
 */
export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                doctors: [],
                surgeries: [],
                hospitals: []
            });
        }

        const searchRegex = new RegExp(q.trim(), "i"); // case-insensitive

        // Search Surgeries (active only)
        const surgeriesRaw = await Surgery.find({
            active: true,
            surgeryName: searchRegex
        })
            .populate({
                path: "specialization",
                match: { active: true },
                select: "name active"
            })
            .select("_id surgeryName description duration specialization")
            .limit(20) // Fetch more to allow filtering
            .lean();

        // Filter out surgeries with inactive or missing specialization
        const surgeries = surgeriesRaw
            .filter(s => s.specialization && s.specialization.active !== false)
            .slice(0, 10);

        // Search Doctors (active only)
        const doctorUsers = await User.find({
            role: "doctor",
            active: true,
            name: searchRegex
        })
            .select("_id name email")
            .limit(10)
            .lean();

        // Get doctor profiles to check if they're assigned to surgeries
        const doctorIds = doctorUsers.map(d => d._id);
        const doctorProfiles = await DoctorProfile.find({
            userId: { $in: doctorIds }
        })
            .populate("hospitalId", "name")
            .select("userId hospitalId specializations profilePhoto")
            .lean();

        // Enrich doctor data with profile info
        const doctors = doctorUsers.map(doc => {
            const profile = doctorProfiles.find(p => p.userId.toString() === doc._id.toString());
            return {
                _id: doc._id,
                name: doc.name,
                email: doc.email,
                hospitalId: profile?.hospitalId?._id,
                hospitalName: profile?.hospitalId?.name,
                hasPhoto: !!profile?.profilePhoto?.data
            };
        });

        // Search Hospitals (approved only)
        const hospitalProfiles = await HospitalProfile.find({
            hospitalStatus: "approved",
            hospitalName: searchRegex
        })
            .populate("userId", "active")
            .select("_id hospitalName city state description userId")
            .limit(10)
            .lean();

        // Enrich hospital data and filter by active user status
        const hospitals = hospitalProfiles
            .filter(profile => profile.userId && profile.userId.active !== false)
            .map(profile => ({
                _id: profile._id, // Profile ID for public profile link
                name: profile.hospitalName,
                city: profile.city,
                state: profile.state,
                description: profile.description
            }));

        res.json({
            doctors,
            surgeries,
            hospitals
        });

    } catch (err) {
        console.error("Global search error:", err);
        res.status(500).json({ message: "Search failed" });
    }
};

/**
 * Get all countries
 * GET /api/public/countries
 */
export const getCountries = async (req, res) => {
    try {
        const countries = await Country.find()
            .select("name code hasCities phoneCode")
            .sort({ name: 1 })
            .lean();

        res.json({ countries });
    } catch (err) {
        console.error("Get countries error:", err);
        res.status(500).json({ message: "Failed to fetch countries" });
    }
};

/**
 * Get cities by country code
 * GET /api/public/cities?country=IN
 */
export const getCities = async (req, res) => {
    try {
        const { country } = req.query;

        if (!country) {
            return res.status(400).json({ message: "Country code is required" });
        }

        const cities = await City.find({ countryCode: country.toUpperCase() })
            .select("name")
            .sort({ name: 1 })
            .lean();

        res.json({ cities });
    } catch (err) {
        console.error("Get cities error:", err);
        res.status(500).json({ message: "Failed to fetch cities" });
    }
};

/**
 * GET /api/public/lowest-quotes
 * Fetch top lowest priced surgeries
 */
export const getLowestQuotes = async (req, res) => {
    try {
        const lowestQuotes = await GlobalSurgery.find({ active: true })
            .populate("specialization", "name")
            .sort({ minimumCost: 1 })
            .limit(6)
            .lean();

        res.json({ lowestQuotes });
    } catch (err) {
        console.error("Lowest quotes error:", err);
        res.status(500).json({ message: "Failed to fetch lowest quotes" });
    }
};

/**
 * GET /api/public/common-procedures
 * Fetch common procedures (from GlobalSurgery)
 */
export const getCommonProcedures = async (req, res) => {
    try {
        // For demo, we just return top 8 active global surgeries
        const commonProcedures = await GlobalSurgery.find({ active: true })
            .populate("specialization", "name")
            .limit(8)
            .lean();

        res.json({ commonProcedures });
    } catch (err) {
        console.error("Common procedures error:", err);
        res.status(500).json({ message: "Failed to fetch common procedures" });
    }
};

/**
 * GET /api/public/hospitals
 * Fetch all approved hospitals
 */
export const getPublicHospitals = async (req, res) => {
    try {
        const hospitals = await HospitalProfile.find({
            hospitalStatus: "approved"
        })
            .populate("specialties", "name")
            .populate({
                path: "doctors",
                populate: {
                    path: "userId",
                    select: "name active",
                    match: { active: true } // 🔥 ONLY ACTIVE DOCTORS
                }
            })
            .select("hospitalName city country avatar photos specialties doctors")
            .lean();

        // Remove doctors whose user is inactive
        const sanitized = hospitals.map(h => ({
            ...h,
            doctors: (h.doctors || []).filter(d => d.userId)
        }));

        res.json({ hospitals: sanitized });
    } catch (err) {
        console.error("Get public hospitals error:", err);
        res.status(500).json({ message: "Failed to fetch hospitals" });
    }
};

/**
 * GET /api/public/hospitals/:id
 * Fetch detailed hospital info
 */
export const getPublicHospitalById = async (req, res) => {
    try {
        const hospital = await HospitalProfile.findById(req.params.id)
            .populate("specialties", "name")
            .populate({
                path: "doctors",
                populate: {
                    path: "userId",
                    select: "name email active",
                    match: { active: true } // 🔥 FILTER HERE
                }
            })
            .lean();

        if (!hospital || hospital.hospitalStatus !== "approved") {
            return res.status(404).json({ message: "Hospital not found" });
        }

        const doctors = (hospital.doctors || [])
            .filter(d => d.userId) // remove inactive
            .map(d => ({
                _id: d.userId._id,
                name: d.userId.name,
                designation: d.designation,
                specializations: d.specializations,
                experience: d.experience,
                hasPhoto: !!d.profilePhoto?.data
            }));

        res.json({
            ...hospital,
            doctors
        });
    } catch (err) {
        console.error("Get public hospital detail error:", err);
        res.status(500).json({ message: "Failed to fetch hospital details" });
    }
};

// GET /api/public/doctors/:id
export const getPublicDoctorById = async (req, res) => {
    try {
        const doctorUser = await User.findOne({
            _id: req.params.id,
            role: "doctor",
            active: true
        }).select("_id name email");

        if (!doctorUser) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        const profile = await DoctorProfile.findOne({
            userId: doctorUser._id
        }).lean();

        res.json({
            doctor: {
                _id: doctorUser._id,
                name: doctorUser.name,
                email: doctorUser.email,
                designation: profile?.designation || "",
                experience: profile?.experience || 0,
                about: profile?.about || "",
                qualifications: profile?.qualifications || "",
                consultationFee: profile?.consultationFee || 0,
                hasPhoto: !!profile?.profilePhoto?.data
            }
        });
    } catch (err) {
        console.error("Get public doctor error:", err);
        res.status(500).json({ message: "Failed to fetch doctor" });
    }
};