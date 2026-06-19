import mongoose from "mongoose";
import dotenv from "dotenv";
import Specialty from "./models/Speciality.js";
import GlobalSurgery from "./models/GlobalSurgery.js";
import Country from "./models/Country.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const specialties = await Specialty.find({}, 'name').lean();
  const surgeries = await GlobalSurgery.find({}, 'surgeryName').lean();
  const countries = await Country.find({}, 'name').lean();
  
  console.log(JSON.stringify({specialties, surgeries, countries}, null, 2));
  process.exit(0);
}

run();
