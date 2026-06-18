import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models/user.model";
import { Doctor } from "@/models/clinical.model";
import { apiSuccess, apiError, getIpFromHeaders, generateRandomToken } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "users", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const { id } = await params;

  // Get user data
  const user = await User.findById(id)
    .populate("role", "name slug")
    .populate("createdBy", "firstName lastName email")
    .select("-password")
    .lean();

  if (!user) return apiError("User not found", 404);

  // Check if user is a doctor and fetch doctor details
  let doctorData = null;
  const doctor = await Doctor.findOne({ user: id })
    .populate("department", "name code")
    .lean();

  if (doctor) {
    doctorData = {
      _id: doctor._id,
      doctorId: doctor.doctorId,
      specialization: doctor.specialization,
      qualifications: doctor.qualifications,
      experience: doctor.experience,
      consultationFee: doctor.consultationFee,
      department: doctor.department,
      isAvailable: doctor.isAvailable,
      bio: doctor.bio,
      languages: doctor.languages,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }

  return apiSuccess({
    ...user,
    doctor: doctorData,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  // Check if user exists
  const existingUser = await User.findById(id).select("+password").lean();
  if (!existingUser) return apiError("User not found", 404);

  // ==================== SUPER ADMIN: RESET PASSWORD ====================
  if (body.resetPassword) {
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "users", "update")) {
      return apiError("Forbidden", 403);
    }

    // Generate temporary password
    const tempPassword = generateRandomToken(12);
    const hashed = await bcrypt.hash(tempPassword, 12);

    await User.findByIdAndUpdate(id, {
      password: hashed,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      $unset: { lockUntil: "" },
      status: "active"
    });

    await auditLog({
      userId: session.user.id,
      action: "password_reset",
      module: "users",
      description: `Admin reset password for user ${id}`,
      resourceId: id,
      ipAddress: getIpFromHeaders(req.headers)
    });

    return apiSuccess({ tempPassword }, "Password reset successfully. Temporary password generated.");
  }

  // ==================== USER: CHANGE OWN PASSWORD ====================
  if (body.currentPassword && body.newPassword) {
    // Verify current password
    const isMatch = await bcrypt.compare(body.currentPassword, existingUser.password);
    if (!isMatch) return apiError("Current password is incorrect", 401);

    // Validate new password
    if (body.newPassword.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }

    const hashed = await bcrypt.hash(body.newPassword, 12);
    await User.findByIdAndUpdate(id, {
      password: hashed,
      passwordChangedAt: new Date(),
      mustChangePassword: false
    });

    await auditLog({
      userId: session.user.id,
      action: "password_change",
      module: "users",
      description: `User changed own password`,
      resourceId: id,
      ipAddress: getIpFromHeaders(req.headers)
    });

    return apiSuccess(null, "Password changed successfully");
  }

  // ==================== GENERAL UPDATE ====================
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "users", "update")) {
    return apiError("Forbidden", 403);
  }

  // Prevent superadmin status changes
  if (existingUser.isSuperAdmin && body.status && body.status !== "active") {
    return apiError("Cannot change status of super administrator", 403);
  }

  const allowed = ["firstName", "lastName", "phone", "role", "department", "status"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key];
  }

  // Remove status if user is superadmin
  if (existingUser.isSuperAdmin) {
    delete updateData.status;
  }

  // ==================== SYNC DOCTOR AVAILABILITY ====================
  // Check if status is being updated
  if (body.status) {
    const doctor = await Doctor.findOne({ user: id }).lean();
    if (doctor) {
      // If user is suspended or inactive, set doctor unavailable
      if (body.status === "suspended" || body.status === "inactive" || body.status === "locked") {
        await Doctor.findByIdAndUpdate(doctor._id, { isAvailable: false });
        console.log(`Doctor ${doctor._id} set to unavailable due to user status: ${body.status}`);
      }
      // If user is active, set doctor available
      else if (body.status === "active") {
        await Doctor.findByIdAndUpdate(doctor._id, { isAvailable: true });
        console.log(`Doctor ${doctor._id} set to available due to user active`);
      }
    }
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true })
    .populate("role", "name slug")
    .select("-password")
    .lean();

  if (!user) return apiError("User not found", 404);

  await auditLog({
    userId: session.user.id,
    action: "update",
    module: "users",
    description: `Updated user ${id} (Status: ${existingUser.status} → ${body.status || 'no change'})`,
    resourceId: id,
    ipAddress: getIpFromHeaders(req.headers)
  });

  return apiSuccess(user, "User updated successfully");
}