import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Settings } from "@/models/operations.model";
import { apiSuccess, apiError } from "@/lib/utils";
import { updateSettingsSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "settings", "view")) {
    return apiError("Forbidden", 403);
  }
  await connectDB();
  const settings = await Settings.findOne({}).lean();
  return apiSuccess(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "settings", "update")) {
    return apiError("Forbidden", 403);
  }
  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  await connectDB();
  const settings = await Settings.findOneAndUpdate({}, { ...parsed.data, updatedBy: session.user.id }, { upsert: true, new: true }).lean();
  await auditLog({ userId: session.user.id, action: "update", module: "settings", description: "Updated clinic settings" });
  return apiSuccess(settings, "Settings updated");
}
