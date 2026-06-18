import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Role } from "@/models/user.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "roles", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const { id } = await params;
  const role = await Role.findById(id).populate("permissions").lean();
  if (!role) return apiError("Role not found", 404);
  return apiSuccess(role);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "roles", "update")) return apiError("Forbidden", 403);
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const role = await Role.findById(id);
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem && body.name && body.name !== role.name) return apiError("Cannot rename a system role", 400);
  const updated = await Role.findByIdAndUpdate(
    id,
    { name: body.name, description: body.description, permissions: body.permissions, isActive: body.isActive },
    { new: true }
  ).populate("permissions").lean();
  await auditLog({ userId: session.user.id, action: "update", module: "roles", description: `Updated role: ${role.name}`, resourceId: id, ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(updated, "Role updated successfully");
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!session.user.isSuperAdmin) return apiError("Only super admin can delete roles", 403);
  await connectDB();
  const { id } = await params;
  const role = await Role.findById(id);
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem) return apiError("System roles cannot be deleted", 400);
  const { User } = await import("@/models/user.model");
  const usersWithRole = await User.countDocuments({ role: id });
  if (usersWithRole > 0) return apiError(`Cannot delete: ${usersWithRole} user(s) are assigned this role`, 400);
  await Role.findByIdAndDelete(id);
  await auditLog({ userId: session.user.id, action: "delete", module: "roles", description: `Deleted role: ${role.name}`, resourceId: id, ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(null, "Role deleted successfully");
}
