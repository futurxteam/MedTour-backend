// routes/authRoutes.js

import express from "express";
import { signup, login, googleAuth, registerHospital, sendOtp, verifyOtp } from "../controllers/authController.js"; 

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth); 
router.post("/register-hospital", registerHospital);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);




export default router;
