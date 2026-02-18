import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getPendingHospitals,
  approveHospital,
  getApprovedHospitals,
  rejectHospital,
  getHospitals,
  getAllEnquiries,
  getAssistants,
  assignPAtoEnquiry,
  updateEnquiryStatus,
  listSpecialties,
  addSpecialty,
  toggleSpecialty,
  listGlobalSurgeries,
  addGlobalSurgery,
  updateGlobalSurgery,
  toggleGlobalSurgeryStatus,
} from "../controllers/adminController.js";

import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* 🔒 ADMIN ONLY */
router.use(verifyToken, authorizeRoles("admin"));

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", toggleUserStatus);
router.delete("/users/:id", deleteUser);

router.get("/pending-hospitals", getPendingHospitals);
router.patch("/approve-hospital/:id", approveHospital);
router.get("/approved-hospitals", getApprovedHospitals);
router.patch("/reject-hospital/:id", rejectHospital);
router.get("/hospitals", getHospitals);

router.get("/specialties", listSpecialties);
router.post("/specialties", addSpecialty);
router.patch("/specialties/:id/status", toggleSpecialty);

router.get("/enquiries", getAllEnquiries);
router.get("/assistants", getAssistants);
router.post("/enquiries/:id/assign-pa", assignPAtoEnquiry);
router.patch("/enquiries/:id/status", updateEnquiryStatus);

router.get("/global-surgeries", listGlobalSurgeries);
router.post("/global-surgeries", addGlobalSurgery);
router.put("/global-surgeries/:id", updateGlobalSurgery);
router.patch("/global-surgeries/:id/status", toggleGlobalSurgeryStatus);

export default router;
