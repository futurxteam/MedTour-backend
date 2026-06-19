// inspect_env.js
import dotenv from "dotenv";
dotenv.config();

console.log("SID  :", `"${process.env.TWILIO_ACCOUNT_SID || 'MISSING'}"`);
console.log("TOKEN:", `"${process.env.TWILIO_AUTH_TOKEN || 'MISSING'}"`);
console.log("VERIF:", `"${process.env.TWILIO_VERIFY_SERVICE_SID || 'MISSING'}"`);

if (process.env.TWILIO_VERIFY_SERVICE_SID) {
  console.log("Length of VERIFY SID:", process.env.TWILIO_VERIFY_SERVICE_SID.length);
}
