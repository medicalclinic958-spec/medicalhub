import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Patient } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
    // Restore archived to active
    const patient = await Patient.findByIdAndUpdate(
        id,
        { status: "active" },
        { new: true }
    ).lean();
    return apiSuccess(patient, "Patient restored");
}