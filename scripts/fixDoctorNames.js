/**
 * 🩺 FIX DOCTOR NAMES MIGRATION SCRIPT
 * Fixes doctor User records where name.en is missing/empty.
 *
 * For auto-generated medtour-doctor.com emails:
 *   email = "test.8206.1782734404141@medtour-doctor.com" → name.en = "test"
 *
 * For real emails:
 *   name.en = "[Fix Needed - <email>]" so the admin knows to use Edit Profile.
 *
 * RUN: node scripts/fixDoctorNames.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
  name: { en: String, ar: String },
  email: String,
  role: String,
  active: Boolean,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!\n");

  // Find all doctor Users where name.en is falsy (null, undefined, or empty string)
  const doctors = await User.find({
    role: "doctor",
    $or: [
      { "name.en": { $exists: false } },
      { "name.en": null },
      { "name.en": "" },
      { name: null },
      { name: { $exists: false } },
    ],
  }).lean();

  console.log(`Found ${doctors.length} doctor(s) with missing name.en\n`);

  let fixed = 0;
  let skipped = 0;

  for (const doc of doctors) {
    let recoveredName = "";

    const email = doc.email || "";

    if (email.endsWith("@medtour-doctor.com")) {
      // Auto-generated email: "test.8206.1782734404141@medtour-doctor.com"
      // The slug (original name) is the part before the first dot
      const slug = email.split(".")[0];
      // Capitalize first letter
      recoveredName = slug.charAt(0).toUpperCase() + slug.slice(1);
      console.log(`  ✅ ${email} → recovered name: "${recoveredName}"`);
    } else {
      // Real email — we don't know the name, flag it for manual fix
      recoveredName = `[Name Missing - ${email}]`;
      console.log(`  ⚠️  ${email} → real email, flagged for manual fix`);
    }

    await User.updateOne(
      { _id: doc._id },
      { $set: { "name.en": recoveredName, "name.ar": "" } }
    );
    fixed++;
  }

  console.log(`\n✅ Migration complete: ${fixed} fixed, ${skipped} skipped.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
