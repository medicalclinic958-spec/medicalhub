import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Doctor } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { hasPermission, auditLog } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "doctors", "view")) {
    return apiError("Forbidden", 403);
  }
  await connectDB();
  const { id } = await params;
  const doctor = await Doctor.findById(id)
    .populate("user", "firstName lastName email phone avatar status")
    .populate("department", "name code")
    .lean();
  if (!doctor) return apiError("Doctor not found", 404);
  return apiSuccess(doctor);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "doctors", "update")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  await connectDB();
  const { id } = await params;

  const existing = await Doctor.findById(id).lean();
  if (!existing) return apiError("Doctor not found", 404);

  // Allowed fields to update
  const allowed = [
    "specialization", "qualifications", "experience", "consultationFee",
    "department", "bio", "languages", "isAvailable"
  ];

  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key];
  }

  const doctor = await Doctor.findByIdAndUpdate(id, updateData, { new: true })
    .populate("user", "firstName lastName email phone avatar")
    .populate("department", "name code")
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "update",
    module: "doctors",
    description: `Updated doctor ${doctor?.doctorId}`,
    resourceId: id,
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(doctor, "Doctor updated successfully");
}
