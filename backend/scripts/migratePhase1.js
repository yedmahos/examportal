/**
 * Phase 1 compatibility migration.
 *
 * - Ensures built-in exam types and sessions exist.
 * - Does not rewrite existing Exam, Result, or User documents.
 * - Leaves legacy role "admin" in place. Authorization treats it as super admin.
 * - Does not invent exam types, subjects, rooms, eligibility, or seats on old exams.
 */
const mongoose = require("mongoose");
require("dotenv").config();
const { ensureCatalog } = require("../services/catalogSeed");

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not set");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    await ensureCatalog();
    console.log("Phase 1 catalog is ready. Existing exam records were not modified.");
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
