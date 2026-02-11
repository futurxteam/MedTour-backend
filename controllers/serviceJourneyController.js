import ServiceJourney from "../models/ServiceJourney.js";
import Enquiry from "../models/Enquiry.js";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import bcrypt from "bcryptjs";

/* =====================================================
   START SERVICE - Create Journey from Enquiry
   POST /api/assistant/enquiries/:enquiryId/start-service
===================================================== */
export const startService = async (req, res) => {
    try {
        const { enquiryId } = req.params;

        // Verify enquiry exists and is assigned to this PA
        const enquiry = await Enquiry.findOne({
            _id: enquiryId,
            assignedPA: req.user.id,
        });

        if (!enquiry) {
            return res
                .status(404)
                .json({ message: "Enquiry not found or not assigned to you" });
        }

        // Check if enquiry status is "contacted"
        if (enquiry.status !== "contacted") {
            return res.status(400).json({
                message: "Enquiry must be in 'contacted' status to start service",
            });
        }

        // Check if journey already exists
        const existingJourney = await ServiceJourney.findOne({
            enquiryId: enquiryId,
        });
        if (existingJourney) {
            return res
                .status(409)
                .json({ message: "Service journey already exists for this enquiry" });
        }

        // AUTO-CREATE USER ACCOUNT
        let patientUser = await User.findOne({ phone: enquiry.phone });

        if (!patientUser) {
            // Hash phone number as password
            const hashedPassword = await bcrypt.hash(enquiry.phone, 10);

            // Create user account
            patientUser = await User.create({
                name: enquiry.patientName,
                email: `${enquiry.phone}@medtour.temp`, // Temporary email
                phone: enquiry.phone,
                password: hashedPassword,
                role: "patient",
                active: true,
            });

            // Create patient profile
            await PatientProfile.create({
                userId: patientUser._id,
                profileCompleted: false,
            });
        }

        // Create new service journey
        const journey = await ServiceJourney.create({
            enquiryId: enquiryId,
            assignedPA: req.user.id,
            patientId: patientUser._id,
            status: "active",
            stages: [],
        });

        // Update enquiry status to "in-service"
        enquiry.status = "in-service";
        await enquiry.save();

        res.status(201).json({
            message: "Service journey started successfully",
            journey,
            userCreated: !existingJourney,
            loginCredentials: {
                phone: enquiry.phone,
                password: enquiry.phone,
            },
        });
    } catch (error) {
        console.error("Start service error:", error);
        res.status(500).json({ message: "Failed to start service" });
    }
};

/* =====================================================
   GET ASSIGNED JOURNEYS
   GET /api/assistant/journeys
===================================================== */
export const getAssignedJourneys = async (req, res) => {
    try {
        const journeys = await ServiceJourney.find({
            assignedPA: req.user.id,
            status: { $in: ["active", "completed"] },
        })
            .populate("enquiryId", "patientName phone")
            .sort({ createdAt: -1 });

        // Add progress percentage to each journey
        const journeysWithProgress = journeys.map((j) => ({
            ...j.toObject(),
            progressPercentage: j.getProgressPercentage(),
        }));

        res.json(journeysWithProgress);
    } catch (error) {
        console.error("Get journeys error:", error);
        res.status(500).json({ message: "Failed to fetch journeys" });
    }
};

/* =====================================================
   GET JOURNEY BY ID
   GET /api/assistant/journeys/:journeyId
===================================================== */
export const getJourneyById = async (req, res) => {
    try {
        const { journeyId } = req.params;

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        }).populate("enquiryId", "patientName phone medicalProblem");

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        res.json({
            ...journey.toObject(),
            progressPercentage: journey.getProgressPercentage(),
        });
    } catch (error) {
        console.error("Get journey error:", error);
        res.status(500).json({ message: "Failed to fetch journey" });
    }
};

/* =====================================================
   ADD STAGE
   POST /api/assistant/journeys/:journeyId/stages
===================================================== */
export const addStage = async (req, res) => {
    try {
        const { journeyId } = req.params;
        const stageData = req.body;

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        });

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        // Auto-assign order based on current stages length
        const newStage = {
            ...stageData,
            order: journey.stages.length + 1,
            status: stageData.status || "pending",
        };

        journey.stages.push(newStage);
        journey.calculateTotalDuration();
        await journey.save();

        res.status(201).json({
            message: "Stage added successfully",
            journey,
        });
    } catch (error) {
        console.error("Add stage error:", error);
        res.status(500).json({ message: "Failed to add stage" });
    }
};

