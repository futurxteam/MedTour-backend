import GlobalSurgery from "../models/GlobalSurgery.js";
import getLocalized from "../utils/localize.js";

export const getSurgeries = async (req, res) => {
  try {
    const lang = req.query.lang || "en";

    console.log("LANG:", lang);

    const surgeries = await GlobalSurgery.find({ active: true })
      .populate("specialization", "name")
      .lean();

    if (surgeries.length > 0) {
      console.log("DATA (sample):", JSON.stringify(surgeries[0], null, 2));
    }

    const localizedData = surgeries.map(s => ({
      _id: s._id,
      surgeryName: getLocalized(s.surgeryName, lang),
      description: getLocalized(s.description, lang),
      minimumCost: s.minimumCost,

      specialization: {
        _id: s.specialization?._id,
        name: getLocalized(s.specialization?.name, lang)
      }
    }));

    res.json(localizedData);

  } catch (error) {
    console.error("Error fetching surgeries:", error);
    res.status(500).json({ message: "Server error" });
  }
};
