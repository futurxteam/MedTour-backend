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
  getSurgeriesBySpecialization,
  assignDoctorToSurgery,
  getSurgeriesByDoctor,
  updateDoctorSurgeries,
  updateDoctorProfileByHospital,
  uploadDoctorPhoto,
  getAvailableGlobalSurgeries,
} from "../controllers/hospitalController.js";
import attachUserContext from "../middleware/attachUserContext.js";
import profileUpload from "../middleware/profileUpload.js";


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
// =========================
// SURGERIES
// =========================
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

router.get(
  "/global-registry",
  verifyToken,
  authorizeRoles("hospital"),
  getAvailableGlobalSurgeries
);

router.get(
  "/surgeries/by-specialization/:specializationId",
  verifyToken,
  authorizeRoles("hospital"),
  getSurgeriesBySpecialization
);

router.patch(
  "/surgeries/:id/toggle",
  verifyToken,
  authorizeRoles("hospital"),
  toggleSurgeryStatus
);

router.post(
  "/surgeries/:surgeryId/assign-doctor",
  verifyToken,
  authorizeRoles("hospital"),
  assignDoctorToSurgery
);


router.patch(
  "/doctors/:doctorId/surgeries",
  verifyToken,
  attachUserContext,
  authorizeRoles("hospital"),
  updateDoctorSurgeries
);


router.get(
  "/surgeries/by-doctor/:doctorId",
  verifyToken,
  authorizeRoles("hospital"),
  getSurgeriesByDoctor
);

router.put(
  "/doctors/:id/profile",
  verifyToken,
  authorizeRoles("hospital"),
  updateDoctorProfileByHospital
);

router.post(
  "/doctors/:id/photo",
  verifyToken,
  authorizeRoles("hospital"),
  profileUpload.single("photo"),
  uploadDoctorPhoto
);


export default router;
