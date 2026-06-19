/**
 * 🌍 MULTILINGUAL MIGRATION SCRIPT
 * Converts plain-string fields to { en, ar } objects.
 * SAFE: skips fields that are already objects.
 * RUN ONCE: node scripts/migrateToMultilingual.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

/**
 * Convert a plain string value to { en, ar } object.
 * If already an object, returns it untouched.
 * If null/undefined, returns { en: "", ar: "" }.
 */
function convertField(value) {
  if (value === null || value === undefined) return { en: "", ar: "" };
  if (typeof value === "object" && value.en !== undefined) return value;
  if (typeof value === "string") return { en: value, ar: "" };
  return { en: String(value), ar: "" };
}

async function migrate() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected!\n");

  const db = mongoose.connection.db;

  // ── 1. Hospital Profiles ──────────────────────────────
  console.log("📋 Migrating HospitalProfiles...");
  const hospitals = await db.collection("hospitalprofiles").find({}).toArray();
  let hospitalCount = 0;

  for (const h of hospitals) {
    const updates = {};
    let needsUpdate = false;

    for (const field of ["hospitalName", "description", "address", "city", "state", "country"]) {
      if (h[field] !== undefined && typeof h[field] !== "object") {
        updates[field] = convertField(h[field]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("hospitalprofiles").updateOne(
        { _id: h._id },
        { $set: updates }
      );
      hospitalCount++;
    }
  }
  console.log(`   ✅ Migrated ${hospitalCount}/${hospitals.length} hospital profiles\n`);

  // ── 2. Specialties ─────────────────────────────────────
  console.log("📋 Migrating Specialties...");
  const specialties = await db.collection("specialties").find({}).toArray();
  let specCount = 0;

  for (const s of specialties) {
    const updates = {};
    let needsUpdate = false;

    for (const field of ["name", "description"]) {
      if (s[field] !== undefined && typeof s[field] !== "object") {
        updates[field] = convertField(s[field]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("specialties").updateOne(
        { _id: s._id },
        { $set: updates }
      );
      specCount++;
    }
  }
  console.log(`   ✅ Migrated ${specCount}/${specialties.length} specialties\n`);

  // ── 3. Global Surgeries ────────────────────────────────
  console.log("📋 Migrating GlobalSurgeries...");
  const globals = await db.collection("globalsurgeries").find({}).toArray();
  let globalCount = 0;

  for (const g of globals) {
    const updates = {};
    let needsUpdate = false;

    for (const field of ["surgeryName", "description"]) {
      if (g[field] !== undefined && typeof g[field] !== "object") {
        updates[field] = convertField(g[field]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("globalsurgeries").updateOne(
        { _id: g._id },
        { $set: updates }
      );
      globalCount++;
    }
  }
  console.log(`   ✅ Migrated ${globalCount}/${globals.length} global surgeries\n`);

  // ── 4. Surgeries (hospital-level) ──────────────────────
  console.log("📋 Migrating Surgeries...");
  const surgeries = await db.collection("surgeries").find({}).toArray();
  let surgeryCount = 0;

  for (const s of surgeries) {
    const updates = {};
    let needsUpdate = false;

    for (const field of ["description"]) {
      if (s[field] !== undefined && typeof s[field] !== "object") {
        updates[field] = convertField(s[field]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("surgeries").updateOne(
        { _id: s._id },
        { $set: updates }
      );
      surgeryCount++;
    }
  }
  console.log(`   ✅ Migrated ${surgeryCount}/${surgeries.length} surgeries\n`);

  // ── 5. Doctor Profiles ─────────────────────────────────
  console.log("📋 Migrating DoctorProfiles...");
  const doctorProfiles = await db.collection("doctorprofiles").find({}).toArray();
  let docCount = 0;

  for (const d of doctorProfiles) {
    const updates = {};
    let needsUpdate = false;

    for (const field of ["designation", "about", "bio", "qualifications"]) {
      if (d[field] !== undefined && typeof d[field] !== "object") {
        updates[field] = convertField(d[field]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("doctorprofiles").updateOne(
        { _id: d._id },
        { $set: updates }
      );
      docCount++;
    }
  }
  console.log(`   ✅ Migrated ${docCount}/${doctorProfiles.length} doctor profiles\n`);

  // ── 6. User names (doctors only) ───────────────────────
  console.log("📋 Migrating User names (doctors)...");
  const doctors = await db.collection("users").find({ role: "doctor" }).toArray();
  let userCount = 0;

  for (const u of doctors) {
    if (u.name !== undefined && typeof u.name !== "object") {
      await db.collection("users").updateOne(
        { _id: u._id },
        { $set: { name: convertField(u.name) } }
      );
      userCount++;
    }
  }
  console.log(`   ✅ Migrated ${userCount}/${doctors.length} doctor user names\n`);

  // ── 7. Countries ──────────────────────────────────────
  console.log("📋 Migrating Countries...");
  const countries = await db.collection("countries").find({}).toArray();
  let countryCount = 0;

  for (const c of countries) {
    if (c.name !== undefined && typeof c.name !== "object") {
      await db.collection("countries").updateOne(
        { _id: c._id },
        { $set: { name: convertField(c.name) } }
      );
      countryCount++;
    }
  }
  console.log(`   ✅ Migrated ${countryCount}/${countries.length} countries\n`);

  // ── 8. Cities ─────────────────────────────────────────
  console.log("📋 Migrating Cities...");
  const cities = await db.collection("cities").find({}).toArray();
  let cityCount = 0;

  for (const c of cities) {
    if (c.name !== undefined && typeof c.name !== "object") {
      await db.collection("cities").updateOne(
        { _id: c._id },
        { $set: { name: convertField(c.name) } }
      );
      cityCount++;
    }
  }
  console.log(`   ✅ Migrated ${cityCount}/${cities.length} cities\n`);

  console.log("🎉 Migration completed successfully!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
