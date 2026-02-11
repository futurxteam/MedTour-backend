import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getCurrentUser,
  updatePatientProfile,
  getPatientProfile,
} from "../controllers/userController.js";

import attachUserContext from "../middleware/attachUserContext.js";

const router = express.Router();

/* =========================
   User Profile Routes
========================= */
router.get("/me", verifyToken, getCurrentUser, attachUserContext, (req, res) => {
  res.json(req.user);
});
router.get("/profile", verifyToken, getPatientProfile);
router.put("/profile", verifyToken, updatePatientProfile);

export default router;
