import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Prescription, Doctor, EMR } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createPrescriptionSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import mongoose from "mongoose";

interface Params { params: Promise<{ id: string }> } // ← Add this

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "prescriptions", "view")) {
    return apiError("Forbidden", 403);
  }
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const patient = sp.get("patient") || "";
  const filter: Record<string, unknown> = {};
  if (patient) filter.patient = patient;
  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("patient", "firstName lastName patientId")
      .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
      .lean(),
    Prescription.countDocuments(filter),
  ]);
  return apiSuccess(prescriptions, "Prescriptions fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "prescriptions", "create")) {
    return apiError("Forbidden", 403);
  }
  const body = await req.json();
  const parsed = createPrescriptionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  await connectDB();
  const doctor = await Doctor.findOne({ user: session.user.id });
  const prescription = await Prescription.create({
    ...parsed.data,
    doctor: doctor?._id || body.doctor,
  });
  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "prescriptions",
    description: `Created prescription ${prescription.prescriptionId}`,
    resourceId: prescription._id.toString(),
    ipAddress: getIpFromHeaders(req.headers),
  });
  return apiSuccess(prescription, "Prescription created", 201);
}
