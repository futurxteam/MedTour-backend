/**
 * Google Sheets Synchronization Service
 * 
 * Sends submitted MedTour enquiries to Google Apps Script Web App Webhook.
 * 
 * Note: MongoDB is the primary source of truth. Google Sheets sync failures
 * will be logged and recorded with sheetSyncStatus, but will NEVER cause a saved
 * enquiry to be deleted or fail the user request.
 */

export const syncEnquiryToGoogleSheets = async (enquiry) => {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL ? process.env.GOOGLE_SHEETS_WEBHOOK_URL.trim() : "";
    const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ? process.env.GOOGLE_SHEETS_WEBHOOK_SECRET.trim() : "";

    console.log("[Google Sheets] Starting sync");
    console.log(`[Google Sheets] Webhook configured: ${Boolean(webhookUrl)}`);
    console.log(`[Google Sheets] Webhook secret configured: ${Boolean(webhookSecret)}`);

    if (!webhookUrl) {
        console.warn("⚠️ [Google Sheets] GOOGLE_SHEETS_WEBHOOK_URL is not set in backend environment variables.");
        return { success: false, error: "GOOGLE_SHEETS_WEBHOOK_URL not configured" };
    }

    try {
        const payload = {
            secret: webhookSecret,
            patientName: enquiry.patientName || "",
            country: enquiry.country || "",
            city: enquiry.city || "",
            phone: enquiry.phone || "",
            medicalProblem: enquiry.medicalProblem || "",
            dobOrAge: enquiry.ageOrDob || "",
            timestamp: enquiry.createdAt ? enquiry.createdAt.toISOString() : new Date().toISOString(),
        };

        console.log(`[Google Sheets] Sending enquiry: ${enquiry.patientName || enquiry._id}`);

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            redirect: "follow",
        });

        const status = response.status;
        const responseText = await response.text().catch(() => "");

        console.log(`[Google Sheets] Response status: ${status}`);
        console.log(`[Google Sheets] Response body: ${responseText}`);

        if (!response.ok) {
            console.error(`❌ [Google Sheets] Webhook HTTP ${status}: ${responseText}`);
            return { success: false, status, error: responseText };
        }

        try {
            const parsed = JSON.parse(responseText);
            if (parsed && parsed.success === false) {
                console.error(`❌ [Google Sheets] Apps Script returned error: ${parsed.error || "Unknown Apps Script error"}`);
                return { success: false, error: parsed.error };
            }
        } catch (e) {
            // responseText wasn't JSON
        }

        console.log(`✅ [Google Sheets] Enquiry ${enquiry._id} synchronized successfully.`);
        return { success: true };
    } catch (error) {
        console.error("❌ [Google Sheets] Exception during synchronization:", error.message);
        return { success: false, error: error.message };
    }
};
