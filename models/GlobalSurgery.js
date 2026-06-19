import mongoose from "mongoose";

const multilingualField = {
  en: { type: String, default: "" },
  ar: { type: String, default: "" },
};

const globalSurgerySchema = new mongoose.Schema(
    {
        surgeryName: multilingualField,

        specialization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Specialty",
            required: true,
            index: true,
        },

        description: multilingualField,

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
