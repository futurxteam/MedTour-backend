// routes/authRoutes.js

import express from "express";
import { signup, login, googleAuth,  registerHospital ,} from "../controllers/authController.js"; 

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth); 
router.post("/register-hospital", registerHospital);




export default router;
