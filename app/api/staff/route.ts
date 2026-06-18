import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination } from "@/lib/utils";
import { hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "staff", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const search = sp.get("search") || "";
  const status = sp.get("status") || "";
  const department = sp.get("department") || "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  const [staff, total] = await Promise.all([
    User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("role", "name slug")
      .select("-password -passwordResetToken")
      .lean(),
    User.countDocuments(filter),
  ]);

  return apiSuccess(staff, "Staff fetched", 200, buildPagination(total, page, limit));
}
