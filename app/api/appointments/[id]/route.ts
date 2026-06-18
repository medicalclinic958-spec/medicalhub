import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Appointment } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { updateAppointmentSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  await connectDB();
  const { id } = await params;
  const apt = await Appointment.findById(id)
    .populate("patient")
    .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
    .populate("department")
    .lean();
  if (!apt) return apiError("Appointment not found", 404);
  return apiSuccess(apt);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "appointments", "update")) return apiError("Forbidden", 403);
  const body = await req.json();
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  await connectDB();
  const { id } = await params;
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "checked_in") updateData.checkedInAt = new Date();
  if (parsed.data.status === "completed") updateData.completedAt = new Date();
  const apt = await Appointment.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!apt) return apiError("Appointment not found", 404);
  await auditLog({ userId: session.user.id, action: "update", module: "appointments", description: `Updated appointment status to ${parsed.data.status}`, resourceId: id, ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(apt, "Appointment updated");
}
