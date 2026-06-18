/**
 * Seed script — run once to initialize the database.
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
  timezone: { type: String, default: "Asia/Karachi" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
  invoicePrefix: { type: String, default: "INV" },
  appointmentDuration: { type: Number, default: 30 },
  notificationSettings: {
    appointmentReminderHours: { type: Number, default: 24 },
    lowStockThreshold: { type: Number, default: 10 },
    emailEnabled: { type: Boolean, default: false },
    smsEnabled: { type: Boolean, default: false },
    whatsappEnabled: { type: Boolean, default: false },
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

const DEPARTMENTS = [
  { name: "General Medicine", code: "GM", description: "General outpatient and inpatient care" },
  { name: "Cardiology", code: "CARD", description: "Heart and cardiovascular disorders" },
  { name: "Orthopedics", code: "ORTH", description: "Bone, joint and muscle disorders" },
  { name: "Pediatrics", code: "PEDS", description: "Medical care for infants and children" },
  { name: "Gynecology", code: "GYN", description: "Women's reproductive health" },
  { name: "Radiology", code: "RAD", description: "Diagnostic imaging" },
  { name: "Laboratory", code: "LAB", description: "Clinical pathology and diagnostics" },
  { name: "Pharmacy", code: "PHARM", description: "Dispensing and pharmaceutical care" },
  { name: "Emergency", code: "ER", description: "Emergency and critical care" },
  { name: "Administration", code: "ADMIN", description: "Hospital administration and management" },
];

async function seed() {
  console.log("🌱 Starting database seed...");
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB");

  const Permission = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
  const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);
  const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
  const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

  // 1. Seed permissions
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

  // 3. Create default roles
  const defaultRoles = [
    {
      name: "Doctor",
      slug: "doctor",
      description: "Medical doctor with patient and clinical access",
      permModules: ["patients", "appointments", "emr", "prescriptions", "lab", "opd"],
    },
    {
      name: "Receptionist",
      slug: "receptionist",
      description: "Front desk and appointment management",
      permModules: ["patients", "appointments", "billing"],
    },
    {
      name: "Accountant",
      slug: "accountant",
      description: "Billing, invoicing and financial records",
      permModules: ["billing", "expenses", "reports"],
    },
    {
      name: "Lab Staff",
      slug: "lab_staff",
      description: "Laboratory operations and result entry",
      permModules: ["lab", "patients"],
    },
    {
      name: "Pharmacist",
      slug: "pharmacist",
      description: "Pharmacy and medicine management",
      permModules: ["pharmacy", "prescriptions", "patients"],
    },
    {
      name: "Nurse",
      slug: "nurse",
      description: "Nursing care and patient monitoring",
      permModules: ["patients", "appointments", "emr", "opd"],
    },
  ];

  for (const roleDef of defaultRoles) {
    const exists = await Role.findOne({ slug: roleDef.slug });
    if (!exists) {
      const rolePerms = permDocs.filter((p) =>
        roleDef.permModules.includes((p as unknown as { module: string }).module)
      );
      await Role.create({
        name: roleDef.name,
        slug: roleDef.slug,
        description: roleDef.description,
        permissions: rolePerms.map((p) => p._id),
        isSystem: false,
        isActive: true,
      });
      console.log(`   ✓ ${roleDef.name} role created`);
    }
  }

  // 4. Create Super Admin user
  const superAdminEmail = "admin@clinic.com";
  const existingAdmin = await User.findOne({ email: superAdminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin@123456", 12);
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
    console.log("   ✓ Super Admin user created");
    console.log("   📧 Email: admin@clinic.com");
    console.log("   🔑 Password: Admin@123456");
    console.log("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN");
  } else {
    console.log("   ✓ Super Admin user already exists");
  }

  // 5. Seed departments
  console.log("🏥 Seeding departments...");
  for (const dept of DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { code: dept.code },
      dept,
      { upsert: true, new: true }
    );
  }
  console.log(`   ✓ ${DEPARTMENTS.length} departments seeded`);

  // 6. Initialize settings
  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create({
      clinicName: "My Clinic",
      clinicType: "clinic",
      phone: "+1-000-000-0000",
      email: "admin@clinic.com",
      currency: "PKR",
      timezone: "Asia/Karachi",
      dateFormat: "DD/MM/YYYY",
      invoicePrefix: "INV",
      appointmentDuration: 30,
      notificationSettings: {
        appointmentReminderHours: 24,
        lowStockThreshold: 10,
        emailEnabled: false,
        smsEnabled: false,
        whatsappEnabled: false,
      },
    });
    console.log("   ✓ Default settings initialized");
  }

  await mongoose.disconnect();
  console.log("\n🎉 Seed completed successfully!");
  console.log("   You can now start the application and login with admin@clinic.com");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
