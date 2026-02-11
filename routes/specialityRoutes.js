import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { listActiveSpecialties } from "../controllers/specialtyController.js";

const router = express.Router();

router.get("/", verifyToken, listActiveSpecialties);

export default router;
