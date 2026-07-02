import Surgery from "../models/Surgery.js";
import User from "../models/User.js";
import Enquiry from "../models/Enquiry.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import Country from "../models/Country.js";
import City from "../models/City.js";
import Specialty from "../models/Speciality.js";
import GlobalSurgery from "../models/GlobalSurgery.js";
import getLocalized from "../utils/localize.js";
import { sendOTP, verifyOTP, normalizePhone } from "../services/otpService.js";

/**
 * Single source of truth for the OTP development bypass.
 * Set USE_TEST_OTP=true in .env to skip Twilio during development.
 * Set USE_TEST_OTP=false (or remove the line) to use Twilio in production.
 */
const USE_TEST_OTP = process.env.USE_TEST_OTP === "true";

/**
 * POST /api/public/enquiry/send-otp
 * Send OTP. In dev (USE_TEST_OTP=true) this is a no-op — returns success immediately.
 * In production it calls Twilio Verify SMS.
 */
export const sendEnquiryOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // ── DEVELOPMENT BYPASS ──────────────────────────────────────────
        if (USE_TEST_OTP) {
            console.log(`[DEV] sendEnquiryOtp: skipping Twilio for ${phone}`);

            // Still normalize to catch obviously malformed numbers
            const e164Phone = normalizePhone(phone);
            if (!e164Phone) {
                return res.status(400).json({ message: "Invalid phone number. Please check the code and digits." });
            }

            return res.status(200).json({
                message: "Development OTP sent successfully",
                phone: e164Phone,
            });
        }
        // ── PRODUCTION: REAL TWILIO SMS ──────────────────────────────────

        console.log(`[PROD] sendEnquiryOtp: sending OTP via Twilio to ${phone}`);
        const result = await sendOTP(phone);

        return res.status(200).json({
            message: "OTP sent successfully",
            phone: result.phone,
        });

    } catch (error) {
        console.error("sendEnquiryOtp ERROR:", {
            message: error.message,
            code: error.code,
            status: error.status,
            moreInfo: error.moreInfo
        });

        if (error.code === 21614 || error.message?.includes("Invalid phone number")) {
            return res.status(400).json({ message: "Invalid phone number. Please check the code and digits." });
        }
        if (error.code === 20429) {
            return res.status(429).json({ message: "Too many requests. Please wait a minute." });
        }

        return res.status(500).json({ message: error.message || "Failed to send OTP. Technical error." });
    }
};

/**
 * POST /api/public/enquiry/verify-otp
 * Verify OTP then create an Enquiry.
 *
 * Dev mode  (USE_TEST_OTP=true):  accepts OTP "123" — no Twilio call.
 * Prod mode (USE_TEST_OTP=false): delegates to Twilio Verify.
 *
 * Shared by both Doctor Booking (source=doctor_direct)
 * and Homepage Enquiry (source=homepage).
 */
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
            hospitalProfileId,
            source,
            country,
            city,
            medicalProblem,
            ageOrDob,
            consultationDate,
        } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: "Phone and OTP are required" });
        }

        console.log(`[${source || "enquiry"}] verifyOtpAndCreateEnquiry received | phone: ${phone} | source: ${source}`);

        // ── OTP VERIFICATION ────────────────────────────────────────────
        if (USE_TEST_OTP) {
            console.log(`[DEV] Development OTP accepted for ${phone}`);
            if (otp !== "123") {
                return res.status(400).json({ message: "Invalid OTP. Use 123 during development." });
            }
        } else {
            console.log(`[PROD] Verifying OTP via Twilio for ${phone}`);
            const verification = await verifyOTP(phone, otp);
            if (!verification.valid) {
                return res.status(400).json({ message: "Invalid or expired OTP. Please try again." });
            }
        }

        // ── DUPLICATE BOOKING GUARD ─────────────────────────────────────
        // Prevent double-click / accidental re-submission within the last 5 minutes
        if (doctorId && consultationDate) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const duplicate = await Enquiry.findOne({
                phone: normalizePhone(phone),
                doctorId,
                consultationDate,
                createdAt: { $gte: fiveMinutesAgo },
            });
            if (duplicate) {
                console.warn(`[${source}] Duplicate booking detected for doctor ${doctorId} on ${consultationDate}`);
                return res.status(409).json({ message: "A booking already exists for this appointment." });
            }
        }

        // ── CREATE ENQUIRY ───────────────────────────────────────────────
        const e164Phone = normalizePhone(phone);

        const enquiryData = {
            patientName,
            phone: e164Phone,
            contactMode: contactMode || "call",
            otpVerified: true,
            source: source || "services",
        };

        // Service-specific fields
        if (specialtyId) enquiryData.specialtyId = specialtyId;
        if (surgeryId) enquiryData.surgeryId = surgeryId;
        if (doctorId) enquiryData.doctorId = doctorId;
        if (hospitalProfileId) enquiryData.hospitalProfileId = hospitalProfileId;

        // Homepage / booking-specific fields
        if (country) enquiryData.country = country;
        if (city) enquiryData.city = city;
        if (medicalProblem) enquiryData.medicalProblem = medicalProblem;
        if (ageOrDob) enquiryData.ageOrDob = ageOrDob;
        if (consultationDate) enquiryData.consultationDate = consultationDate;

        console.log(`[${source || "enquiry"}] Creating enquiry...`);
        const enquiry = await Enquiry.create(enquiryData);
        console.log(`[${source || "enquiry"}] Enquiry created successfully | id: ${enquiry._id}`);

        return res.status(201).json({
            message: "Enquiry created successfully",
            enquiryId: enquiry._id,
        });

    } catch (error) {
        console.error("verifyOtpAndCreateEnquiry error:", error);

        if (error.code === 20404) {
            return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
        }

        return res.status(500).json({ message: "Booking could not be created. Please try again." });
    }
};


