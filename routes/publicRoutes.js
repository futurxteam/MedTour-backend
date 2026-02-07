import express from "express";
import { getSurgeriesMenu, getPublicSurgeriesBySpecialty, getPublicDoctorsBySurgery } from "../controllers/publicController.js";

const router = express.Router();

router.get("/surgeries-menu", getSurgeriesMenu);
router.get(
    "/specialties/:specialtyId/public-surgeries",
    getPublicSurgeriesBySpecialty
);

router.get(
    "/surgeries/:surgeryId/public-doctors",
    getPublicDoctorsBySurgery
);


export default router;