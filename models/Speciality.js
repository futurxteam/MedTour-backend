import mongoose from "mongoose";

const multilingualField = {
  en: { type: String, default: "" },
  ar: { type: String, default: "" },
};

const specialtySchema = new mongoose.Schema(
  {
    name: multilingualField,

    description: multilingualField,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Specialty", specialtySchema);
