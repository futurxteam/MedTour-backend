import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { getPatientJourney } from "../controllers/serviceJourneyController.js";

const router = express.Router();

/* ===========================
   PATIENT ROUTES
=========================== */
router.use(verifyToken, authorizeRoles("patient", "user"));

// Get patient's journey
router.get("/my-journey", getPatientJourney);

export default router;
