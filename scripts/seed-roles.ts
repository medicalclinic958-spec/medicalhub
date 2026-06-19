// scripts/seed-roles.ts
// Run: npx ts-node scripts/seed-roles.ts
// Resets permissions and roles completely

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI!;

const PermissionSchema = new mongoose.Schema({
    module: String,
    action: String,
    description: String,
});
PermissionSchema.index({ module: 1, action: 1 }, { unique: true });

const RoleSchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// ─── CORRECTED PERMISSIONS ────
const DEFAULT_PERMISSIONS = [
    // Patients
    { module: "patients", action: "view" }, { module: "patients", action: "create" },
    { module: "patients", action: "update" }, { module: "patients", action: "delete" },
    // Appointments
    { module: "appointments", action: "view" }, { module: "appointments", action: "create" },
    { module: "appointments", action: "update" }, { module: "appointments", action: "delete" },
    // Doctors
    { module: "doctors", action: "view" }, { module: "doctors", action: "create" },
    { module: "doctors", action: "update" }, { module: "doctors", action: "delete" },
    // EMR
    { module: "emr", action: "view" }, { module: "emr", action: "create" },
    { module: "emr", action: "update" }, { module: "emr", action: "delete" },
    // Prescriptions
    { module: "prescriptions", action: "view" }, { module: "prescriptions", action: "create" },
    { module: "prescriptions", action: "update" }, { module: "prescriptions", action: "delete" },
    // Lab Catalog
    { module: "labcatalog", action: "view" }, { module: "labcatalog", action: "create" },
    { module: "labcatalog", action: "update" }, { module: "labcatalog", action: "delete" },
    // Lab Tests
    { module: "lab", action: "view" }, { module: "lab", action: "create" },
    { module: "lab", action: "update" }, { module: "lab", action: "approve" },
    // Pharmacy
    { module: "pharmacy", action: "view" }, { module: "pharmacy", action: "create" },
    { module: "pharmacy", action: "update" }, { module: "pharmacy", action: "delete" },
    // Suppliers
    { module: "suppliers", action: "view" }, { module: "suppliers", action: "create" },
    { module: "suppliers", action: "update" }, { module: "suppliers", action: "delete" },
    // Billing
    { module: "billing", action: "view" }, { module: "billing", action: "create" },
    { module: "billing", action: "update" }, { module: "billing", action: "delete" },
    // Expenses
    { module: "expenses", action: "view" }, { module: "expenses", action: "create" },
    { module: "expenses", action: "update" }, { module: "expenses", action: "approve" },
    { module: "expenses", action: "delete" },
    // Inventory
    { module: "inventory", action: "view" }, { module: "inventory", action: "create" },
    { module: "inventory", action: "update" }, { module: "inventory", action: "delete" },
    // Staff
    { module: "staff", action: "view" }, { module: "staff", action: "create" },
    { module: "staff", action: "update" }, { module: "staff", action: "delete" },
    // Reports
    { module: "reports", action: "view" }, { module: "reports", action: "export" },
    // Users
    { module: "users", action: "view" }, { module: "users", action: "create" },
    { module: "users", action: "update" }, { module: "users", action: "delete" },
    // Roles
    { module: "roles", action: "view" }, { module: "roles", action: "create" },
    { module: "roles", action: "update" }, { module: "roles", action: "delete" },
    // Settings
    { module: "settings", action: "view" }, { module: "settings", action: "update" },
    // Audit Logs
    { module: "audit_logs", action: "view" },
];

// ─── ROLE DEFINITIONS ──────────────────────────────────────
const ROLE_DEFINITIONS = [
    {
        name: "Doctor",
        slug: "doctor",
        description: "Medical doctor with patient and clinical access",
        modules: ["patients", "appointments", "emr", "prescriptions", "lab", "labcatalog"],
        isSystem: false,
    },
    {
        name: "Receptionist",
        slug: "receptionist",
        description: "Front desk and appointment management",
        modules: ["patients", "appointments", "billing"],
        isSystem: false,
    },
    {
        name: "Accountant",
        slug: "accountant",
        description: "Billing, invoicing and financial records",
        modules: ["billing", "expenses", "reports", "inventory"],
        isSystem: false,
    },
    {
        name: "Lab Staff",
        slug: "lab_staff",
        description: "Laboratory operations and result entry",
        modules: ["lab", "labcatalog", "patients"],
        isSystem: false,
    },
    {
        name: "Pharmacist",
        slug: "pharmacist",
        description: "Pharmacy and medicine management",
        modules: ["pharmacy", "suppliers", "inventory", "prescriptions", "patients"],
        isSystem: false,
    },
    {
        name: "Nurse",
        slug: "nurse",
        description: "Nursing care and patient monitoring",
        modules: ["patients", "appointments", "emr"],
        isSystem: false,
    },
];

async function seed() {
    console.log("🌱 Starting role & permission reset...\n");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Permission = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
    const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);

    // 0. Remove all existing non-system roles
    console.log("🧹 Removing existing non-system roles...");
    const deletedRoles = await Role.deleteMany({ isSystem: false });
    console.log(`   ✓ ${deletedRoles.deletedCount} roles removed\n`);

    // 1. Remove all existing permissions
    console.log("🧹 Removing existing permissions...");
    const deletedPerms = await Permission.deleteMany({});
    console.log(`   ✓ ${deletedPerms.deletedCount} permissions removed\n`);

    // 2. Insert fresh permissions
    console.log("📋 Creating permissions...");
    const permDocs = await Permission.insertMany(
        DEFAULT_PERMISSIONS.map(p => ({ ...p, description: `${p.action} ${p.module}` }))
    );
    console.log(`   ✓ ${permDocs.length} permissions created\n`);

    // Build lookup map
    const permMap: Record<string, any> = {};
    permDocs.forEach((p: any) => {
        permMap[`${p.module}:${p.action}`] = p;
    });

    // 3. Create roles
    console.log("👥 Creating roles...");
    for (const roleDef of ROLE_DEFINITIONS) {
        const rolePermIds = Object.entries(permMap)
            .filter(([key]) => roleDef.modules.some(m => key.startsWith(`${m}:`)))
            .map(([_, doc]) => doc._id);

        await Role.create({
            name: roleDef.name,
            slug: roleDef.slug,
            description: roleDef.description,
            permissions: rolePermIds,
            isSystem: roleDef.isSystem,
            isActive: true,
        });
        console.log(`   ✓ ${roleDef.name} (${rolePermIds.length} permissions)`);
    }

    // 4. Update Super Admin with all permissions
    console.log("\n👑 Updating Super Admin role...");
    const allPermIds = permDocs.map((p: any) => p._id);
    const superAdmin = await Role.findOne({ slug: "super_admin" });
    if (superAdmin) {
        superAdmin.permissions = allPermIds;
        await superAdmin.save();
        console.log(`   ✓ Super Admin updated (${allPermIds.length} permissions)`);
    } else {
        // Create Super Admin if missing
        await Role.create({
            name: "Super Admin",
            slug: "super_admin",
            description: "Full system access with all permissions",
            permissions: allPermIds,
            isSystem: true,
            isActive: true,
        });
        console.log(`   ✓ Super Admin created (${allPermIds.length} permissions)`);
    }

    await mongoose.disconnect();
    console.log("\n🎉 Role seed completed successfully!");
    console.log(`   ${permDocs.length} permissions`);
    console.log(`   ${ROLE_DEFINITIONS.length + 1} roles (including Super Admin)`);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});