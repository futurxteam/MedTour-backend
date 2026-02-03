// routes/doctorRoutes.js
import express from "express";
import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  getDoctorProfile,
  updateDoctorProfile,
  getAssignedPatients,
  getDoctorSpecializations,
} from "../controllers/doctorController.js";

import attachUserContext from "../middleware/attachUserContext.js";

const router = express.Router();

// All doctor routes are protected
router.use(verifyToken);
router.use(attachUserContext);

router.use(authorizeRoles("doctor"));

router.get("/profile", verifyToken, getDoctorProfile);
router.put("/profile", verifyToken, updateDoctorProfile);
router.get("/assigned-patients", getAssignedPatients);
router.get("/specializations", getDoctorSpecializations);

export default router;
