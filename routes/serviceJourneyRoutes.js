import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
    startService,
    getAssignedJourneys,
    getJourneyById,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    updateJourneyStatus,
    getPatientJourney,
    addMedicalRecord,
    getJourneyRecords,
} from "../controllers/serviceJourneyController.js";

const router = express.Router();

/* ===========================
   PA ROUTES
=========================== */
router.use(verifyToken, authorizeRoles("assistant"));

// Start service journey from enquiry
router.post("/enquiries/:enquiryId/start-service", startService);

// Get all journeys assigned to PA
router.get("/journeys", getAssignedJourneys);

// Get specific journey
router.get("/journeys/:journeyId", getJourneyById);

// Stage management
router.post("/journeys/:journeyId/stages", addStage);
router.put("/journeys/:journeyId/stages/:stageId", updateStage);
router.delete("/journeys/:journeyId/stages/:stageId", deleteStage);

// Reorder stages
router.patch("/journeys/:journeyId/reorder", reorderStages);

// Update journey status
router.patch("/journeys/:journeyId/status", updateJourneyStatus);

// Medical Records management
router.post("/journeys/:journeyId/records", upload.single("file"), addMedicalRecord);
router.get("/journeys/:journeyId/records", getJourneyRecords);

export default router;
