import Specialty from "../models/Speciality.js";
import getLocalized from "../utils/localize.js";

export const getSpecialties = async (req, res) => {
  try {
    const lang = req.query.lang || "en";

    const specs = await Specialty.find({ active: true }).lean();

    const localized = specs.map(s => ({
      _id: s._id,
      name: getLocalized(s.name, lang)
    }));

    res.json(localized);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch specialties" });
  }
};
