import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createMedicineSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const search = sp.get("search") || "";
  const lowStock = sp.get("lowStock") === "true";
  const isActive = sp.get("isActive");
  const filter: Record<string, unknown> = {};
  if (isActive !== undefined && isActive !== null && isActive !== "") filter.isActive = isActive === "true";
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { genericName: { $regex: search, $options: "i" } }];
  if (lowStock) filter.$expr = { $lte: ["$currentStock", "$minStockLevel"] };
  const [medicines, total] = await Promise.all([
    Medicine.find(filter).skip(skip).limit(limit).sort({ name: 1 }).lean(),
    Medicine.countDocuments(filter),
  ]);
  return apiSuccess(medicines, "Medicines fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "create")) return apiError("Forbidden", 403);
  const body = await req.json();
  const parsed = createMedicineSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  await connectDB();
  const medicine = await Medicine.create(parsed.data);
  await auditLog({ userId: session.user.id, action: "create", module: "pharmacy", description: `Added medicine: ${medicine.name}`, resourceId: medicine._id.toString(), ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(medicine, "Medicine added", 201);
}
