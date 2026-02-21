import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import {
    getAssignedEnquiries,
    updateEnquiryStatusByAssistant,
    getActiveServicePackages,
    addPackageToEnquiry,
    removePackageFromEnquiry,
} from "../controllers/assistantController.js";

const router = express.Router();

router.use(verifyToken, authorizeRoles("assistant"));

router.get("/enquiries", getAssignedEnquiries);
router.patch("/enquiries/:id/status", updateEnquiryStatusByAssistant);

// 📦 Service Packages
router.get("/service-packages", getActiveServicePackages);
router.post("/enquiries/:id/add-package", addPackageToEnquiry);
router.delete("/enquiries/:id/remove-package", removePackageFromEnquiry);

export default router;
