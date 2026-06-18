import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Role, Permission } from "@/models/user.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { createRoleSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "roles", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();

  const roles = await Role.find({})
    .populate("permissions")
    .sort({ createdAt: 1 })
    .lean();

  return apiSuccess(roles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "roles", "create")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  const slug = parsed.data.name.toLowerCase().replace(/\s+/g, "_");
  const exists = await Role.findOne({ slug });
  if (exists) return apiError("A role with this name already exists", 409);

  const role = await Role.create({
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    permissions: parsed.data.permissions,
    createdBy: session.user.id,
  });

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "roles",
    description: `Created role: ${role.name}`,
    resourceId: role._id.toString(),
    resourceType: "Role",
    ipAddress: getIpFromHeaders(req.headers),
  });

  const populated = await Role.findById(role._id).populate("permissions").lean();
  return apiSuccess(populated, "Role created successfully", 201);
}
