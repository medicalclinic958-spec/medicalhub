import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { EMR, Doctor, Prescription } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import mongoose from "mongoose";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "emr", "view")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiError("Invalid EMR ID", 400);
    }

    const record = await EMR.findById(id)
        .populate("patient", "firstName lastName patientId phone email")
        .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName email" } })
        .populate("appointment", "appointmentId scheduledDate scheduledTime status")
        .populate("createdBy", "firstName lastName email")
        .lean();

    if (!record) {
        return apiError("EMR record not found", 404);
    }

    // Get associated prescriptions
    const prescriptions = await Prescription.find({ emr: id })
        .populate("patient", "firstName lastName patientId")
        .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
        .lean();

    return apiSuccess({
        ...record,
        prescriptions: prescriptions || [],
    }, "EMR record fetched successfully");
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "emr", "update")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiError("Invalid EMR ID", 400);
    }

    const body = await req.json();

    // Check if record exists
    const existing = await EMR.findById(id).lean();
    if (!existing) {
        return apiError("EMR record not found", 404);
    }

    // Allowed fields to update
    const allowed = [
        "chiefComplaint",
        "symptoms",
        "vitals",
        "diagnosis",
        "treatmentPlan",
        "notes",
        "followUpDate",
        "appointment",
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
        if (key in body) updateData[key] = body[key];
    }

    // Handle vitals with BMI recalculation
    if (body.vitals) {
        const vitals = { ...body.vitals };
        if (vitals.weight && vitals.height) {
            const h = vitals.height / 100;
            vitals.bmi = Math.round((vitals.weight / (h * h)) * 10) / 10;
        }
        updateData.vitals = vitals;
    }

    // Handle followUpDate
    if (body.followUpDate) {
        updateData.followUpDate = new Date(body.followUpDate);
    }

    // Update EMR
    const updated = await EMR.findByIdAndUpdate(id, updateData, { new: true })
        .populate("patient", "firstName lastName patientId")
        .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
        .populate("createdBy", "firstName lastName")
        .lean();

    // ============ HANDLE PRESCRIPTIONS ============
    if (body.prescriptions !== undefined) {
        // Delete existing prescriptions for this EMR
        await Prescription.deleteMany({ emr: id });

        // Create new prescriptions if any
        if (body.prescriptions && body.prescriptions.length > 0) {
            const doctor = await Doctor.findOne({ user: session.user.id });
            const prescriptionData = {
                patient: body.patient || existing.patient,
                doctor: doctor?._id || existing.doctor,
                emr: id,
                appointment: body.appointment || existing.appointment || undefined,
                medicines: body.prescriptions.map((p: any) => ({
                    medicineName: p.medicine,
                    genericName: p.genericName || "",
                    strength: p.strength || "",
                    dosage: p.dosage,
                    frequency: p.frequency,
                    duration: p.duration || "",
                    durationDays: p.durationDays || 0,
                    route: p.route || "oral",
                    instructions: p.instructions || "",
                    quantity: p.quantity || 0,
                    isRefillable: p.isRefillable || false,
                    refillsRemaining: p.refillsRemaining || 0,
                })),
                notes: body.prescriptionNotes || "",
                type: body.prescriptionType || "new",
                duration: {
                    value: body.durationValue || 5,
                    unit: body.durationUnit || "days",
                },
                allergies: body.allergies || [],
                safetyChecks: {
                    allergenChecked: false,
                    interactionsChecked: false,
                    checkedBy: session.user.id,
                    checkedAt: new Date(),
                },
                validUntil: new Date(Date.now() + (body.durationValue || 5) * 24 * 60 * 60 * 1000),
                prescribedDate: new Date(),
                createdBy: session.user.id,
            };

            await Prescription.create(prescriptionData);
        }
    }

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "emr",
        description: `Updated EMR record ${id}`,
        resourceId: id,
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(updated, "EMR record updated successfully");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "emr", "delete")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiError("Invalid EMR ID", 400);
    }

    const record = await EMR.findById(id).lean();
    if (!record) {
        return apiError("EMR record not found", 404);
    }

    // Delete associated prescriptions first
    await Prescription.deleteMany({ emr: id });

    // Delete the EMR record
    await EMR.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "emr",
        description: `Deleted EMR record ${id}`,
        resourceId: id,
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "EMR record deleted successfully");
}