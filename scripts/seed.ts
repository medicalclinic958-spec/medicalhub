/**
 * HARD RESET SEED — wipes the entire MongoDB database and seeds a fresh customer install.
 *
 * Usage:
 *   npm run seed
 *   npm run seed -- --force
 *   SEED_HARD_RESET=YES npm run seed
 *
 * Optional env:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 */

import dns from "dns/promises";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { DEFAULT_PERMISSIONS } from "../constants/permissions";
import { Permission, Role, User } from "../models/user.model";
import { Settings } from "../models/operations.model";
import {
  NEXT_PUBLIC_CLINIC_NAME,
  NEXT_PUBLIC_CLINIC_TAGLINE,
  NEXT_PUBLIC_CLINIC_ADDRESS,
  NEXT_PUBLIC_CLINIC_PHONE,
  NEXT_PUBLIC_CLINIC_EMAIL,
  NEXT_PUBLIC_LOGO_URL,
} from "../constants/ClinicDetails";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const FORCE_FLAG = process.argv.includes("--force");
const HARD_RESET_CONFIRMED =
  process.env.SEED_HARD_RESET === "YES" || FORCE_FLAG;

function requireHardResetConfirmation() {
  if (HARD_RESET_CONFIRMED) return;

  console.error("\n❌ Hard reset refused.");
  console.error("This command deletes ALL data in the configured MongoDB database.");
  console.error("Re-run with one of:");
  console.error("  npm run seed -- --force");
  console.error("  SEED_HARD_RESET=YES npm run seed\n");
  process.exit(1);
}

async function hardResetAndSeed() {
  requireHardResetConfirmation();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not set.");
    process.exit(1);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@clinic.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const adminPhone = process.env.ADMIN_PHONE || "03001234567";
  const adminFirstName = process.env.ADMIN_FIRST_NAME || "Super";
  const adminLastName = process.env.ADMIN_LAST_NAME || "Admin";

  console.log("\n⚠️  HARD RESET starting...");
  console.log(`Database : ${mongoUri.replace(/\/\/.*@/, "//***@")}`);

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const dbName = mongoose.connection.name;
  console.log(`🗑️  Dropping database "${dbName}" (all collections)...`);
  await mongoose.connection.dropDatabase();
  console.log("✅ Database wiped completely");

  console.log(`📋 Seeding ${DEFAULT_PERMISSIONS.length} permissions...`);
  const permissions = await Permission.insertMany(DEFAULT_PERMISSIONS);
  console.log(`✅ Permissions seeded: ${permissions.length}`);

  console.log("👤 Creating Super Admin role...");
  const role = await Role.create({
    name: "Super Admin",
    slug: "super-admin",
    description: "Full system access for clinic owner / administrator",
    permissions: permissions.map((permission) => permission._id),
    isSystem: true,
    isActive: true,
  });
  console.log("✅ Super Admin role created");

  console.log("🔐 Creating Super Admin user...");
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const admin = await User.create({
    employeeId: "EMP-00001",
    firstName: adminFirstName,
    lastName: adminLastName,
    email: adminEmail,
    password: hashedPassword,
    phone: adminPhone,
    role: role._id,
    status: "active",
    isSuperAdmin: true,
    mustChangePassword: true,
  });

  role.createdBy = admin._id;
  await role.save();

  console.log("🏥 Creating default clinic settings...");
  await Settings.create({
    clinicName: NEXT_PUBLIC_CLINIC_NAME,
    clinicType: "clinic",
    logo: NEXT_PUBLIC_LOGO_URL,
    address: {
      street: NEXT_PUBLIC_CLINIC_ADDRESS,
    },
    phone: NEXT_PUBLIC_CLINIC_PHONE,
    email: NEXT_PUBLIC_CLINIC_EMAIL,
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
    updatedBy: admin._id,
  });
  console.log("✅ Clinic settings seeded");

  console.log("\n🎉 Customer-ready seed completed.");
  console.log("──────────────────────────────────────");
  console.log(`Clinic   : ${NEXT_PUBLIC_CLINIC_NAME}`);
  console.log(`Tagline  : ${NEXT_PUBLIC_CLINIC_TAGLINE}`);
  console.log(`Email    : ${adminEmail}`);
  console.log(`Password : ${adminPassword}`);
  console.log("Note     : Admin must change password on first login.");
  console.log("──────────────────────────────────────\n");
}

hardResetAndSeed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  });
