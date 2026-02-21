import Specialty from "../models/Speciality.js";

export const listActiveSpecialties = async (req, res) => {
    const specialties = await Specialty.find({ active: true }).sort({ name: 1 });
    res.json(specialties);
};
