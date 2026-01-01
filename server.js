import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";

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
