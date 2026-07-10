import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Appointment } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders, startOfDay, endOfDay } from "@/lib/utils";
import { createAppointmentSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { NotificationService } from "@/services/notification.service";

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

  // Doctor scope: only show their own appointments
  if (!session.user.isSuperAdmin) {
    const { Doctor } = await import("@/models/clinical.model");
    const doctor = await Doctor.findOne({ user: session.user.id }).lean();
    if (doctor) {
      filter.doctor = doctor._id;
    }
  }

  // Admin can filter by specific doctor
  if (session.user.isSuperAdmin) {
    const doctorId = sp.get("doctor") || "";
    if (doctorId) filter.doctor = doctorId;
  }

  const status = sp.get("status") || "";
  const date = sp.get("date") || "";
  const patientId = sp.get("patient") || "";
  const today = sp.get("today") === "true";
  const search = sp.get("search") || "";

  if (status) filter.status = { $in: status.split(",") };
  if (patientId) filter.patient = patientId;

  if (today) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    filter.scheduledDate = { 
      $gte: new Date(y, m, d, 0, 0, 0, 0), 
      $lte: new Date(y, m, d, 23, 59, 59, 999) 
    };
  } else if (date) {
    const [y, m, d] = date.split("-").map(Number);
    filter.scheduledDate = { 
      $gte: new Date(y, m - 1, d, 0, 0, 0, 0), 
      $lte: new Date(y, m - 1, d, 23, 59, 59, 999) 
    };
  }

  // Search by patient name, doctor name, or appointment ID
  if (search) {
    const { Patient } = await import("@/models/clinical.model");
    const patientIds = await Patient.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ],
    }).distinct("_id");

    const { User } = await import("@/models/user.model");
    const userIds = await User.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ],
    }).distinct("_id");

    const { Doctor } = await import("@/models/clinical.model");
    const doctorIds = await Doctor.find({ user: { $in: userIds } }).distinct("_id");

    filter.$or = [
      { patient: { $in: patientIds } },
      { doctor: { $in: doctorIds } },
      { appointmentId: { $regex: search, $options: "i" } },
    ];
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

  const doctorData = populated?.doctor as any;
  if (doctorData?.user?._id) {
    const patientData = populated?.patient as any;
    await NotificationService.create({
      userId: doctorData.user._id.toString(),
      type: "appointment_reminder",
      title: "New Appointment",
      message: `${patientData?.firstName} ${patientData?.lastName} has an appointment on ${new Date(populated?.scheduledDate).toLocaleDateString()} at ${populated?.scheduledTime}`,
      priority: "medium",
      actionUrl: `/appointments/${appointment._id}`,
      metadata: { appointmentId: appointment._id.toString() },
    });
  }
  return apiSuccess(populated, "Appointment created successfully", 201);
}
