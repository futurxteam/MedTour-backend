import Enquiry from "../models/Enquiry.js";

export const getAssignedEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find({ assignedPA: req.user.id })
            .sort({ createdAt: -1 })
            .populate("specialtyId", "name")
            .populate("surgeryId", "surgeryName")
            .populate("doctorId", "name");

        res.json(enquiries);
    } catch (error) {
        console.error("Fetch assigned enquiries error:", error);
        res.status(500).json({ message: "Failed to fetch enquiries" });
    }
};

export const updateEnquiryStatusByAssistant = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const enquiry = await Enquiry.findOne({ _id: id, assignedPA: req.user.id });
        if (!enquiry) {
            return res.status(404).json({ message: "Enquiry not found or not assigned to you" });
        }

        enquiry.status = status;
        await enquiry.save();

        res.json({ message: "Status updated successfully", enquiry });
    } catch (error) {
        console.error("Update enquiry status error:", error);
        res.status(500).json({ message: "Failed to update status" });
    }
};
