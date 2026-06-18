"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
    ArrowLeft, Mail, Phone, Calendar, Shield, Edit2, Key, RefreshCw, Eye, EyeOff,
    Stethoscope, Award, Clock, DollarSign, Building,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input, Select,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface User {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: { _id: string; name: string; slug: string };
    status: string;
    isSuperAdmin: boolean;
    lastLogin?: string;
    lastLoginIp?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: { _id: string; firstName: string; lastName: string };
    doctor?: {
        _id: string;
        doctorId: string;
        specialization: string;
        qualifications: string[];
        experience: number;
        consultationFee: number;
        department: { _id: string; name: string; code: string };
        isAvailable: boolean;
        bio: string;
        languages: string[];
        createdAt: string;
        updatedAt: string;
    };
}

export function UserDetailClient({ userId }: { userId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetPassword, setResetPassword] = useState("");

    const isSA = session?.user.isSuperAdmin;
    const isOwnProfile = session?.user.id === userId;

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["user", userId],
        queryFn: () => axios.get(`/api/users/${userId}`).then(r => r.data),
        enabled: !!userId,
    });

    const { data: rolesData } = useQuery({
        queryKey: ["roles-select"],
        queryFn: () => axios.get("/api/roles").then(r => r.data),
        enabled: editOpen,
    });

    const roles = rolesData?.data || [];

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "",
            status: "",
        },
    });

    const passwordForm = useForm({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/users/${userId}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["user", userId] });
            qc.invalidateQueries({ queryKey: ["users"] });
            setEditOpen(false);
            setError("");
            setSuccess("User updated successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to update"),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/users/${userId}`, data),
        onSuccess: () => {
            setPasswordOpen(false);
            passwordForm.reset();
            setError("");
            setSuccess("Password changed successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to change password"),
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => axios.put(`/api/users/${userId}`, { resetPassword: true }),
        onSuccess: (res) => {
            setResetPassword(res.data.data.tempPassword);
            setResetOpen(false);
            setError("");
            setSuccess("Password reset successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to reset password"),
    });

    const openEditModal = () => {
        if (data?.data) {
            const u = data.data;
            reset({
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: u.phone,
                role: u.role?._id || "",
                status: u.status,
            });
            setEditOpen(true);
        }
    };

    const handlePasswordChange = (data: any) => {
        if (data.newPassword !== data.confirmPassword) {
            setError("New passwords do not match");
            return;
        }
        if (data.newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        changePasswordMutation.mutate({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });
    };

    if (isLoading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="space-y-4">
            <Link href="/users">
                <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back to Users</Button>
            </Link>
            <Alert type="error">User not found.</Alert>
        </div>
    );

    const u: User = data.data;
    const doctor = u.doctor;

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            active: "bg-green-100 text-green-700",
            inactive: "bg-gray-100 text-gray-700",
            suspended: "bg-red-100 text-red-700",
            locked: "bg-orange-100 text-orange-700",
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/users">
                    <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Users</Button>
                </Link>
                <div className="flex gap-2">
                    {isOwnProfile && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPasswordOpen(true)}
                        >
                            <Key className="w-3.5 h-3.5" /> Change Password
                        </Button>
                    )}
                    {isSA && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResetOpen(true)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset Password
                        </Button>
                    )}
                    {(isSA || isOwnProfile) && (
                        <Button variant="outline" size="sm" onClick={openEditModal}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && <Alert type="success">{success}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            {/* Status Banner */}
            <div className={`p-4 rounded-lg border ${getStatusColor(u.status)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <span className="font-semibold">Status: {u.status.toUpperCase()}</span>
                    </div>
                    <span className="text-sm">{u.employeeId}</span>
                </div>
                {u.isSuperAdmin && (
                    <Badge variant="danger" className="mt-2">Super Administrator</Badge>
                )}
            </div>

            {/* User Info Card */}
            <Card>
                <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Full Name</p>
                                <p className="text-xl font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Email</p>
                                    <p className="text-slate-700">{u.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Phone</p>
                                    <p className="text-slate-700">{u.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Role</p>
                                <Badge variant="outline" className="mt-1">{u.role?.name}</Badge>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Last Login</p>
                                    <p className="text-slate-700">{u.lastLogin ? formatDate(u.lastLogin) : "Never"}</p>
                                    {u.lastLoginIp && <p className="text-xs text-slate-400">IP: {u.lastLoginIp}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 flex justify-between text-xs text-slate-400">
                        <span>Created: {formatDate(u.createdAt)}</span>
                        <span>Updated: {formatDate(u.updatedAt)}</span>
                        {u.createdBy && <span>Created by: {u.createdBy.firstName} {u.createdBy.lastName}</span>}
                    </div>
                </CardBody>
            </Card>

            {/* Doctor Details Card - Only show if user is a doctor */}
            {doctor && (
                <Card>
                    <CardBody className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-blue-500" /> Doctor Details
                            </h3>
                            {isSA && (
                                <Link href={`/doctors/${doctor?._id}`}>
                                    <Button variant="outline" size="sm">
                                        View Doctor Profile
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Badge variant="outline" className="mt-0.5">ID</Badge>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{doctor.doctorId}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Award className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Specialization</p>
                                        <p className="text-sm text-slate-700">{doctor.specialization}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Experience</p>
                                        <p className="text-sm text-slate-700">{doctor.experience} years</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Award className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Qualifications</p>
                                        <p className="text-sm text-slate-700">{doctor.qualifications?.join(", ") || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Department</p>
                                        <p className="text-sm text-slate-700">{doctor.department?.name || "—"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Consultation Fee</p>
                                        <p className="text-sm text-slate-700">PKR {doctor.consultationFee?.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Badge variant={doctor.isAvailable ? "success" : "default"} className="mt-0.5">
                                        {doctor.isAvailable ? "Available" : "Unavailable"}
                                    </Badge>
                                </div>
                                {doctor.languages?.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-semibold">Languages</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {doctor.languages.map((lang, i) => <Badge key={i} variant="outline">{lang}</Badge>)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {doctor.bio && (
                            <div className="border-t pt-3">
                                <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Bio</p>
                                <p className="text-sm text-slate-700">{doctor.bio}</p>
                            </div>
                        )}

                        <div className="border-t pt-3 flex justify-between text-xs text-slate-400">
                            <span>Doctor Created: {formatDate(doctor.createdAt)}</span>
                            <span>Doctor Updated: {formatDate(doctor.updatedAt)}</span>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit User" size="md">
                <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="First Name" required error={errors.firstName?.message}>
                            <Input {...register("firstName")} />
                        </FormField>
                        <FormField label="Last Name" required error={errors.lastName?.message}>
                            <Input {...register("lastName")} />
                        </FormField>
                    </div>
                    <FormField label="Email" required error={errors.email?.message}>
                        <Input type="email" {...register("email")} />
                    </FormField>
                    <FormField label="Phone" required error={errors.phone?.message}>
                        <Input {...register("phone")} />
                    </FormField>
                    {(isSA) && (
                        <>
                            <FormField label="Role" required error={errors.role?.message}>
                                <Select {...register("role")}>
                                    <option value="">Select role</option>
                                    {roles.map((r: { _id: string; name: string }) => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                    ))}
                                </Select>
                            </FormField>
                            <FormField label="Status" error={errors.status?.message}>
                                <Select {...register("status")}>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                </Select>
                            </FormField>
                        </>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Change Password Modal - User self change */}
            <Modal open={passwordOpen} onClose={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }} title="Change Password" size="md">
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                    <FormField label="Current Password" required>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                {...passwordForm.register("currentPassword")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="New Password" required>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? "text" : "password"}
                                {...passwordForm.register("newPassword")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="Confirm New Password" required>
                        <Input type="password" {...passwordForm.register("confirmPassword")} />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }}>Cancel</Button>
                        <Button type="submit" loading={changePasswordMutation.isPending}>Change Password</Button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal - Admin only */}
            <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Password" size="md">
                <div className="space-y-4">
                    <Alert type="warning">
                        Are you sure you want to reset the password for <strong>{u.firstName} {u.lastName}</strong>?
                        <br />A temporary password will be generated and the user will be required to change it on next login.
                    </Alert>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
                        <Button type="button" variant="secondary" onClick={() => resetPasswordMutation.mutate()} loading={resetPasswordMutation.isPending}>
                            Yes, Reset Password
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Temp Password Modal - Show temporary password */}
            {resetPassword && (
                <Modal open={!!resetPassword} onClose={() => setResetPassword("")} title="Password Reset Successful">
                    <Alert type="success">Password has been reset successfully.</Alert>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600 mb-2">New temporary password (share securely with user):</p>
                        <code className="text-base font-mono font-bold text-slate-800 tracking-wider">{resetPassword}</code>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">User will be required to change password on next login.</p>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={() => setResetPassword("")}>Done</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}