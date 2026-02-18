import mongoose from "mongoose";

const countrySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        hasCities: {
            type: Boolean,
            default: false,
        },
        phoneCode: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Country", countrySchema);
