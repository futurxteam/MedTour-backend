import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import {
    getAssignedEnquiries,
    updateEnquiryStatusByAssistant,
} from "../controllers/assistantController.js";

const router = express.Router();

router.use(verifyToken, authorizeRoles("assistant"));

router.get("/enquiries", getAssignedEnquiries);
router.patch("/enquiries/:id/status", updateEnquiryStatusByAssistant);

export default router;
