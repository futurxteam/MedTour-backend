import Enquiry from "../models/Enquiry.js";
import ServicePackage from "../models/ServicePackage.js";

export const getAssignedEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find({ assignedPA: req.user.id })
            .sort({ createdAt: -1 })
            .populate("specialtyId", "name")
            .populate("surgeryId", "surgeryName")
            .populate("doctorId", "name")
            .populate("servicePackages");

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

/* =====================================================
   SERVICE PACKAGES – ASSISTANT
===================================================== */

export const getActiveServicePackages = async (req, res) => {
    try {
        const packages = await ServicePackage.find({ active: true }).sort({ type: 1, name: 1 });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch service packages" });
    }
};

export const addPackageToEnquiry = async (req, res) => {
    try {
        const { packageId, packageNotes } = req.body;
        const { id } = req.params;

        if (!packageId) {
            return res.status(400).json({ message: "packageId is required" });
        }

        // Verify the package exists and is active
        const pkg = await ServicePackage.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: "Service package not found" });
        }
        if (!pkg.active) {
            return res.status(400).json({ message: "Only active packages can be attached" });
        }

        // Verify the enquiry belongs to this assistant
        const enquiry = await Enquiry.findOne({ _id: id, assignedPA: req.user.id });
        if (!enquiry) {
            return res.status(404).json({ message: "Enquiry not found or not assigned to you" });
        }

        // Prevent duplicates
        const alreadyAdded = enquiry.servicePackages.some(
            (sp) => sp.toString() === packageId
        );
        if (alreadyAdded) {
            return res.status(409).json({ message: "Package already attached to this enquiry" });
        }

        enquiry.servicePackages.push(packageId);
        if (packageNotes !== undefined) {
            enquiry.packageNotes = packageNotes;
        }
        await enquiry.save();

        await enquiry.populate("servicePackages");

        res.json({ message: "Package added successfully", enquiry });
    } catch (error) {
        console.error("Add package to enquiry error:", error);
        res.status(500).json({ message: "Failed to add package" });
    }
};

export const removePackageFromEnquiry = async (req, res) => {
    try {
        const { packageId } = req.body;
        const { id } = req.params;

        if (!packageId) {
            return res.status(400).json({ message: "packageId is required" });
        }

        const enquiry = await Enquiry.findOne({ _id: id, assignedPA: req.user.id });
        if (!enquiry) {
            return res.status(404).json({ message: "Enquiry not found or not assigned to you" });
        }

        enquiry.servicePackages = enquiry.servicePackages.filter(
            (sp) => sp.toString() !== packageId
        );
        await enquiry.save();

        await enquiry.populate("servicePackages");

        res.json({ message: "Package removed successfully", enquiry });
    } catch (error) {
        console.error("Remove package from enquiry error:", error);
        res.status(500).json({ message: "Failed to remove package" });
    }
};
