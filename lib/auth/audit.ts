import connectDB from "@/lib/db/mongoose";

interface AuditParams {
  userId?: string;
  action: string;
  module: string;
  description: string;
  resourceId?: string;
  resourceType?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "failure";
}

/**
 * Create an audit log entry. Fire-and-forget — never throws.
 */
export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await connectDB();
    const { AuditLog } = await import("@/models/user.model");
    await AuditLog.create({
      user: params.userId || undefined,
      action: params.action,
      module: params.module,
      description: params.description,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      previousData: params.previousData,
      newData: params.newData,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: params.status ?? "success",
    });
  } catch {
    // Audit failures must never break the main request
    console.error("[audit] Failed to write log:", params.action, params.module);
  }
}

// Re-export hasPermission from utils for convenience
export { hasPermission } from "@/lib/utils";

// ─── DEFAULT PERMISSIONS SEED DATA ───────────────────────
export const DEFAULT_PERMISSIONS = [
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
