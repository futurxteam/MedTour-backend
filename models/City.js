import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        countryCode: {
            type: String,
            required: true,
            uppercase: true,
        },
    },
    { timestamps: true }
);

// Compound index to ensure unique city names per country
citySchema.index({ name: 1, countryCode: 1 }, { unique: true });

export default mongoose.model("City", citySchema);
