import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Doctor } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination } from "@/lib/utils";
import { hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "doctors", "view")) {
    return apiError("Forbidden", 403);
  }
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const [doctors, total] = await Promise.all([
    Doctor.find({})
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("user", "firstName lastName email phone avatar")
      .populate("department", "name code")
      .lean(),
    Doctor.countDocuments({}),
  ]);
  return apiSuccess(doctors, "Doctors fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "doctors", "create")) return apiError("Forbidden", 403);
  const body = await req.json();
  if (!body.user || !body.specialization) return apiError("User and specialization are required", 422);
  await connectDB();
  const { Doctor } = await import("@/models/clinical.model");
  const exists = await Doctor.findOne({ user: body.user });
  if (exists) return apiError("Doctor profile already exists for this user", 409);
  const doctor = await Doctor.create(body);
  const populated = await Doctor.findById(doctor._id).populate("user", "firstName lastName email phone").populate("department", "name code").lean();
  const { auditLog: log } = await import("@/lib/auth/audit");
  await log({ userId: session.user.id, action: "create", module: "doctors", description: `Created doctor profile ${doctor.doctorId}`, resourceId: doctor._id.toString() });
  return apiSuccess(populated, "Doctor profile created", 201);
}