export const getSurgeriesMenu = async (req, res) => {
    try {
        const lang = req.query.lang || "en";

        // Step 1: Fetch all active Global Surgeries, populate only active specializations
        const globalSurgeries = await GlobalSurgery.find({ active: true })
            .populate({
                path: "specialization",
                match: { active: true },
            })
            .lean();

        // Step 2: Build the grouped menu from the Global Surgery registry
        const grouped = {};

        globalSurgeries.forEach((gs) => {
            // Skip if specialization is inactive (populate returns null when match fails)
            if (!gs.specialization) return;

            const spec = gs.specialization;
            const specName = getLocalized(spec.name, lang);
            const surgeryName = getLocalized(gs.surgeryName, lang);

            if (!grouped[specName]) {
                grouped[specName] = {
                    _id: spec._id,
                    surgeries: [],
                };
            }

            // Guard against duplicates
            const exists = grouped[specName].surgeries.some(
                (item) => item.id.toString() === gs._id.toString()
            );

            if (!exists) {
                grouped[specName].surgeries.push({
                    id: gs._id,
                    name: surgeryName,
                });
            }
        });

        // Step 3: Sort specialties alphabetically, and surgeries alphabetically within each
        const sorted = {};
        Object.keys(grouped)
            .sort((a, b) => a.localeCompare(b))
            .forEach((specName) => {
                sorted[specName] = {
                    _id: grouped[specName]._id,
                    surgeries: grouped[specName].surgeries.sort((a, b) =>
                        a.name.localeCompare(b.name)
                    ),
                };
            });

        res.json(sorted);
    } catch (err) {
        console.error("Public menu error:", err);
        res.status(500).json({
            message: "Failed to load surgeries",
        });
    }
};

/**
 * GET /api/public/specialties/:specialtyId/public-surgeries
 * Returns all active GlobalSurgeries for a given specialization.
 * Source of truth is GlobalSurgery (catalog-driven, not hospital-dependent).
 */
export const getPublicSurgeriesBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;
        const lang = req.query.lang || "en";

        // Verify the specialization exists and is active
        const specialty = await Specialty.findOne({ _id: specialtyId, active: true });
        if (!specialty) {
            return res.status(404).json({ message: "Specialization not found or inactive" });
        }

        // Query GlobalSurgery directly — no dependency on hospital Surgery collection
        const globalSurgeries = await GlobalSurgery.find({
            specialization: specialtyId,
            active: true,
        })
            .populate({
                path: "specialization",
                match: { active: true },
            })
            .lean();

        // Map to a shape compatible with the existing frontend
        const localizedSurgeries = globalSurgeries
            .filter(gs => gs.specialization) // drop if specialty became inactive
            .map(gs => ({
                _id: gs._id,
                surgeryName: getLocalized(gs.surgeryName, lang),
                description: getLocalized(gs.description, lang),
                // Frontend reads surgery.globalSurgeryId?.minimumCost — expose cost at top level too
                minimumCost: gs.minimumCost,
                cost: gs.minimumCost,
                // duration is not on GlobalSurgery; omit gracefully
                duration: null,
                specialization: {
                    _id: gs.specialization._id,
                    name: getLocalized(gs.specialization.name, lang),
                },
            }))
            .sort((a, b) => a.surgeryName.localeCompare(b.surgeryName));

        res.json({ surgeries: localizedSurgeries });
    } catch (err) {
        console.error("Fetch specialty surgeries error:", err);
        res.status(500).json({ message: "Failed to fetch surgeries" });
    }
};

