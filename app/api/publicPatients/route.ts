// app/api/publicPatients/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/db/mongoose";
import { Patient } from "@/models/clinical.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination } from "@/lib/utils";

export async function GET(req: NextRequest) {
    await connectDB();

    const sp = req.nextUrl.searchParams;
    const { page, limit, skip } = getPaginationParams(sp);
    const search = sp.get("search") || "";
    const status = sp.get("status") || "";
    const bloodGroup = sp.get("bloodGroup") || "";

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (search) {
        filter.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { patientId: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const [patients, total] = await Promise.all([
        Patient.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("registeredBy", "firstName lastName")
            .lean(),
        Patient.countDocuments(filter),
    ]);

    return apiSuccess(patients, "Patients fetched", 200, buildPagination(total, page, limit));
}