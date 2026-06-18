import { NextRequest } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { apiSuccess, apiError } from "@/lib/utils";
import { auditLog } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;

  if (!email) return apiError("Email is required", 400);

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) return apiSuccess(null, "If that email exists, a reset link was sent");

  // Generate reset token
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: expires,
  });

  // TODO: Send email with token
  // const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  // await sendEmail({ to: user.email, subject: "Password Reset", body: `Reset: ${resetUrl}` });

  await auditLog({
    userId: user._id.toString(),
    action: "password_reset",
    module: "auth",
    description: `Password reset requested for ${user.email}`,
    status: "success",
  });

  // In dev: return token directly for testing (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
    console.log(`[DEV] Reset URL: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}`);
  }

  return apiSuccess(null, "If that email exists, a reset link was sent");
}
