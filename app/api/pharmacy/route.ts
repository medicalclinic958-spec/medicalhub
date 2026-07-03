import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createMedicineSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { NotificationService } from "@/services/notification.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const search = sp.get("search") || "";
  const lowStock = sp.get("lowStock") === "true";
  const category = sp.get("category");
  const isActive = sp.get("isActive");
  const filter: Record<string, unknown> = {};
  if (isActive !== undefined && isActive !== null && isActive !== "") filter.isActive = isActive === "true";
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { genericName: { $regex: search, $options: "i" } }];
  if (lowStock) filter.$expr = { $lte: ["$currentStock", "$minStockLevel"] };
  if (category) filter.category = category;
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

  const cleanData = { ...parsed.data };
  if (cleanData.supplier === "" || cleanData.supplier === null) delete cleanData.supplier;
  const medicine = await Medicine.create(cleanData);

  await auditLog({ userId: session.user.id, action: "create", module: "pharmacy", description: `Added medicine: ${medicine.name}`, resourceId: medicine._id.toString(), ipAddress: getIpFromHeaders(req.headers) });

  if (medicine.currentStock <= medicine.minStockLevel) {
    // Get all users with pharmacy permission or super admins
    const { User } = await import("@/models/user.model");
    const pharmacyUsers = await User.find({
      $or: [
        { isSuperAdmin: true },
        { permissions: { $in: ["pharmacy:view"] } }
      ]
    }).select("_id").lean();

    const userIds = pharmacyUsers.map(u => u._id.toString());
    if (userIds.length > 0) {
      await NotificationService.createBulk(userIds, {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${medicine.name} is low on stock (${medicine.currentStock} ${medicine.unit} remaining)`,
        priority: "high",
        actionUrl: `/pharmacy`,
        metadata: { medicineId: medicine._id.toString(), currentStock: medicine.currentStock },
      });
    }
  }
  return apiSuccess(medicine, "Medicine added", 201);
}
