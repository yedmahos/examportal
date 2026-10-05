/**
 * Read-only role report.
 * Does not delete users, schedules, seating plans, or room allocations.
 *
 * Report only:
 *   node backend/scripts/roleMigrationCheck.js
 *
 * Apply an explicit legacy-admin mapping:
 *   node backend/scripts/roleMigrationCheck.js --apply --map admin@example.com=super_admin
 *
 * Only users whose current role is "admin" can be mapped.
 * Unlisted admin accounts are reported and left unchanged.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const { planMigration } = require("../services/roleMigration");

const parseMap = (argv) => {
    const mapping = {};
    const flag = argv.indexOf("--map");

    if (flag === -1) return mapping;

    argv.slice(flag + 1).forEach((item) => {
        if (item.startsWith("--")) return;
        const [email, role] = String(item).split("=");
        if (email && role) mapping[email.trim().toLowerCase()] = role.trim();
    });

    return mapping;
};

const run = async () => {
    const apply = process.argv.includes("--apply");
    const mapping = parseMap(process.argv);

    if (!process.env.MONGODB_URI) {
        console.log(JSON.stringify({
            changed: false,
            message: "MONGODB_URI is not set. No users were read or changed."
        }, null, 2));
        return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}).select("name email role departmentRef status");
    const plan = planMigration(users, mapping);

    console.log(JSON.stringify({
        changed: false,
        ...plan.summary,
        changes: plan.changes,
        errors: plan.errors
    }, null, 2));

    if (!apply) {
        console.log("No accounts were changed. Pass --apply with an explicit --map to migrate legacy admin users.");
        return;
    }

    if (!Object.keys(mapping).length || plan.errors.length) {
        throw new Error(plan.errors.join("; ") || "An explicit --map is required. Nothing was changed.");
    }

    const applicable = plan.changes.filter((change) => change.action === "map");

    for (const change of applicable) {
        const result = await User.updateOne(
            { email: change.email, role: "admin" },
            { $set: { role: change.to } }
        );

        if (result.modifiedCount !== 1) {
            throw new Error(`${change.email} was not updated`);
        }
    }

    console.log(JSON.stringify({
        changed: true,
        updated: applicable
    }, null, 2));
};

run()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.disconnect();
        }
    });
