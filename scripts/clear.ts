import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "8.8.4.4",
]);

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI!;

console.log("🔗 Connecting to:", MONGODB_URI);

// ───────────────────────────────────────────────
// Schemas
// ───────────────────────────────────────────────

const RoleSchema = new mongoose.Schema(
    {
        name: String,
        slug: String,
        description: String,
        permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
        isSystem: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const UserSchema = new mongoose.Schema(
    {
        employeeId: String,
        firstName: String,
        lastName: String,
        email: { type: String, unique: true },
        password: String,
        phone: String,
        role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
        status: { type: String, default: "active" },
        isSuperAdmin: { type: Boolean, default: false },
        mustChangePassword: { type: Boolean, default: true },
    },
    { timestamps: true }
);

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);

        console.log("✅ Connected to MongoDB");

        const Role =
            mongoose.models.Role || mongoose.model("Role", RoleSchema);

        const User =
            mongoose.models.User || mongoose.model("User", UserSchema);

        // Create role if it doesn't exist
        let role = await Role.findOne({ slug: "super-admin" });

        if (!role) {
            role = await Role.create({
                name: "Super Admin",
                slug: "super-admin",
                description: "System Super Administrator",
                isSystem: true,
                isActive: true,
            });

            console.log("✅ Super Admin role created");
        } else {
            console.log("ℹ️ Super Admin role already exists");
        }

        // Check user
        const existing = await User.findOne({
            email: "admin@clinic.com",
        });

        if (existing) {
            console.log("ℹ️ Super Admin already exists");
            return;
        }

        const password = await bcrypt.hash("Admin@123", 12);

        await User.create({
            firstName: "Super",
            lastName: "Admin",
            email: "admin@clinic.com",
            password,
            phone: "03001234567",
            role: role._id,
            status: "active",
            isSuperAdmin: true,
            mustChangePassword: true,
        });

        console.log("\n🎉 Super Admin created!");
        console.log("Email    : admin@clinic.com");
        console.log("Password : Admin@123");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected");
    }
}

seed();