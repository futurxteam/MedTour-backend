// check_twilio_service.js
import dotenv from "dotenv";
dotenv.config();
import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SID  = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function check() {
    try {
        console.log("Using Account SID:", ACCOUNT_SID);
        console.log("Using Service SID:", VERIFY_SID);
        
        const service = await client.verify.v2.services(VERIFY_SID).fetch();
        console.log("✅ Service exists and is valid!");
        console.log("Friendly Name:", service.friendlyName);
    } catch (error) {
        console.error("❌ Invalid Service SID or credentials!");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
    }
}

check();