/**
 * GET /api/public/surgeries
 * Localized Global Surgeries
 */
export const getSurgeries = async (req, res) => {
    try {
        const lang = req.query.lang || "en";
        console.log("LANG:", lang);

        const surgeries = await GlobalSurgery.find({ active: true })
            .populate("specialization", "name")
            .lean();

        if (surgeries.length > 0) {
            console.log("DATA (sample):", JSON.stringify(surgeries[0], null, 2));
        }

        const localizedData = surgeries.map(s => ({
            _id: s._id,
            surgeryName: getLocalized(s.surgeryName, lang),
            description: getLocalized(s.description, lang),
            minimumCost: s.minimumCost,

            specialization: {
                _id: s.specialization?._id,
                name: getLocalized(s.specialization?.name, lang)
            }
        }));

        res.json(localizedData);

    } catch (error) {
        console.error("Error fetching surgeries:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/public/surgeries/:surgeryId/public-doctors
 * Specialization-driven doctor discovery.
 *
 * :surgeryId is a GlobalSurgery._id.
 * Returns every enabled doctor whose specializations[] contains
 * the surgery's specialization, across all approved active hospitals.
 * Does NOT read Surgery.assignedDoctors.
 */
export const getPublicDoctorsBySurgery = async (req, res) => {
    try {
        const { surgeryId } = req.params;
        const lang = req.query.lang || "en";

        // Step 1: Resolve the GlobalSurgery and its specialization
        const globalSurgery = await GlobalSurgery.findOne({
            _id: surgeryId,
            active: true,
        }).populate({
            path: "specialization",
            match: { active: true },
        }).lean();

        if (!globalSurgery) {
            return res.status(404).json({ message: "Surgery not found" });
        }

        if (!globalSurgery.specialization) {
            // Specialization is inactive — no doctors to show
            return res.json({ doctors: [] });
        }

        const specializationId = globalSurgery.specialization._id;

        // Step 2: Find all DoctorProfiles whose specializations[] contains this specialization
        const doctorProfiles = await DoctorProfile.find({
            specializations: specializationId,
        }).lean();

        if (doctorProfiles.length === 0) {
            return res.json({ doctors: [] });
        }

        // Step 3: Filter to doctors whose user account is active
        const doctorUserIds = doctorProfiles.map(p => p.userId);
        const doctorUsers = await User.find({
            _id: { $in: doctorUserIds },
            role: "doctor",
            active: true,
        }).select("_id name email").lean();

        const activeUserIdSet = new Set(doctorUsers.map(u => u._id.toString()));

        // Step 4: Filter to doctors whose hospital is approved and active
        const hospitalUserIds = [...new Set(
            doctorProfiles
                .map(p => p.hospitalId?.toString())
                .filter(Boolean)
        )];

        const approvedHospitals = await HospitalProfile.find({
            userId: { $in: hospitalUserIds },
            hospitalStatus: "approved",
        }).populate({ path: "userId", select: "active", match: { active: true } })
            .select("userId hospitalName city state country")
            .lean();

        // Build a set of approved hospital userIds whose user is also active
        const approvedHospitalUserIdSet = new Set(
            approvedHospitals
                .filter(h => h.userId) // populate match filters out inactive users
                .map(h => h.userId._id.toString())
        );

        // Build a lookup map: hospitalUserId -> HospitalProfile
        const hospitalMap = {};
        for (const h of approvedHospitals) {
            if (h.userId) hospitalMap[h.userId._id.toString()] = h;
        }

        // Step 5: Compose the final doctor list
        const enrichedDoctors = doctorProfiles
            .filter(profile => {
                // Doctor's user account must be active
                if (!activeUserIdSet.has(profile.userId.toString())) return false;
                // Doctor's hospital must be approved and active
                if (!profile.hospitalId) return false;
                if (!approvedHospitalUserIdSet.has(profile.hospitalId.toString())) return false;
                return true;
            })
            .map(profile => {
                const userDoc = doctorUsers.find(u => u._id.toString() === profile.userId.toString());
                const hospital = hospitalMap[profile.hospitalId?.toString()];
                return {
                    _id: userDoc._id,
                    name: getLocalized(userDoc.name, lang),
                    designation: getLocalized(profile.designation, lang) || "Specialist Surgeon",
                    about: getLocalized(profile.about, lang) || "",
                    experience: profile.experience || 0,
                    consultationFee: profile.consultationFee || 0,
                    qualifications: getLocalized(profile.qualifications, lang) || "",
                    specializations: profile.specializations || [],
                    hasPhoto: !!profile.profilePhoto?.data,
                    hospital: hospital ? {
                        _id: hospital._id,
                        name: getLocalized(hospital.hospitalName, lang),
                        city: getLocalized(hospital.city, lang),
                    } : null,
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
 * Supports multilingual search with lang query param
 */
export const globalSearch = async (req, res) => {
    try {
        const { q, lang = "en" } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                doctors: [],
                surgeries: [],
                hospitals: []
            });
        }

        const searchRegex = new RegExp(q.trim(), "i"); // case-insensitive

        // Search Surgeries via GlobalSurgery names (active only)
        // We search GlobalSurgery first, then find matching Surgery records
        const matchingGlobalSurgeries = await GlobalSurgery.find({
            active: true,
            $or: [
                { [`surgeryName.${lang}`]: searchRegex },
                { [`surgeryName.en`]: searchRegex }
            ]
        }).select("_id").lean();

        const globalSurgeryIds = matchingGlobalSurgeries.map(g => g._id);

        const surgeriesRaw = await Surgery.find({
            active: true,
            globalSurgeryId: { $in: globalSurgeryIds }
        })
            .populate({
                path: "specialization",
                match: { active: true },
            })
            .populate({
                path: "globalSurgeryId",
                select: "surgeryName active",
                match: { active: true }
            })
            .select("_id description duration specialization globalSurgeryId")
            .limit(20)
            .lean();

        // Filter out surgeries with inactive or missing specialization
        const surgeries = surgeriesRaw
            .filter(s => s.specialization && s.specialization.active !== false)
            .slice(0, 10)
            .map(s => ({
                _id: s._id,
                surgeryName: getLocalized(s.globalSurgeryId?.surgeryName, lang),
                description: getLocalized(s.description, lang),
                duration: s.duration,
                specialization: s.specialization ? {
                    _id: s.specialization._id,
                    name: getLocalized(s.specialization.name, lang),
                    active: s.specialization.active
                } : null
            }));

        // Search Doctors (active only)
        const doctorUsers = await User.find({
            role: "doctor",
            active: true,
            $or: [
                { [`name.${lang}`]: searchRegex },
                { [`name.en`]: searchRegex },
                // fallback for un-migrated plain string names
                ...(lang !== "en" ? [{ name: searchRegex }] : [])
            ]
        })
            .select("_id name email")
            .limit(10)
            .lean();

        // Get doctor profiles
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
                name: getLocalized(doc.name, lang),
                email: doc.email,
                hospitalId: profile?.hospitalId?._id,
                hospitalName: getLocalized(profile?.hospitalId?.name, lang),
                hasPhoto: !!profile?.profilePhoto?.data
            };
        });

        // Search Hospitals (approved only)
        const hospitalProfiles = await HospitalProfile.find({
            hospitalStatus: "approved",
            $or: [
                { [`hospitalName.${lang}`]: searchRegex },
                { [`hospitalName.en`]: searchRegex }
            ]
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
                name: getLocalized(profile.hospitalName, lang),
                city: getLocalized(profile.city, lang),
                state: getLocalized(profile.state, lang),
                description: getLocalized(profile.description, lang)
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
        const lang = req.query.lang || "en";
        const countries = await Country.find()
            .select("name code hasCities phoneCode")
            .lean();

        const localized = countries.map(c => ({
            ...c,
            name: getLocalized(c.name, lang)
        })).sort((a, b) => a.name.localeCompare(b.name));

        res.json({ countries: localized });
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
        const lang = req.query.lang || "en";

        if (!country) return res.json({ cities: [] });

        const cities = await City.find({ countryCode: country.toUpperCase() })
            .select("name")
            .lean();

        const localized = cities.map(c => ({
            ...c,
            name: getLocalized(c.name, lang)
        })).sort((a, b) => a.name.localeCompare(b.name));

        res.json({ cities: localized });
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
        const lang = req.query.lang || "en";

        const lowestQuotes = await GlobalSurgery.find({ active: true })
            .populate("specialization")
            .sort({ minimumCost: 1 })
            .limit(6)
            .lean();

        const localized = lowestQuotes.map(q => ({
            ...q,
            surgeryName: getLocalized(q.surgeryName, lang),
            description: getLocalized(q.description, lang),
            specialization: q.specialization ? {
                ...q.specialization,
                name: getLocalized(q.specialization.name, lang)
            } : q.specialization
        }));

        res.json({ lowestQuotes: localized });
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
        const lang = req.query.lang || "en";

        const commonProcedures = await GlobalSurgery.find({ active: true })
            .populate("specialization")
            .limit(8)
            .lean();

        const localized = commonProcedures.map(p => ({
            ...p,
            surgeryName: getLocalized(p.surgeryName, lang),
            description: getLocalized(p.description, lang),
            specialization: p.specialization ? {
                ...p.specialization,
                name: getLocalized(p.specialization.name, lang)
            } : p.specialization
        }));

        res.json({ commonProcedures: localized });
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
        const lang = req.query.lang || "en";

        const hospitals = await HospitalProfile.find({
            hospitalStatus: "approved"
        })
            .populate("specialties")
            .populate({
                path: "doctors",
                populate: {
                    path: "userId",
                    select: "name active",
                    match: { active: true }
                }
            })
            .select("hospitalName city country avatar photos specialties doctors")
            .lean();

        // Remove doctors whose user is inactive + localize
        const sanitized = hospitals.map(h => ({
            ...h,
            hospitalName: getLocalized(h.hospitalName, lang),
            city: getLocalized(h.city, lang),
            country: getLocalized(h.country, lang),
            specialties: (h.specialties || []).map(s => ({
                ...s,
                name: getLocalized(s.name, lang)
            })),
            doctors: (h.doctors || []).filter(d => d.userId).map(d => ({
                ...d,
                userId: d.userId ? {
                    ...d.userId,
                    name: getLocalized(d.userId.name, lang)
                } : d.userId
            }))
        }));

        res.json({ hospitals: sanitized });
    } catch (err) {
        console.error("Get public hospitals error:", err);
        res.status(500).json({ message: "Failed to fetch hospitals" });
    }
};

/**
 * GET /api/public/doctors
 * Fetch all active/non-disabled doctors populated with hospital and specialties.
 *
 * NOTE: DoctorProfile.hospitalId is a ref to the hospital *User* (not HospitalProfile).
 * HospitalProfile has its own userId field linking back to that same User.
 * So we manually batch-fetch HospitalProfiles by userId after getting profiles.
 *
 * NOTE 2: Some DoctorProfile.specializations may contain plain strings (not ObjectIds).
 * We skip .populate() and do a safe manual Specialty lookup to avoid CastErrors.
 */
export const getPublicDoctors = async (req, res) => {
    try {
        const lang = req.query.lang || "en";

        // 1. Fetch all active doctor users
        const doctorUsers = await User.find({
            role: "doctor",
            active: true
        }).select("_id name email").lean();

        if (doctorUsers.length === 0) {
            return res.json([]);
        }

        const doctorUserIds = doctorUsers.map(d => d._id);

        // 2. Fetch DoctorProfiles as raw lean (NO populate – avoids CastError on string specializations)
        const profiles = await DoctorProfile.find({
            userId: { $in: doctorUserIds }
        }).lean();

        // 3. Collect all valid ObjectId specialization refs across all profiles
        const validObjectIdPattern = /^[a-f\d]{24}$/i;
        const allSpecIds = [...new Set(
            profiles.flatMap(p =>
                (p.specializations || [])
                    .map(s => s?.toString())
                    .filter(s => s && validObjectIdPattern.test(s))
            )
        )];

        // Batch-fetch Specialty docs for valid IDs
        const specialtyDocs = allSpecIds.length > 0
            ? await Specialty.find({ _id: { $in: allSpecIds } }).select("_id name").lean()
            : [];

        const specialtyMap = {};
        for (const s of specialtyDocs) {
            specialtyMap[s._id.toString()] = s;
        }

        // 4. Batch-fetch HospitalProfiles for the hospital user IDs referenced in profiles
        const hospitalUserIds = [...new Set(
            profiles.map(p => p.hospitalId?.toString()).filter(Boolean)
        )];

        const hospitalProfiles = hospitalUserIds.length > 0
            ? await HospitalProfile.find({ userId: { $in: hospitalUserIds } })
                .select("userId hospitalName city state country")
                .lean()
            : [];

        // Build a lookup map: hospitalUserId -> HospitalProfile
        const hospitalMap = {};
        for (const hp of hospitalProfiles) {
            hospitalMap[hp.userId.toString()] = hp;
        }

        // 5. Map and enrich
        const list = profiles.map(profile => {
            const userDoc = doctorUsers.find(u => u._id.toString() === profile.userId.toString());
            if (!userDoc) return null;

            const hospitalProfile = profile.hospitalId
                ? hospitalMap[profile.hospitalId.toString()]
                : null;

            // Resolve specialties safely
            const specialties = (profile.specializations || []).map(specRef => {
                const specStr = specRef?.toString();
                if (!specStr) return null;

                if (validObjectIdPattern.test(specStr)) {
                    const doc = specialtyMap[specStr];
                    if (!doc) return null;
                    return {
                        _id: doc._id,
                        name: {
                            en: getLocalized(doc.name, "en"),
                            ar: getLocalized(doc.name, "ar")
                        }
                    };
                }

                // It's a plain string name (legacy data)
                return {
                    _id: null,
                    name: { en: specStr, ar: specStr }
                };
            }).filter(Boolean);

            return {
                _id: userDoc._id,
                fullName: getLocalized(userDoc.name, lang),
                designation: getLocalized(profile.designation, lang) || "Specialist",
                experienceYears: profile.experience || 0,
                languages: ["English", "Arabic", "Hindi", "Malayalam"],
                avatar: profile.profilePhoto?.data
                    ? `/api/public/doctor/${userDoc._id}/photo`
                    : null,
                hospital: hospitalProfile ? {
                    _id: hospitalProfile._id,
                    hospitalName: {
                        en: getLocalized(hospitalProfile.hospitalName, "en"),
                        ar: getLocalized(hospitalProfile.hospitalName, "ar")
                    }
                } : null,
                specialties,
                city: hospitalProfile
                    ? getLocalized(hospitalProfile.city, lang)
                    : ""
            };
        }).filter(Boolean);

        res.json(list);
    } catch (err) {
        console.error("Get public doctors error:", err);
        res.status(500).json({ message: "Failed to fetch doctors list" });
    }
};

/**
 * GET /api/public/hospitals/:id
 * Fetch detailed hospital info
 */
export const getPublicHospitalById = async (req, res) => {
    try {
        const lang = req.query.lang || "en";

        const hospital = await HospitalProfile.findById(req.params.id)
            .populate("specialties")
            .populate({
                path: "doctors",
                populate: {
                    path: "userId",
                    select: "name email active",
                    match: { active: true }
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
                name: getLocalized(d.userId.name, lang),
                designation: getLocalized(d.designation, lang),
                specializations: d.specializations,
                experience: d.experience,
                hasPhoto: !!d.profilePhoto?.data
            }));

        res.json({
            ...hospital,
            hospitalName: getLocalized(hospital.hospitalName, lang),
            description: getLocalized(hospital.description, lang),
            address: getLocalized(hospital.address, lang),
            city: getLocalized(hospital.city, lang),
            state: getLocalized(hospital.state, lang),
            country: getLocalized(hospital.country, lang),
            specialties: (hospital.specialties || []).map(s => ({
                ...s,
                name: getLocalized(s.name, lang)
            })),
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
        const lang = req.query.lang || "en";

        const doctorUser = await User.findOne({
            _id: req.params.id,
            role: "doctor",
            active: true
        }).select("_id name email").lean();

        if (!doctorUser) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Fetch profile WITHOUT populating (avoid CastError on string specializations & hospitalId User ref)
        const profile = await DoctorProfile.findOne({
            userId: doctorUser._id
        }).lean();

        // Safely resolve specializations (some may be plain strings, not ObjectIds)
        const validObjectIdPattern = /^[a-f\d]{24}$/i;
        const validSpecIds = (profile?.specializations || [])
            .map(s => s?.toString())
            .filter(s => s && validObjectIdPattern.test(s));

        const specialtyDocs = validSpecIds.length > 0
            ? await Specialty.find({ _id: { $in: validSpecIds } }).select("_id name").lean()
            : [];

        const specMap = {};
        for (const s of specialtyDocs) specMap[s._id.toString()] = s;

        const resolvedSpecialties = (profile?.specializations || []).map(specRef => {
            const specStr = specRef?.toString();
            if (!specStr) return null;
            if (validObjectIdPattern.test(specStr)) {
                const doc = specMap[specStr];
                return doc ? getLocalized(doc.name, lang) : null;
            }
            return specStr; // plain string legacy value
        }).filter(Boolean);

        // Resolve HospitalProfile using hospitalId as a userId lookup
        let hospitalProfile = null;
        if (profile?.hospitalId) {
            hospitalProfile = await HospitalProfile.findOne({
                userId: profile.hospitalId
            })
                .select("userId hospitalName city state country")
                .lean();
        }

        // Find other doctors in the same hospital for related doctors
        let relatedDoctors = [];
        if (profile?.hospitalId) {
            const relatedProfiles = await DoctorProfile.find({
                hospitalId: profile.hospitalId,
                userId: { $ne: doctorUser._id }
            })
                .limit(3)
                .lean();

            const relatedUserIds = relatedProfiles.map(p => p.userId);
            const relatedUsers = await User.find({
                _id: { $in: relatedUserIds },
                role: "doctor",
                active: true
            }).select("_id name").lean();

            relatedDoctors = relatedProfiles.map(p => {
                const u = relatedUsers.find(ru => ru._id.toString() === p.userId.toString());
                if (!u) return null;
                return {
                    _id: u._id,
                    name: getLocalized(u.name, lang),
                    designation: getLocalized(p.designation, lang) || "Consultant",
                    experience: p.experience || 0,
                    hasPhoto: !!p.profilePhoto?.data
                };
            }).filter(Boolean);
        }

        res.json({
            doctor: {
                _id: doctorUser._id,
                name: getLocalized(doctorUser.name, lang),
                email: doctorUser.email,
                designation: getLocalized(profile?.designation, lang) || "Senior Consultant",
                experience: profile?.experience || 10,
                about: getLocalized(profile?.about, lang) || "Highly dedicated specialist providing patient-centric medical treatment with advanced practices.",
                bio: getLocalized(profile?.bio, lang) || getLocalized(profile?.about, lang) || "A leading clinical expert focusing on premium diagnostic, treatment, and surgery protocols.",
                qualifications: getLocalized(profile?.qualifications, lang) || "MBBS, MS, DNB",
                consultationFee: profile?.consultationFee || 500,
                hasPhoto: !!profile?.profilePhoto?.data,
                languages: ["English", "Arabic", "Hindi", "Malayalam"],
                hospital: hospitalProfile ? {
                    _id: hospitalProfile._id,
                    name: getLocalized(hospitalProfile.hospitalName, lang),
                    city: getLocalized(hospitalProfile.city, lang),
                    country: getLocalized(hospitalProfile.country, lang)
                } : null,
                specialties: resolvedSpecialties,
                education: [
                    "Fellowship in Minimal Access Surgery",
                    "Diplomate of National Board (DNB)",
                    "Bachelor of Medicine & Bachelor of Surgery (MBBS)"
                ],
                awards: [
                    "Distinguished Clinical Excellence Award",
                    "Best Patient Care Service Honor"
                ],
                memberships: [
                    "World Federation of Medical Specialists",
                    "National Association of Surgeons"
                ],
                expertise: resolvedSpecialties.map(s => `Advanced ${s} procedures`),
                surgeries: [
                    "Robot-Assisted Surgery",
                    "Minimally Invasive Endoscopy",
                    "Complex Reconstruction"
                ]
            },
            relatedDoctors
        });
    } catch (err) {
        console.error("Get public doctor error:", err);
        res.status(500).json({ message: "Failed to fetch doctor" });
    }
};