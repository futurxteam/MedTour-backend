import express from "express";
import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  addDoctor,
  listDoctors,
  toggleDoctorStatus,
  getHospitalMe,
  updateHospitalProfile,
  addSurgery,
  listSurgeries,
  toggleSurgeryStatus,
  getHospitalSpecializations,
} from "../controllers/hospitalController.js";
import attachUserContext from "../middleware/attachUserContext.js";


const router = express.Router();

router.get(
  "/specializations",
  verifyToken,
  authorizeRoles("hospital"),
  getHospitalSpecializations
);

router.post(
  "/doctors",
  verifyToken,
  authorizeRoles("hospital"),
  addDoctor
);
router.get(
  "/doctors",
  verifyToken,
  attachUserContext,
  authorizeRoles("hospital"),
  listDoctors,
);

router.patch(
  "/doctors/:id/toggle",
  verifyToken,
  authorizeRoles("hospital"),
  toggleDoctorStatus
);
router.get("/me", verifyToken, getHospitalMe);
router.put("/profile", verifyToken, updateHospitalProfile);

// Surgeries
router.post(
  "/surgeries",
  verifyToken,
  authorizeRoles("hospital"),
  addSurgery
);

router.get(
  "/surgeries",
  verifyToken,
  authorizeRoles("hospital"),
  listSurgeries
);

router.patch(
  "/surgeries/:id/toggle",
  verifyToken,
  authorizeRoles("hospital"),
  toggleSurgeryStatus
);



export default router;
