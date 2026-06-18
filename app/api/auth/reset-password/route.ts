import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { apiSuccess, apiError } from "@/lib/utils";
import { auditLog } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, newPassword } = body;

  if (!token || !newPassword) return apiError("Token and new password are required", 400);
  if (newPassword.length < 8) return apiError("Password must be at least 8 characters", 400);

  await connectDB();

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) return apiError("Invalid or expired reset token", 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
    mustChangePassword: false,
    failedLoginAttempts: 0,
    status: "active",
    $unset: { passwordResetToken: "", passwordResetExpires: "", lockUntil: "" },
  });

  await auditLog({
    userId: user._id.toString(),
    action: "password_reset",
    module: "auth",
    description: `Password successfully reset for ${user.email}`,
    status: "success",
  });

  return apiSuccess(null, "Password reset successfully. You can now log in.");
}
