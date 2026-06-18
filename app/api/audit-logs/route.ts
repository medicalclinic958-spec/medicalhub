import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { AuditLog } from "@/models/user.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination } from "@/lib/utils";
import { hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "audit_logs", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const action = sp.get("action") || "";
  const module = sp.get("module") || "";
  const userId = sp.get("user") || "";
  const status = sp.get("status") || "";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (module) filter.module = module;
  if (userId) filter.user = userId;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as Record<string,unknown>).$gte = new Date(from);
    if (to) (filter.createdAt as Record<string,unknown>).$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName email employeeId")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return apiSuccess(logs, "Audit logs fetched", 200, buildPagination(total, page, limit));
}
