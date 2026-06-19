import twilio from "twilio";
import parsePhoneNumberFromString from 'libphonenumber-js';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SID  = process.env.TWILIO_VERIFY_SERVICE_SID;

// Validate required env vars at startup
if (!ACCOUNT_SID || !AUTH_TOKEN || !VERIFY_SID) {
    console.error("❌ Twilio env vars missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID");
}

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

/**
 * Normalize and validate a phone number to E.164 format.
 * Uses libphonenumber-js for robust parsing.
 * 
 * @param {string} raw - raw phone number string
 * @param {string} [defaultRegion='IN'] - default region if no country code provided
 * @returns {string|null} E.164 formatted phone OR null if invalid
 */
export const normalizePhone = (raw, defaultRegion = 'IN') => {
    try {
        const phoneNumber = parsePhoneNumberFromString(raw, {
            defaultCountry: defaultRegion,
            extract: false
        });

        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
        return null;
    } catch (error) {
        console.error("Phone normalization error:", error);
        return null;
    }
};

/**
 * Send OTP via Twilio Verify SMS
 * @param {string} phone - raw phone from frontend (with or without +)
 * @returns {{ success: boolean, phone: string }}
 */
export const sendOTP = async (phone) => {
    const e164Phone = normalizePhone(phone);
    if (!e164Phone) {
        const error = new Error("Invalid phone number format");
        error.code = 21614; // Twilio-style error code for invalid phone
        throw error;
    }

    console.log(`📤 Sending OTP to: ${e164Phone}`);

    const verification = await client.verify.v2
        .services(VERIFY_SID)
        .verifications
        .create({ to: e164Phone, channel: "sms" });

    console.log(`✅ OTP sent | status: ${verification.status} | sid: ${verification.sid}`);

    return {
        success: true,
        phone: e164Phone,
        status: verification.status,
    };
};

/**
 * Verify OTP via Twilio Verify
 * @param {string} phone - raw or E.164
 * @param {string} otp   - 6-digit OTP entered by user
 * @returns {{ success: boolean, valid: boolean }}
 */
export const verifyOTP = async (phone, otp) => {
    const e164Phone = normalizePhone(phone);
    if (!e164Phone) {
        throw new Error("Invalid phone number format");
    }

    console.log(`🔍 Verifying OTP for: ${e164Phone}`);

    const check = await client.verify.v2
        .services(VERIFY_SID)
        .verificationChecks
        .create({ to: e164Phone, code: otp.toString() });

    const valid = check.status === "approved";

    console.log(`${valid ? "✅" : "❌"} OTP verification | status: ${check.status}`);

    return {
        success: true,
        valid,
        status: check.status,
    };
};
