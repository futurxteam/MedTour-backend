import express from "express";
import Specialty from "../models/Speciality.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/specialties
 * Get all active specialties
 * Public route - anyone can view
 */
router.get("/", async (req, res) => {
  try {
    const specialties = await Specialty.find({ active: true });
    res.json(specialties);
  } catch (err) {
    console.error("Get specialties error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/specialties/:id
 * Get a specific specialty
 * Public route
 */
router.get("/:id", async (req, res) => {
  try {
    const specialty = await Specialty.findById(req.params.id);

    if (!specialty) {
      return res.status(404).json({ message: "Specialty not found" });
    }

    res.json(specialty);
  } catch (err) {
    console.error("Get specialty error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/specialties
 * Create a new specialty (Admin only)
 */
router.post("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const existing = await Specialty.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "Specialty already exists" });
    }

    const specialty = await Specialty.create({
      name,
      description,
      active: true,
    });

    res.status(201).json({
      message: "Specialty created successfully",
      specialty,
    });
  } catch (err) {
    console.error("Create specialty error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/specialties/:id
 * Update a specialty (Admin only)
 */
router.put("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const specialty = await Specialty.findByIdAndUpdate(
      req.params.id,
      { name, description, active },
      { new: true }
    );

    if (!specialty) {
      return res.status(404).json({ message: "Specialty not found" });
    }

    res.json({
      message: "Specialty updated successfully",
      specialty,
    });
  } catch (err) {
    console.error("Update specialty error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/specialties/:id
 * Delete a specialty (Admin only)
 */
router.delete("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const specialty = await Specialty.findByIdAndDelete(req.params.id);

    if (!specialty) {
      return res.status(404).json({ message: "Specialty not found" });
    }

    res.json({
      message: "Specialty deleted successfully",
      specialty,
    });
  } catch (err) {
    console.error("Delete specialty error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/specialties/:id/toggle
 * Toggle specialty active status (Admin only)
 */
router.patch(
  "/:id/toggle",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const specialty = await Specialty.findById(req.params.id);

      if (!specialty) {
        return res.status(404).json({ message: "Specialty not found" });
      }

      specialty.active = !specialty.active;
      await specialty.save();

      res.json({
        message: "Specialty status updated",
        specialty,
      });
    } catch (err) {
      console.error("Toggle specialty error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
