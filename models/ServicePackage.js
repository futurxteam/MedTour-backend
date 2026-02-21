import mongoose from "mongoose";

const servicePackageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["translator", "tourism"],
            required: true,
        },

        // ── Translator-only ──────────────────────────────
        language: {
            type: String,
            enum: ["english", "arabic"],
            // Required only when type === "translator" (enforced in controller)
        },

        // ── Tourism-only ─────────────────────────────────
        place: {
            type: String,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        // ── Shared ───────────────────────────────────────
        price: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            default: "USD",
            trim: true,
        },

        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("ServicePackage", servicePackageSchema);
