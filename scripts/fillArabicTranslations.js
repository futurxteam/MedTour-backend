import mongoose from "mongoose";
import dotenv from "dotenv";
import Specialty from "../models/Speciality.js";
import GlobalSurgery from "../models/GlobalSurgery.js";
import Country from "../models/Country.js";

dotenv.config();

/**
 * 🌍 AI TRANSLATION DICTIONARY
 * Pre-translated professional medical terms for MedTour.
 */
const translations = {
  // Specialties
  "PMR": "الطب الفيزيائي وإعادة التأهيل",
  "Oncology": "علم الأورام",
  "Gastrology": "أمراض الجهاز الهضمي",
  "Cardiology": "أمراض القلب",
  "Orthopedic": "جراحة العظام",
  "Neurosurgery": "جراحة الأعصاب",
  "Urology": "جراحة المسالك البولية",
  "Head and Neck": "جراحة الرأس والرقبة",
  "Ayurveda": "الأيورفيدا",
  "Pediatrics": "طب الأطفال",
  "Wellness": "العافية",

  // Countries
  "India": "الهند",
  "United Arab Emirates": "الإمارات العربية المتحدة",
  "United States": "الولايات المتحدة",
  "United Kingdom": "المملكة المتحدة",
  "Oman": "عمان",
  "Saudi Arabia": "المملكة العربية السعودية",
  "Qatar": "قطر",
  "Kuwait": "الكويت",
  "Maldives": "جزر المالديف",
  "Bahrain": "البحرين",

  // Surgeries
  "Brain Tumor Resection": "استئصال ورم الدماغ",
  "Spinal Decompression Surgery": "جراحة تخفيف الضغط عن العمود الفقري",
  "Total Knee Replacement": "استبدال الركبة بالكامل",
  "Hip Replacement Surgery": "جراحة استبدال الورك",
  "Breast Cancer Surgery": "جراحة سرطان الثدي",
  "Colon Cancer Resection": "استئصال سرطان القولون",
  "Gallbladder Removal (Cholecystectomy)": "استئصال المرارة",
  "Gastric Bypass Surgery": "جراحة تحويل مسار المعدة",
  "Thyroidectomy": "استئصال الغدة الدرقية",
  "Oral Cancer Surgery": "جراحة سرطان الفم",
  "Kidney Stone Removal": "إزالة حصوات الكلى",
  "Prostate Surgery (TURP)": "جراحة البروستاتا",
  "Coronary Artery Bypass Grafting (CABG)": "مجازة الشريان التاجي",
  "Heart Valve Replacement": "استبدال صمام القلب",
  "Panchakarma Therapy": "علاج بانتشاكارما",
  "Kati Basti Therapy": "علاج كاتي باستي",
  "Post-Stroke Rehabilitation Program": "برنامج إعادة التأهيل بعد السكتة الدماغية",
  "Sports Injury Rehabilitation": "إعادة تأهيل الإصابات الرياضية",
  "Total Hip Replacement": "استبدال الورك بالكامل",
  "BMR": "معدل الأيض الأساسي",
  "MNA": "التقييم الغذائي المصغر",
  "AAA": "أم الدم الأبهرية البطنية",
  "ADD": "اضطراب نقص الانتباه",
  "HAA": "حمض الهيبوريك",
  "RAA": "نظام الرينين أنجيوتنسين ألدوستيرون",
  "JAA": "التهاب المفاصل الشبابي",
  "KSS": "متلازمة كيرنر ساير",
  "testpmr": "اختبار الطب الفيزيائي",
  "test": "اختبار",
  "dmsd": "دي إم إس دي"
};

/**
 * 💡 AI PROMPT FOR MANUAL EXPANSION:
 * "Translate the following medical term into professional Arabic.
 * Rules:
 * - Use formal medical Arabic
 * - Keep it concise
 * - Do NOT explain
 * - Output ONLY the Arabic text"
 */

async function run() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db;

    // 1. SPECIALTIES
    console.log("📋 Translating Specialties...");
    const specialties = await Specialty.find().lean();
    for (let s of specialties) {
      const en = typeof s.name === "object" ? s.name.en : s.name;
      const currentAr = typeof s.name === "object" ? s.name.ar : "";
      
      if (!currentAr || currentAr === "") {
        const ar = translations[en] || en;
        await Specialty.updateOne({ _id: s._id }, { $set: { "name.en": en, "name.ar": ar } });
        console.log(`   ✅ ${en} -> ${ar}`);
      }
    }

    // 2. GLOBAL SURGERIES
    console.log("\n📋 Translating Global Surgeries...");
    const surgeries = await GlobalSurgery.find().lean();
    for (let s of surgeries) {
      const en = typeof s.surgeryName === "object" ? s.surgeryName.en : s.surgeryName;
      const currentAr = typeof s.surgeryName === "object" ? s.surgeryName.ar : "";

      if (!currentAr || currentAr === "") {
        const ar = translations[en] || en;
        await GlobalSurgery.updateOne({ _id: s._id }, { $set: { "surgeryName.en": en, "surgeryName.ar": ar } });
        console.log(`   ✅ ${en} -> ${ar}`);
      }
    }

    // 3. COUNTRIES
    console.log("\n📋 Translating Countries...");
    const countries = await Country.find().lean();
    for (let c of countries) {
      const en = typeof c.name === "object" ? c.name.en : c.name;
      const currentAr = typeof c.name === "object" ? c.name.ar : "";

      if (!currentAr || currentAr === "") {
        const ar = translations[en] || en;
        await Country.updateOne({ _id: c._id }, { $set: { "name.en": en, "name.ar": ar } });
        console.log(`   ✅ ${en} -> ${ar}`);
      }
    }

    console.log("\n🎉 Translation population completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  }
}

run();
