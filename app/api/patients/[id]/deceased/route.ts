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

    // Only superadmin or specific permission
    if (!session.user.isSuperAdmin) {
        return apiError("Only super admin can mark patient as deceased", 403);
    }

    const body = await req.json();
    const { dateOfDeath, causeOfDeath } = body;

    await connectDB();
    const { id } = await params;

    const patient = await Patient.findByIdAndUpdate(
        id,
        {
            status: "deceased",
            dateOfDeath: dateOfDeath || new Date(),
            causeOfDeath: causeOfDeath || ""
        },
        { new: true }
    ).lean();

    // await auditLog({ ...});
    return apiSuccess(patient, "Patient marked as deceased");
}