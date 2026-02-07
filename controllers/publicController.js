import Surgery from "../models/Surgery.js";
import User from "../models/User.js";

export const getSurgeriesMenu = async (req, res) => {
    try {
        const surgeries = await Surgery.find({ active: true })
            .populate("specialization", "name")
            .select("surgeryName specialization")
            .lean();

        const grouped = surgeries.reduce((acc, s) => {
            if (!s.specialization?.name) return acc;

            const specName = s.specialization.name;
            const specId = s.specialization._id;

            if (!acc[specName]) {
                acc[specName] = {
                    _id: specId,
                    surgeries: []
                };
            }

            // Avoid duplicate surgery names in the summary list
            const alreadyExists = acc[specName].surgeries.find(item => item.name === s.surgeryName);
            if (!alreadyExists) {
                acc[specName].surgeries.push({
                    id: s._id,
                    name: s.surgeryName
                });
            }

            return acc;
        }, {});

        res.json(grouped);
    } catch (err) {
        console.error("Public menu error:", err);
        res.status(500).json({ message: "Failed to load surgeries" });
    }
};

export const getPublicSurgeriesBySpecialty = async (req, res) => {
    try {
        const { specialtyId } = req.params;

        // Fetch all surgeries for this specialty
        const surgeries = await Surgery.find({
            specialization: specialtyId,
            active: true,
        })
            .populate("specialization", "name")
            .select("_id surgeryName description duration cost specialization");

        res.json({ surgeries });
    } catch (err) {
        console.error("Fetch specialty surgeries error:", err);
        res.status(500).json({ message: "Failed to fetch surgeries" });
    }
};

export const getPublicDoctorsBySurgery = async (req, res) => {
    try {
        const { surgeryId } = req.params;

        const surgery = await Surgery.findOne({
            _id: surgeryId,
            active: true,
        });

        if (!surgery) {
            return res.status(404).json({ message: "Surgery not found" });
        }

        const doctors = await User.find({
            _id: { $in: surgery.assignedDoctors },
            role: "doctor",
            active: true,
        }).select("_id name email");

        res.json({ doctors });
    } catch (err) {
        console.error("Fetch surgery doctors error:", err);
        res.status(500).json({ message: "Failed to fetch doctors" });
    }
};
