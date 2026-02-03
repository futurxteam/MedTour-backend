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



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MongoDB Connection
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log(`✅ MongoDB connected`);
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // stop server if DB fails
  });

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

/* =========================
   Root Test Route
========================= */
app.get("/", (req, res) => {
  res.send("MedTour backend running");
});

/* =========================
   Start Server
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

