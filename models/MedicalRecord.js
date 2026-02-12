import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
    {
        journeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceJourney",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicalRecord", medicalRecordSchema);
