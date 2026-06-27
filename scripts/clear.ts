/**
 * Clear script — remove all data from the database.
 * Usage: npx ts-node scripts/clear.ts
 *        OR: add to package.json: "clear": "ts-node scripts/clear.ts"
 */

import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
console.log("🔗 Connecting to:", MONGODB_URI);

// ─── SCHEMAS (inline to avoid module issues) ────

const PermissionSchema = new mongoose.Schema({
    module: String,
    action: String,
    description: String,
});

const RoleSchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    employeeId: String,
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    status: { type: String, default: "active" },
    isSuperAdmin: { type: Boolean, default: false },
}, { timestamps: true });

const DepartmentSchema = new mongoose.Schema({
    name: String,
    code: String,
    description: String,
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
    clinicName: String,
    clinicType: String,
    phone: String,
    email: String,
    currency: { type: String, default: "PKR" },
}, { timestamps: true });

async function clearDatabase() {
    console.log("🗑️  Starting database cleanup...");

    try {
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected to MongoDB");

        // Get all models
        const Permission = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
        const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
        const User = mongoose.models.User || mongoose.model("User", UserSchema);
        const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
        const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

        // Get all collection names from mongoose
        const collections = mongoose.connection.collections;
        const collectionNames = Object.keys(collections);

        console.log(`\n📊 Found ${collectionNames.length} collections:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));

        // Confirm before deleting
        console.log("\n⚠️  WARNING: This will delete ALL data from ALL collections!");
        console.log("   Collections to be cleared:");
        collectionNames.forEach(name => console.log(`   - ${name}`));

        // Auto-confirm with environment variable or force flag
        const forceClear = process.argv.includes("--force") || process.env.FORCE_CLEAR === "true";

        if (!forceClear) {
            console.log("\n❌ Please run with --force flag to confirm:");
            console.log("   npx ts-node scripts/clear.ts --force");
            console.log("   OR set environment variable: FORCE_CLEAR=true");
            await mongoose.disconnect();
            process.exit(0);
        }

        console.log("\n🗑️  Clearing all collections...");

        // Delete all documents from each collection
        for (const name of collectionNames) {
            const collection = collections[name];
            const result = await collection.deleteMany({});
            console.log(`   ✓ ${name}: ${result.deletedCount} documents deleted`);
        }

        console.log("\n✅ All data cleared successfully!");

        // Show counts after clearing
        console.log("\n📊 Verification:");
        for (const name of collectionNames) {
            const collection = collections[name];
            const count = await collection.countDocuments();
            console.log(`   - ${name}: ${count} documents`);
        }

    } catch (error) {
        console.error("❌ Error clearing database:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

clearDatabase();