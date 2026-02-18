// MedTour-backend/server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import specialtyRoutes from "./routes/specialtyRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import serviceJourneyRoutes from "./routes/serviceJourneyRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import publicRoutes from "./routes/publicRoutes.js"; // ✅ FIX

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MongoDB Connection
========================= */
mongoose.set("strictQuery", false);
// Disable buffering so that queries fail fast if not connected
mongoose.set("bufferCommands", false);

const connectDB = async () => {
   try {
      await mongoose.connect(process.env.MONGO_URI, {
         serverSelectionTimeoutMS: 5000,
      });
      console.log("✅ MongoDB connected");
   } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      process.exit(1);
   }
};

/* =========================
   Middleware
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/assistant", serviceJourneyRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/public", publicRoutes); // ✅ FIX

/* =========================
   Root Test Route
========================= */
app.get("/", (req, res) => {
   res.send("MedTour backend running");
});

/* =========================
   Start Server
========================= */
const startServer = async () => {
   await connectDB();
   app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
   });
};

startServer();