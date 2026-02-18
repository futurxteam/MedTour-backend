import mongoose from "mongoose";

const globalSurgerySchema = new mongoose.Schema(
    {
        surgeryName: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        specialization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Specialty",
            required: true,
            index: true,
        },

        description: {
            type: String,
            trim: true,
        },

        minimumCost: {
            type: Number,
            required: true,
        },

        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("GlobalSurgery", globalSurgerySchema);
