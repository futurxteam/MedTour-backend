import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

async function checkDB() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log("--- GlobalSurgeries ---");
  const gs = await db.collection("globalsurgeries").findOne();
  console.log(JSON.stringify(gs, null, 2));

  console.log("\n--- Specialties ---");
  const sp = await db.collection("specialties").findOne();
  console.log(JSON.stringify(sp, null, 2));

  process.exit(0);
}

checkDB();
