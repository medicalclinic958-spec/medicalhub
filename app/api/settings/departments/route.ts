import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Department } from "@/models/clinical.model";
import { apiSuccess, apiError } from "@/lib/utils";
import { hasPermission } from "@/lib/auth/audit";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  await connectDB();
  const departments = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
  return apiSuccess(departments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "settings", "update")) return apiError("Forbidden", 403);
  const body = await req.json();
  if (!body.name || !body.code) return apiError("Name and code are required", 422);
  await connectDB();
  const dept = await Department.create({ name: body.name, code: body.code.toUpperCase(), description: body.description });
  return apiSuccess(dept, "Department created", 201);
}
