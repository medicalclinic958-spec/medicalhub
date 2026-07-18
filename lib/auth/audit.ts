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

export { DEFAULT_PERMISSIONS } from "@/constants/permissions";
