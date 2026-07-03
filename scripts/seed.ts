import dns from "dns/promises";

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_PERMISSIONS = [
  { module: "patients", action: "view", description: "View patient records" },
  { module: "patients", action: "create", description: "Create new patients" },
  { module: "patients", action: "update", description: "Update patient records" },
  { module: "patients", action: "delete", description: "Archive patients" },
  { module: "appointments", action: "view", description: "View appointments" },
  { module: "appointments", action: "create", description: "Create appointments" },
  { module: "appointments", action: "update", description: "Update appointments" },
  { module: "appointments", action: "delete", description: "Cancel appointments" },
  { module: "doctors", action: "view", description: "View doctors" },
  { module: "doctors", action: "create", description: "Create doctor profiles" },
  { module: "doctors", action: "update", description: "Update doctor profiles" },
  { module: "doctors", action: "delete", description: "Remove doctor profiles" },
  { module: "billing", action: "view", description: "View invoices" },
  { module: "billing", action: "create", description: "Create invoices" },
  { module: "billing", action: "update", description: "Update invoices / record payment" },
  { module: "billing", action: "delete", description: "Cancel invoices" },
  { module: "lab", action: "view", description: "View lab tests" },
  { module: "lab", action: "create", description: "Order lab tests" },
  { module: "lab", action: "update", description: "Update lab tests" },
  { module: "lab", action: "approve", description: "Approve lab results" },
  { module: "labcatalog", action: "view", description: "View lab catalog" },
  { module: "labcatalog", action: "create", description: "Create lab tests" },
  { module: "labcatalog", action: "update", description: "Update lab tests" },
  { module: "labcatalog", action: "delete", description: "Delete lab tests" },
  { module: "pharmacy", action: "view", description: "View pharmacy" },
  { module: "pharmacy", action: "create", description: "Add medicines" },
  { module: "pharmacy", action: "update", description: "Update medicines" },
  { module: "pharmacy", action: "delete", description: "Remove medicines" },
  { module: "inventory", action: "view", description: "View inventory" },
  { module: "inventory", action: "create", description: "Add inventory items" },
  { module: "inventory", action: "update", description: "Update inventory" },
  { module: "inventory", action: "delete", description: "Delete inventory items" },
  { module: "staff", action: "view", description: "View staff" },
  { module: "staff", action: "create", description: "Add staff" },
  { module: "staff", action: "update", description: "Update staff" },
  { module: "staff", action: "delete", description: "Remove staff" },
  { module: "reports", action: "view", description: "View reports" },
  { module: "reports", action: "export", description: "Export reports" },
  { module: "users", action: "view", description: "View users" },
  { module: "users", action: "create", description: "Create users" },
  { module: "users", action: "update", description: "Update users" },
  { module: "users", action: "delete", description: "Deactivate users" },
  { module: "roles", action: "view", description: "View roles" },
  { module: "roles", action: "create", description: "Create roles" },
  { module: "roles", action: "update", description: "Update roles" },
  { module: "roles", action: "delete", description: "Delete roles" },
  { module: "settings", action: "view", description: "View settings" },
  { module: "settings", action: "update", description: "Update settings" },
  { module: "audit_logs", action: "view", description: "View audit logs" },
  { module: "emr", action: "view", description: "View EMR records" },
  { module: "emr", action: "create", description: "Create EMR records" },
  { module: "emr", action: "update", description: "Update EMR records" },
  { module: "prescriptions", action: "view", description: "View prescriptions" },
  { module: "prescriptions", action: "create", description: "Create prescriptions" },
  { module: "prescriptions", action: "update", description: "Update prescriptions" },
  { module: "expenses", action: "view", description: "View expenses" },
  { module: "expenses", action: "create", description: "Add expenses" },
  { module: "expenses", action: "update", description: "Update expenses" },
  { module: "expenses", action: "delete", description: "Delete expenses" },
  { module: "expenses", action: "approve", description: "Approve expenses" },
  { module: "opd", action: "view", description: "View OPD" },
  { module: "opd", action: "create", description: "Create OPD records" },
  { module: "opd", action: "update", description: "Update OPD records" },
];

async function seedPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    const Permission = mongoose.model("Permission", new mongoose.Schema({
      module: String,
      action: String,
      description: String,
    }, { timestamps: true }));

    let created = 0;
    let updated = 0;

    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await Permission.findOne({ module: perm.module, action: perm.action });
      if (existing) {
        if (existing.description !== perm.description) {
          existing.description = perm.description;
          await existing.save();
          updated++;
        }
      } else {
        await Permission.create(perm);
        created++;
      }
    }

    console.log(`✅ Seeded ${created} new permissions, updated ${updated} existing`);
    console.log(`Total permissions: ${await Permission.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    process.exit(1);
  }
}

seedPermissions();