/* =====================================================
   UPDATE STAGE
   PUT /api/assistant/journeys/:journeyId/stages/:stageId
===================================================== */
export const updateStage = async (req, res) => {
    try {
        const { journeyId, stageId } = req.params;
        const updateData = req.body;

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        });

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        const stage = journey.stages.id(stageId);
        if (!stage) {
            return res.status(404).json({ message: "Stage not found" });
        }

        // Update stage fields
        Object.keys(updateData).forEach((key) => {
            if (key !== "_id" && key !== "order") {
                stage[key] = updateData[key];
            }
        });

        journey.calculateTotalDuration();
        await journey.save();

        res.json({
            message: "Stage updated successfully",
            journey,
        });
    } catch (error) {
        console.error("Update stage error:", error);
        res.status(500).json({ message: "Failed to update stage" });
    }
};

/* =====================================================
   DELETE STAGE
   DELETE /api/assistant/journeys/:journeyId/stages/:stageId
===================================================== */
export const deleteStage = async (req, res) => {
    try {
        const { journeyId, stageId } = req.params;

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        });

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        // Remove stage
        journey.stages.pull(stageId);

        // Reorder remaining stages
        journey.stages.forEach((stage, index) => {
            stage.order = index + 1;
        });

        journey.calculateTotalDuration();
        await journey.save();

        res.json({
            message: "Stage deleted successfully",
            journey,
        });
    } catch (error) {
        console.error("Delete stage error:", error);
        res.status(500).json({ message: "Failed to delete stage" });
    }
};

/* =====================================================
   REORDER STAGES
   PATCH /api/assistant/journeys/:journeyId/reorder
===================================================== */
export const reorderStages = async (req, res) => {
    try {
        const { journeyId } = req.params;
        const { stageOrder } = req.body; // Array of stage IDs in new order

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        });

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        // Update order for each stage
        stageOrder.forEach((stageId, index) => {
            const stage = journey.stages.id(stageId);
            if (stage) {
                stage.order = index + 1;
            }
        });

        // Sort stages by order
        journey.stages.sort((a, b) => a.order - b.order);

        await journey.save();

        res.json({
            message: "Stages reordered successfully",
            journey,
        });
    } catch (error) {
        console.error("Reorder stages error:", error);
        res.status(500).json({ message: "Failed to reorder stages" });
    }
};

/* =====================================================
   UPDATE JOURNEY STATUS
   PATCH /api/assistant/journeys/:journeyId/status
===================================================== */
export const updateJourneyStatus = async (req, res) => {
    try {
        const { journeyId } = req.params;
        const { status } = req.body;

        const journey = await ServiceJourney.findOne({
            _id: journeyId,
            assignedPA: req.user.id,
        });

        if (!journey) {
            return res
                .status(404)
                .json({ message: "Journey not found or not assigned to you" });
        }

        journey.status = status;
        await journey.save();

        // If journey is completed, update enquiry status
        if (status === "completed") {
            await Enquiry.findByIdAndUpdate(journey.enquiryId, {
                status: "completed",
            });
        }

        res.json({
            message: "Journey status updated successfully",
            journey,
        });
    } catch (error) {
        console.error("Update journey status error:", error);
        res.status(500).json({ message: "Failed to update journey status" });
    }
};

/* =====================================================
   GET PATIENT JOURNEY (Patient View)
   GET /api/patient/my-journey
===================================================== */
export const getPatientJourney = async (req, res) => {
    try {
        // Find journey linked to this patient user
        const journey = await ServiceJourney.findOne({
            patientId: req.user.id,
        }).populate("assignedPA", "name");

        if (!journey) {
            return res.status(404).json({ message: "No active journey found" });
        }

        // Get enquiry details
        const enquiry = await Enquiry.findById(journey.enquiryId);

        res.json({
            ...journey.toObject(),
            progressPercentage: journey.getProgressPercentage(),
            patientName: enquiry?.patientName,
        });
    } catch (error) {
        console.error("Get patient journey error:", error);
        res.status(500).json({ message: "Failed to fetch journey" });
    }
};
