import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { changePasswordSchema } from "@/lib/validations";
import { auditLog } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  const user = await User.findById(session.user.id).select("+password");
  if (!user) return apiError("User not found", 404);

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!isValid) return apiError("Current password is incorrect", 400);

  const isSame = await bcrypt.compare(parsed.data.newPassword, user.password);
  if (isSame) return apiError("New password must be different from current password", 400);

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await User.findByIdAndUpdate(session.user.id, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    mustChangePassword: false,
  });

  await auditLog({
    userId: session.user.id,
    action: "update",
    module: "auth",
    description: "User changed their password",
    ipAddress: getIpFromHeaders(req.headers),
    status: "success",
  });

  return apiSuccess(null, "Password changed successfully");
}
