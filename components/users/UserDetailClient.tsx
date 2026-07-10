// components/users/user-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
    ArrowLeft, Edit2, Key, RefreshCw, Eye, EyeOff,
    Stethoscope, Clock, Mail, Phone,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input, Select,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface User {
    _id: string; employeeId: string; firstName: string; lastName: string;
    email: string; phone: string; role: { _id: string; name: string; slug: string };
    status: string; isSuperAdmin: boolean; lastLogin?: string; lastLoginIp?: string;
    createdAt: string; updatedAt: string;
    createdBy?: { firstName: string; lastName: string };
    doctor?: {
        _id: string; doctorId: string; specialization: string; qualifications: string[];
        experience: number; consultationFee: number;
        department: { _id: string; name: string; code: string };
        isAvailable: boolean; bio: string; languages: string[];
        createdAt: string; updatedAt: string;
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
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetPassword, setResetPassword] = useState("");

    const isSA = session?.user.isSuperAdmin;
    const isOwnProfile = session?.user.id === userId;

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["user", userId],
        queryFn: () => axios.get(`/api/users/${userId}`).then(r => r.data),
    });

    const { data: rolesData } = useQuery({
        queryKey: ["roles-select"],
        queryFn: () => axios.get("/api/roles").then(r => r.data),
        enabled: editOpen,
    });

    const roles = rolesData?.data || [];

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: { firstName: "", lastName: "", email: "", phone: "", role: "", status: "" },
    });

    const passwordForm = useForm({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

    const updateMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/users/${userId}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["user", userId] });
            qc.invalidateQueries({ queryKey: ["users"] });
            setEditOpen(false); setError("");
            toast.success("User updated successfully!");
        },
        onError: (e: any) => { const msg = e?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/users/${userId}`, data),
        onSuccess: () => {
            setPasswordOpen(false); passwordForm.reset(); setError("");
            toast.success("Password changed successfully!");
        },
        onError: (e: any) => { const msg = e?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => axios.put(`/api/users/${userId}`, { resetPassword: true }),
        onSuccess: (res) => {
            setResetPassword(res.data.data.tempPassword);
            setResetOpen(false); setError("");
            toast.success("Password reset successfully!");
        },
        onError: (e: any) => { const msg = e?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const openEditModal = () => {
        if (data?.data) {
            const u = data.data;
            reset({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, role: u.role?._id || "", status: u.status });
            setEditOpen(true);
        }
    };

    const handlePasswordChange = (data: any) => {
        if (data.newPassword !== data.confirmPassword) { setError("Passwords do not match"); return; }
        if (data.newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
        changePasswordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
    };

    if (isLoading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="space-y-4">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back</button>
            <Alert type="error">User not found.</Alert>
        </div>
    );

    const u: User = data.data;
    const doctor = u.doctor;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button onClick={() => router.back()} className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-semibold text-gray-900">{u.firstName} {u.lastName}</h1>
                            <StatusBadge status={u.status} />
                            {u.isSuperAdmin && <Badge variant="danger">Super Admin</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{u.role?.name} • {u.employeeId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isOwnProfile && (
                        <Button variant="secondary" size="sm" onClick={() => { setPasswordOpen(true); setError(""); }}>
                            <Key className="w-3.5 h-3.5" /> Password
                        </Button>
                    )}
                    {isSA && (
                        <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                        </Button>
                    )}
                    {(isSA || isOwnProfile) && (
                        <Button variant="secondary" size="sm" onClick={openEditModal}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                </div>
            </div>

            {error && <Alert type="error">{error}</Alert>}

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User Info */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Mail className="w-4 h-4 text-teal-600" /></div>
                            <h3 className="text-xs font-semibold text-gray-900">User Information</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Full Name" value={`${u.firstName} ${u.lastName}`} />
                            <Row label="Email" value={u.email} />
                            <Row label="Phone" value={u.phone} />
                            <Row label="Role"><Badge variant="outline">{u.role?.name}</Badge></Row>
                            <Row label="Employee ID" value={u.employeeId} />
                        </div>
                    </CardBody>
                </Card>

                {/* Activity */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Clock className="w-4 h-4 text-gray-400" /></div>
                            <h3 className="text-xs font-semibold text-gray-900">Activity</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Last Login" value={u.lastLogin ? formatDate(u.lastLogin) : "Never"} />
                            {u.lastLoginIp && <Row label="Last IP" value={u.lastLoginIp} />}
                            <Row label="Created" value={formatDate(u.createdAt)} />
                            <Row label="Updated" value={formatDate(u.updatedAt)} />
                            {u.createdBy && <Row label="Created by" value={`${u.createdBy.firstName} ${u.createdBy.lastName}`} />}
                        </div>
                    </CardBody>
                </Card>

                {/* Doctor Info */}
                {doctor && (
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-teal-600" /></div>
                                <h3 className="text-xs font-semibold text-gray-900">Doctor Profile</h3>
                                {isSA && (
                                    <Link href={`/doctors/${doctor._id}`} className="ml-auto">
                                        <Button variant="secondary" size="sm">View Doctor</Button>
                                    </Link>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2.5">
                                    <Row label="Doctor ID" value={doctor.doctorId} />
                                    <Row label="Specialization" value={doctor.specialization} />
                                    <Row label="Experience" value={`${doctor.experience} years`} />
                                </div>
                                <div className="space-y-2.5">
                                    <Row label="Department" value={doctor.department?.name || "—"} />
                                    <Row label="Fee" value={`PKR ${doctor.consultationFee?.toLocaleString()}`} />
                                    <Row label="Status"><Badge variant={doctor.isAvailable ? "success" : "default"}>{doctor.isAvailable ? "Available" : "Unavailable"}</Badge></Row>
                                </div>
                                <div className="space-y-2.5">
                                    <Row label="Qualifications" value={doctor.qualifications?.join(", ") || "—"} />
                                    {doctor.languages?.length > 0 && <Row label="Languages"><div className="flex gap-1 flex-wrap justify-end">{doctor.languages.map((l, i) => <Badge key={i} variant="outline">{l}</Badge>)}</div></Row>}
                                </div>
                            </div>
                            {doctor.bio && <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">{doctor.bio}</p>}
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => { setEditOpen(false); setError(""); }} title="Edit User" size="md">
                <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="First Name" required error={errors.firstName?.message}><Input {...register("firstName")} /></FormField>
                        <FormField label="Last Name" required error={errors.lastName?.message}><Input {...register("lastName")} /></FormField>
                    </div>
                    <FormField label="Email" required error={errors.email?.message}><Input type="email" {...register("email")} /></FormField>
                    <FormField label="Phone" required error={errors.phone?.message}><Input {...register("phone")} /></FormField>
                    {isSA && (
                        <>
                            <FormField label="Role" required error={errors.role?.message}><Select {...register("role")}><option value="">Select role</option>{roles.map((r: any) => <option key={r._id} value={r._id}>{r.name}</option>)}</Select></FormField>
                            <FormField label="Status"><Select {...register("status")}><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></Select></FormField>
                        </>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Change Password Modal */}
            <Modal open={passwordOpen} onClose={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }} title="Change Password" size="md">
                {error && <Alert type="error">{error}</Alert>}
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4 mt-2">
                    <FormField label="Current Password" required>
                        <div className="relative"><Input type={showPassword ? "text" : "password"} {...passwordForm.register("currentPassword")} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                    </FormField>
                    <FormField label="New Password" required>
                        <div className="relative"><Input type={showNewPassword ? "text" : "password"} {...passwordForm.register("newPassword")} /><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                    </FormField>
                    <FormField label="Confirm New Password" required><Input type="password" {...passwordForm.register("confirmPassword")} /></FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button type="button" variant="secondary" onClick={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }}>Cancel</Button><Button type="submit" loading={changePasswordMutation.isPending}>Change Password</Button></div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Password" size="sm">
                <div className="space-y-4 mt-2">
                    <Alert type="warning">Reset password for <strong>{u.firstName} {u.lastName}</strong>? A temporary password will be generated.</Alert>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button><Button onClick={() => resetPasswordMutation.mutate()} loading={resetPasswordMutation.isPending}>Reset Password</Button></div>
                </div>
            </Modal>

            {/* Temp Password Modal */}
            {resetPassword && (
                <Modal open={!!resetPassword} onClose={() => setResetPassword("")} title="Password Reset" size="sm">
                    <Alert type="success">Password has been reset.</Alert>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200"><p className="text-xs text-gray-500 mb-1">Temporary password:</p><code className="text-sm font-semibold text-gray-900">{resetPassword}</code></div>
                    <p className="text-xs text-gray-400 mt-2">User must change on next login.</p>
                    <div className="mt-4 flex justify-end"><Button onClick={() => setResetPassword("")}>Done</Button></div>
                </Modal>
            )}
        </div>
    );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return <div className="flex items-center justify-between gap-3"><span className="text-xs text-gray-400 shrink-0">{label}</span>{children ? <span className="text-xs text-right">{children}</span> : <span className="text-xs text-gray-700 text-right truncate">{value}</span>}</div>;
}