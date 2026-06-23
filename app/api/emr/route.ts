import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { EMR, Doctor, Prescription } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createEMRSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "emr", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const patient = sp.get("patient") || "";
  const doctorId = sp.get("doctor") || "";
  const fromDate = sp.get("fromDate") || "";
  const toDate = sp.get("toDate") || "";

  const filter: Record<string, unknown> = {};

  // Doctor scope: only show their own EMR records
  if (!session.user.isSuperAdmin) {
    const { Doctor } = await import("@/models/clinical.model");
    const doctor = await Doctor.findOne({ user: session.user.id }).lean();
    if (doctor) {
      filter.doctor = doctor._id;
    }
  }

  // Admin can filter by specific doctor
  if (session.user.isSuperAdmin && doctorId) {
    filter.doctor = doctorId;
  }

  if (patient) filter.patient = patient;

  if (fromDate || toDate) {
    (filter as any).visitDate = {};
    if (fromDate) (filter as any).visitDate.$gte = new Date(fromDate);
    if (toDate) (filter as any).visitDate.$lte = new Date(toDate);
  }

  const [records, total] = await Promise.all([
    EMR.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ visitDate: -1 })
      .populate("patient", "firstName lastName patientId phone")
      .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName email" } })
      .populate("appointment", "appointmentId scheduledDate")
      .populate("createdBy", "firstName lastName")
      .lean(),
    EMR.countDocuments(filter),
  ]);

  return apiSuccess(records, "EMR records fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "emr", "create")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createEMRSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 422);
  }

  await connectDB();

  // Compute BMI if height and weight provided
  const vitals = { ...parsed.data.vitals };
  if (vitals?.weight && vitals?.height) {
    const h = vitals.height / 100;
    vitals.bmi = Math.round((vitals.weight / (h * h)) * 10) / 10;
  }

  // Find doctor by user ID
  const doctor = await Doctor.findOne({ user: session.user.id });
  if (!doctor) {
    return apiError("Doctor profile not found for this user", 404);
  }

  // Create EMR record
  const emr = await EMR.create({
    ...parsed.data,
    vitals,
    doctor: doctor._id,
    createdBy: session.user.id,
    visitDate: new Date(),
  });

  // Handle prescriptions if provided
  let prescriptions = [];
  if (parsed.data.prescriptions && parsed.data.prescriptions.length > 0) {
    const prescriptionData = {
      patient: parsed.data.patient,
      doctor: doctor._id,
      emr: emr._id,
      appointment: parsed.data.appointment || null,
      medicines: parsed.data.prescriptions.map((p: any) => ({
        medicineName: p.medicine,
        genericName: p.genericName || "",
        strength: p.strength || "",
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        durationDays: p.durationDays || 0,
        route: p.route || "oral",
        instructions: p.instructions || "",
        quantity: p.quantity || 0,
        isRefillable: p.isRefillable || false,
        refillsRemaining: p.refillsRemaining || 0,
      })),
      notes: parsed.data.prescriptionNotes || "",
      type: parsed.data.prescriptionType || "new",
      duration: {
        value: parsed.data.durationValue || 5,
        unit: parsed.data.durationUnit || "days",
      },
      allergies: parsed.data.allergies || [],
      safetyChecks: {
        allergenChecked: parsed.data.allergenChecked || false,
        interactionsChecked: parsed.data.interactionsChecked || false,
        checkedBy: session.user.id,
        checkedAt: new Date(),
      },
      validUntil: new Date(Date.now() + (parsed.data.durationValue || 5) * 24 * 60 * 60 * 1000),
      prescribedDate: new Date(),
      createdBy: session.user.id,
    };

    prescriptions = await Prescription.create(prescriptionData);
  }

  // Populate the created EMR
  const populated = await EMR.findById(emr._id)
    .populate("patient", "firstName lastName patientId")
    .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
    .populate("createdBy", "firstName lastName")
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "emr",
    description: `Created EMR for patient ${parsed.data.patient}`,
    resourceId: emr._id.toString(),
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess({
    emr: populated,
    prescriptions: prescriptions,
  }, "EMR record created successfully", 201);
}