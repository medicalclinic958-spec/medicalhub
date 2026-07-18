import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Patient } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "patients", "update")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    const patient = await Patient.findByIdAndUpdate(
        id,
        { status: "active" },
        { new: true }
    ).lean();

    if (!patient) return apiError("Patient not found", 404);

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "patients",
        description: `Restored patient: ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
        resourceId: id,
        resourceType: "Patient",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(patient, "Patient restored");
}
