// app/api/pharmacy/barcode/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

const barcodeQuerySchema = z.object({
    barcode: z.string().trim().min(1, "Barcode is required"),
});

const assignBarcodeSchema = z.object({
    medicineId: z.string().min(1, "Medicine ID is required"),
    barcode: z.string().trim().min(1, "Barcode is required"),
});

// GET /api/pharmacy/barcode?barcode=xxxx
// Scan lookup — frontend calls this when a barcode is scanned
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "view")) return apiError("Forbidden", 403);

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const parsed = barcodeQuerySchema.safeParse({ barcode: sp.get("barcode") });
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const medicine = await Medicine.findOne({ barcode: parsed.data.barcode })
        .populate("supplier", "name contactPerson phone email")
        .lean();

    if (!medicine) {
        return apiSuccess({ status: "not_found", barcode: parsed.data.barcode }, "No medicine found for this barcode");
    }

    return apiSuccess({ status: "found", medicine }, "Medicine found");
}

// POST /api/pharmacy/barcode
// Assign/update a barcode on an existing medicine
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "update")) return apiError("Forbidden", 403);

    const body = await req.json();
    const parsed = assignBarcodeSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    await connectDB();
    const { medicineId, barcode } = parsed.data;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) return apiError("Medicine not found", 404);

    // Ensure this barcode isn't already assigned to a different medicine
    const existing = await Medicine.findOne({ barcode, _id: { $ne: medicineId } }).lean();
    if (existing) return apiError("This barcode is already assigned to another medicine", 409);

    medicine.barcode = barcode;
    await medicine.save();

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "pharmacy",
        description: `Assigned barcode to medicine: ${medicine.name}`,
        resourceId: medicine._id.toString(),
        resourceType: "Medicine",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(medicine, "Barcode assigned", 200);
}