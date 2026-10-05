/**
 * Idempotent development demo accounts.
 * Refuses a remote database unless ALLOW_DEMO_SEED=development.
 * Does not print passwords or connection strings.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const { seedAllowed, upsertDemoAccounts } = require("../services/demoAccounts");

const run = async () => {
    const decision = seedAllowed(process.env.MONGODB_URI, process.env.ALLOW_DEMO_SEED);

    if (!decision.allowed) {
        console.log(decision.message);
        process.exit(decision.target === "missing" ? 0 : 1);
        return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const seeded = await upsertDemoAccounts();

    console.log(JSON.stringify({
        target: decision.target,
        department: seeded.department.code,
        accounts: seeded.accounts.map((account) => ({
            email: account.email,
            role: account.role,
            action: account.action
        }))
    }, null, 2));
    console.log("Passwords were not printed.");
};

run()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) await mongoose.disconnect();
    });
