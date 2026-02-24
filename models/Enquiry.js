import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
    {
        patientName: String,

        phone: {
            type: String,
            required: true,
        },

        contactMode: {
            type: String,
            enum: ["call", "message"],
            required: true,
        },

        otpVerified: {
            type: Boolean,
            default: false,
        },

        // Source of enquiry
        source: {
            type: String,
            enum: ["homepage", "services", "search", "doctor_direct"],
            default: "services",
        },

        // Homepage-specific fields
        country: String,
        city: String,
        medicalProblem: String,
        ageOrDob: String,

        // Services-specific fields (optional for homepage enquiries)
        specialtyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Specialty",
        },

        surgeryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Surgery",
        },

        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        consultationDate: {
            type: Date,
        },

        status: {
            type: String,
            enum: ["new", "assigned", "contacted", "in-service", "completed", "closed"],
            default: "new",
        },

        assignedPA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // ── Service Packages ─────────────────────────────
        servicePackages: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ServicePackage",
            },
        ],

        packageNotes: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

/**
 * ✅ DEFAULT EXPORT (THIS IS CRITICAL)
 */
export default mongoose.model("Enquiry", enquirySchema);
