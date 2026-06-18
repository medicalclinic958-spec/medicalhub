import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Appointment } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders, startOfDay, endOfDay } from "@/lib/utils";
import { createAppointmentSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "appointments", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const filter: Record<string, unknown> = {};

  const status = sp.get("status") || "";
  const date = sp.get("date") || "";
  const doctorId = sp.get("doctor") || "";
  const patientId = sp.get("patient") || "";
  const today = sp.get("today") === "true";

  if (status) filter.status = { $in: status.split(",") };
  if (doctorId) filter.doctor = doctorId;
  if (patientId) filter.patient = patientId;

  if (today) {
    const now = new Date();
    filter.scheduledDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
  } else if (date) {
    const d = new Date(date);
    filter.scheduledDate = { $gte: startOfDay(d), $lte: endOfDay(d) };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .populate("patient", "firstName lastName patientId phone")
      .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" }, select: "consultationFee specialization" })
      .populate("department", "name code")
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return apiSuccess(appointments, "Appointments fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "appointments", "create")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  // Import Patient model
  const { Patient } = await import("@/models/clinical.model");

  // Check patient status
  const patient = await Patient.findById(parsed.data.patient).lean();
  if (!patient) return apiError("Patient not found", 404);

  if (patient.status === "deceased") {
    return apiError("Cannot create appointment for deceased patient", 403);
  }

  if (patient.status === "archived") {
    return apiError("Cannot create appointment for archived patient", 403);
  }

  // Check doctor availability (basic check — no double booking)
  const conflict = await Appointment.findOne({
    doctor: parsed.data.doctor,
    scheduledDate: new Date(parsed.data.scheduledDate),
    scheduledTime: parsed.data.scheduledTime,
    status: { $nin: ["cancelled", "no_show"] },
  });

  if (conflict) {
    return apiError("Doctor already has an appointment at this time", 409);
  }

  const appointment = await Appointment.create({
    ...parsed.data,
    scheduledDate: new Date(parsed.data.scheduledDate),
    createdBy: session.user.id,
  });

  const populated = await Appointment.findById(appointment._id)
    .populate("patient", "firstName lastName patientId")
    .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "appointments",
    description: `Created appointment ${appointment.appointmentId}`,
    resourceId: appointment._id.toString(),
    resourceType: "Appointment",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(populated, "Appointment created successfully", 201);
}
