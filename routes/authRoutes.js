// routes/authRoutes.js

import express from "express";
import { signup, login, googleAuth } from "../controllers/authController.js"; 
import { createPrimaryAdmin } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth); 

router.post("/bootstrap-admin", createPrimaryAdmin);



export default router;
