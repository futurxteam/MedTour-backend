import Surgery from "../models/Surgery.js";
import User from "../models/User.js";
import Enquiry from "../models/Enquiry.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Country from "../models/Country.js";
import City from "../models/City.js";

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
        } = req.body;

        if (otp !== "123") {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const enquiryData = {
            patientName,
            phone,
            contactMode,
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
        const surgeries = await Surgery.find({ active: true })
            .populate("specialization", "name")
            .select("surgeryName specialization")
            .lean();

        const grouped = surgeries.reduce((acc, s) => {
            if (!s.specialization?.name) return acc;

            const specName = s.specialization.name;
            const specId = s.specialization._id;

            if (!acc[specName]) {
                acc[specName] = {
                    _id: specId,
                    surgeries: []
                };
            }

            // Avoid duplicate surgery names in the summary list
            const alreadyExists = acc[specName].surgeries.find(item => item.name === s.surgeryName);
            if (!alreadyExists) {
                acc[specName].surgeries.push({
                    id: s._id,
                    name: s.surgeryName
                });
            }

            return acc;
        }, {});

        res.json(grouped);
    } catch (err) {
        console.error("Public menu error:", err);
        res.status(500).json({ message: "Failed to load surgeries" });
    }
};

export const getPublicSurgeriesBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;

        // Fetch all surgeries for this specialty
        const surgeries = await Surgery.find({
            specialization: specialtyId,
            active: true,
        })
            .populate("specialization", "name")
            .select("_id surgeryName description duration cost specialization");

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

        const doctors = await User.find({
            _id: { $in: surgery.assignedDoctors },
            role: "doctor",
            active: true,
        }).select("_id name email");

        res.json({ doctors });
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
        const surgeries = await Surgery.find({
            active: true,
            surgeryName: searchRegex
        })
            .populate("specialization", "name")
            .select("_id surgeryName description duration specialization")
            .limit(10)
            .lean();

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
            .select("userId hospitalId specializations")
            .lean();

        // Enrich doctor data with profile info
        const doctors = doctorUsers.map(doc => {
            const profile = doctorProfiles.find(p => p.userId.toString() === doc._id.toString());
            return {
                _id: doc._id,
                name: doc.name,
                email: doc.email,
                hospitalId: profile?.hospitalId?._id,
                hospitalName: profile?.hospitalId?.name
            };
        });

        // Search Hospitals (approved only)
        const hospitalUsers = await User.find({
            role: "hospital",
            active: true,
            name: searchRegex
        })
            .select("_id name email")
            .limit(10)
            .lean();

        const hospitalIds = hospitalUsers.map(h => h._id);
        const hospitalProfiles = await HospitalProfile.find({
            userId: { $in: hospitalIds },
            hospitalStatus: "approved"
        })
            .select("userId hospitalName city state description")
            .lean();

        // Enrich hospital data with profile info
        const hospitals = hospitalUsers
            .map(hosp => {
                const profile = hospitalProfiles.find(p => p.userId.toString() === hosp._id.toString());
                if (!profile) return null; // Only return approved hospitals
                return {
                    _id: hosp._id,
                    name: profile.hospitalName || hosp.name,
                    city: profile.city,
                    state: profile.state,
                    description: profile.description
                };
            })
            .filter(Boolean); // Remove null entries

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
            .select("name code hasCities")
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
