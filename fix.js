import mongoose from "mongoose";

mongoose.connect("mongodb+srv://futurxteam_db_user:MedTour123@cluster0.ivdthwf.mongodb.net/MedTour").then(async () => {
    const db = mongoose.connection.db;

    // Convert arrays or remove invalid ones
    const profiles = await db.collection("hospitalprofiles").find({}).toArray();
    for (const p of profiles) {
        let modified = false;

        const validSpecialties = [];
        for (const s of (p.specialties || [])) {
            if (mongoose.Types.ObjectId.isValid(s)) validSpecialties.push(new mongoose.Types.ObjectId(s));
        }

        const validDoctors = [];
        for (const d of (p.doctors || [])) {
            if (mongoose.Types.ObjectId.isValid(d)) validDoctors.push(new mongoose.Types.ObjectId(d));
        }

        await db.collection("hospitalprofiles").updateOne(
            { _id: p._id },
            { $set: { specialties: validSpecialties, doctors: validDoctors } }
        );
    }
    console.log("DB Fixed");
    process.exit(0);
});
