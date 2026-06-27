/**
 * Seed script — run once to initialize the database with only a super admin user.
 * Usage: npx ts-node scripts/seed.ts
 *        OR: add to package.json: "seed": "ts-node scripts/seed.ts"
 */

import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
console.log(MONGODB_URI)

// ─── SCHEMAS (inline to avoid module issues in script) ────

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
  failedLoginAttempts: { type: Number, default: 0 },
  mustChangePassword: { type: Boolean, default: false },
  preferences: {
    theme: { type: String, default: "light" },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },
    notifications: { email: { type: Boolean, default: true }, browser: { type: Boolean, default: true } },
  },
}, { timestamps: true });

const DEFAULT_PERMISSIONS = [
  { module: "patients", action: "view" }, { module: "patients", action: "create" },
  { module: "patients", action: "update" }, { module: "patients", action: "delete" },
  { module: "appointments", action: "view" }, { module: "appointments", action: "create" },
  { module: "appointments", action: "update" }, { module: "appointments", action: "delete" },
  { module: "doctors", action: "view" }, { module: "doctors", action: "create" },
  { module: "doctors", action: "update" }, { module: "doctors", action: "delete" },
  { module: "billing", action: "view" }, { module: "billing", action: "create" },
  { module: "billing", action: "update" }, { module: "billing", action: "delete" },
  { module: "lab", action: "view" }, { module: "lab", action: "create" },
  { module: "lab", action: "update" }, { module: "lab", action: "approve" },
  { module: "pharmacy", action: "view" }, { module: "pharmacy", action: "create" },
  { module: "pharmacy", action: "update" }, { module: "pharmacy", action: "delete" },
  { module: "inventory", action: "view" }, { module: "inventory", action: "create" },
  { module: "inventory", action: "update" }, { module: "inventory", action: "delete" },
  { module: "staff", action: "view" }, { module: "staff", action: "create" },
  { module: "staff", action: "update" }, { module: "staff", action: "delete" },
  { module: "reports", action: "view" }, { module: "reports", action: "export" },
  { module: "users", action: "view" }, { module: "users", action: "create" },
  { module: "users", action: "update" }, { module: "users", action: "delete" },
  { module: "roles", action: "view" }, { module: "roles", action: "create" },
  { module: "roles", action: "update" }, { module: "roles", action: "delete" },
  { module: "settings", action: "view" }, { module: "settings", action: "update" },
  { module: "audit_logs", action: "view" },
  { module: "emr", action: "view" }, { module: "emr", action: "create" }, { module: "emr", action: "update" },
  { module: "prescriptions", action: "view" }, { module: "prescriptions", action: "create" },
  { module: "expenses", action: "view" }, { module: "expenses", action: "create" },
  { module: "expenses", action: "update" }, { module: "expenses", action: "approve" },
  { module: "opd", action: "view" }, { module: "opd", action: "create" }, { module: "opd", action: "update" },
];

async function seed() {
  console.log("🌱 Starting database seed (Super Admin only)...");
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB");

  const Permission = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
  const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  // 1. Seed permissions (required for role)
  console.log("📋 Seeding permissions...");
  const permDocs = await Promise.all(
    DEFAULT_PERMISSIONS.map((p) =>
      Permission.findOneAndUpdate(
        { module: p.module, action: p.action },
        { ...p, description: `${p.action} ${p.module}` },
        { upsert: true, new: true }
      )
    )
  );
  console.log(`   ✓ ${permDocs.length} permissions seeded`);

  // 2. Create Super Admin role
  console.log("👑 Creating Super Admin role...");
  let superAdminRole = await Role.findOne({ slug: "super_admin" });
  if (!superAdminRole) {
    superAdminRole = await Role.create({
      name: "Super Admin",
      slug: "super_admin",
      description: "Full system access with all permissions",
      permissions: permDocs.map((p) => p._id),
      isSystem: true,
      isActive: true,
    });
    console.log("   ✓ Super Admin role created");
  } else {
    console.log("   ✓ Super Admin role already exists");
  }

  // 3. Create ONLY Super Admin user (no other roles or users)
  console.log("👤 Creating Super Admin user...");
  const superAdminEmail = "admin@clinic.com";
  const existingAdmin = await User.findOne({ email: superAdminEmail });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("12345678", 12);
    await User.create({
      employeeId: "EMP-00001",
      firstName: "System",
      lastName: "Administrator",
      email: superAdminEmail,
      password: hashedPassword,
      phone: "+1-000-000-0000",
      role: superAdminRole._id,
      status: "active",
      isSuperAdmin: true,
      mustChangePassword: false,
      preferences: {
        theme: "light",
        language: "en",
        timezone: "UTC",
        notifications: { email: true, browser: true },
      },
    });
    console.log("   ✓ Super Admin user created successfully!");
    console.log("   📧 Email: admin@clinic.com");
    console.log("   🔑 Password: 12345678");
    console.log("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN");
  } else {
    console.log("   ✓ Super Admin user already exists");
    console.log("   📧 Email: admin@clinic.com");
    console.log("   🔑 Password: 12345678");
  }

  // 4. No other data seeded (no departments, settings, or other roles)
  console.log("   ℹ️  No departments, settings, or other roles seeded");

  await mongoose.disconnect();
  console.log("\n🎉 Seed completed successfully!");
  console.log("   You can now start the application and login with:");
  console.log("   📧 Email: admin@clinic.com");
  console.log("   🔑 Password: 12345678");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});