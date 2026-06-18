import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders, generateRandomToken } from "@/lib/utils";
import { createUserSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "users", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const search = sp.get("search") || "";
  const status = sp.get("status") || "";
  const role = sp.get("role") || "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("role", "name slug")
      .select("-password -passwordResetToken")
      .lean(),
    User.countDocuments(filter),
  ]);

  return apiSuccess(users, "Users fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "users", "create")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  const exists = await User.findOne({ email: parsed.data.email });
  if (exists) return apiError("User with this email already exists", 409);

  const tempPassword = parsed.data.password || generateRandomToken(12);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await User.create({
    ...parsed.data,
    password: hashedPassword,
    mustChangePassword: parsed.data.mustChangePassword ?? true,
    createdBy: session.user.id,
  });

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "users",
    description: `Created user: ${user.firstName} ${user.lastName} (${user.email})`,
    resourceId: user._id.toString(),
    resourceType: "User",
    ipAddress: getIpFromHeaders(req.headers),
  });

  const populated = await User.findById(user._id)
    .populate("role", "name slug")
    .populate("createdBy", "firstName lastName email") // ← Added this
    .select("-password")
    .lean();

  // In production: send welcome email with tempPassword
  return apiSuccess(
    { user: populated, tempPassword: parsed.data.password ? undefined : tempPassword },
    "User created successfully",
    201
  );
}
