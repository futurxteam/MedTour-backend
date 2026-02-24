import express from "express";
import {
    getSurgeriesMenu,
    getPublicSurgeriesBySpecialty,
    getPublicDoctorsBySurgery,
    sendEnquiryOtp,
    verifyOtpAndCreateEnquiry,
    globalSearch,
    getCountries,
    getCities,
    getLowestQuotes,
    getCommonProcedures,
    getPublicHospitals,
    getPublicHospitalById,
    getPublicDoctorById
} from "../controllers/publicController.js";
import { getDoctorPhoto } from "../controllers/hospitalController.js";

const router = express.Router();

router.get("/doctor/:id/photo", getDoctorPhoto);

router.get("/surgeries-menu", getSurgeriesMenu);
router.get(
    "/specialties/:specialtyId/public-surgeries",
    getPublicSurgeriesBySpecialty
);

router.get(
    "/surgeries/:surgeryId/public-doctors",
    getPublicDoctorsBySurgery
);
router.post("/enquiry/send-otp", sendEnquiryOtp);
router.post("/enquiry/verify-otp", verifyOtpAndCreateEnquiry);

// Global search
router.get("/search", globalSearch);

// Country and City endpoints
router.get("/countries", getCountries);
router.get("/cities", getCities);

// New Homepage Expansion Routes
router.get("/lowest-quotes", getLowestQuotes);
router.get("/common-procedures", getCommonProcedures);

// Public Hospitals
router.get("/hospitals", getPublicHospitals);
router.get("/hospitals/:id", getPublicHospitalById);
router.get("/doctors/:id", getPublicDoctorById);

export default router;