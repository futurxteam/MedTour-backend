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

export default router;
