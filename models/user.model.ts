import mongoose, { Schema, Document, Model } from "mongoose";

// ─── PERMISSION MODEL ─────────────────────────────────────
export interface IPermission extends Document {
  module: string;
  action: string;
  description: string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    module: { type: String, required: true, index: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: false }
);

PermissionSchema.index({ module: 1, action: 1 }, { unique: true });

// ─── ROLE MODEL ───────────────────────────────────────────
export interface IRole extends Document {
  name: string;
  slug: string;
  description: string;
  permissions: mongoose.Types.ObjectId[];
  isSystem: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ─── USER MODEL ───────────────────────────────────────────
export interface IUser extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  avatar?: string;
  role: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "suspended" | "locked";
  isSuperAdmin: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  mustChangePassword: boolean;
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    notifications: { email: boolean; browser: boolean };
  };
  createdBy?: mongoose.Types.ObjectId;
  get fullName(): string;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, unique: true, sparse: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true },
    avatar: { type: String },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    status: { type: String, enum: ["active", "inactive", "suspended", "locked"], default: "active", index: true },
    isSuperAdmin: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    lastLoginIp: { type: String },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    mustChangePassword: { type: Boolean, default: false },
    preferences: {
      theme: { type: String, default: "light" },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      notifications: {
        email: { type: Boolean, default: true },
        browser: { type: Boolean, default: true },
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// Auto-increment employeeId
UserSchema.pre("save", async function () {
  if (!this.employeeId) {
    const count = await mongoose.models.User.countDocuments();
    this.employeeId = `EMP-${String(count + 1).padStart(5, "0")}`;
  }
});

// ─── AUDIT LOG MODEL ──────────────────────────────────────
export interface IAuditLog extends Document {
  user?: mongoose.Types.ObjectId;
  action: string;
  module: string;
  description: string;
  resourceId?: string;
  resourceType?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    description: { type: String, required: true },
    resourceId: { type: String },
    resourceType: { type: String },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ["success", "failure"], default: "success" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index: auto-delete audit logs after 2 years (optional, remove if you want to keep forever)
// AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// ─── NOTIFICATION MODEL ───────────────────────────────────
export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ─── EXPORT MODELS ────────────────────────────────────────
function getModel<T extends Document>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const Permission = getModel<IPermission>("Permission", PermissionSchema);
export const Role = getModel<IRole>("Role", RoleSchema);
export const User = getModel<IUser>("User", UserSchema);
export const AuditLog = getModel<IAuditLog>("AuditLog", AuditLogSchema);
export const Notification = getModel<INotification>("Notification", NotificationSchema);
