// components/profile/profile-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import {
    User, Mail, Phone, Calendar, Shield, Edit2, Key, Eye, EyeOff,
    Stethoscope, Clock,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface UserProfile {
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
    };
}

export function ProfileClient() {
    const { data: session, update: updateSession } = useSession();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const userId = session?.user?.id;

    const { data, isLoading } = useQuery({
        queryKey: ["profile", userId],
        queryFn: () => axios.get(`/api/profile/${userId}`).then(r => r.data),
        enabled: !!userId,
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
    });

    const passwordForm = useForm({
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/profile/${userId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile", userId] });
            updateSession();
            setEditOpen(false);
            setError("");
            toast.success("Profile updated successfully");
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.error || "Failed to update";
            setError(msg);
            toast.error(msg);
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: (d: any) => axios.post("/api/auth/change-password", d),
        onSuccess: async () => {
            setPasswordOpen(false);
            passwordForm.reset();
            setError("");
            toast.success("Password changed successfully");
            await updateSession(); // force refresh session to get updated mustChangePassword
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.error || "Failed";
            setError(msg);
            toast.error(msg);
        },
    });

    const openEditModal = () => {
        if (data?.data) {
            const u = data.data;
            reset({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone });
            setEditOpen(true);
            setError("");
        }
    };

    const handlePasswordChange = (d: any) => {
        if (d.newPassword !== d.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (d.newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        changePasswordMutation.mutate(d);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        );
    }

    const u: UserProfile | undefined = data?.data;
    if (!u) return <Alert type="error">Unable to load profile.</Alert>;

    const doctor = u.doctor;

    return (
        <div className="space-y-4">
            {session?.user?.mustChangePassword && (
                <Alert type="warning">Please change your default password to access all features.</Alert>
            )}

            {/* Profile Header */}
            <Card>
                <CardBody>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-teal-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                                {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">{u.firstName} {u.lastName}</h1>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-xs text-gray-500">{u.role?.name}</span>
                                    <StatusBadge status={u.status} />
                                    {u.isSuperAdmin && <Badge variant="danger">Super Admin</Badge>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={openEditModal}>
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setPasswordOpen(true); setError(""); }}>
                                <Key className="w-3.5 h-3.5" /> Password
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal Info */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <User className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Personal Information</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Full Name" value={`${u.firstName} ${u.lastName}`} />
                            <Row label="Email" value={u.email} />
                            <Row label="Phone" value={u.phone} />
                            <Row label="Role">
                                <Badge variant="outline">{u.role?.name}</Badge>
                            </Row>
                            {u.employeeId && <Row label="Employee ID" value={u.employeeId} />}
                        </div>
                    </CardBody>
                </Card>

                {/* Activity */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-gray-400" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Activity</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Last Login" value={u.lastLogin ? formatDate(u.lastLogin) : "Never"} />
                            {u.lastLoginIp && <Row label="Last IP" value={u.lastLoginIp} />}
                            <Row label="Member Since" value={formatDate(u.createdAt)} />
                            <Row label="Last Updated" value={formatDate(u.updatedAt)} />
                        </div>
                    </CardBody>
                </Card>

                {/* Doctor Info */}
                {doctor && (
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-teal-600" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Doctor Profile</h3>
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
                                    <Row label="Status">
                                        <Badge variant={doctor.isAvailable ? "success" : "default"}>
                                            {doctor.isAvailable ? "Available" : "Unavailable"}
                                        </Badge>
                                    </Row>
                                </div>
                                <div className="space-y-2.5">
                                    <Row label="Qualifications" value={doctor.qualifications?.join(", ") || "—"} />
                                    {doctor.languages?.length > 0 && (
                                        <Row label="Languages">
                                            <div className="flex gap-1 flex-wrap justify-end">
                                                {doctor.languages.map((l, i) => (
                                                    <Badge key={i} variant="outline">{l}</Badge>
                                                ))}
                                            </div>
                                        </Row>
                                    )}
                                </div>
                            </div>
                            {doctor.bio && (
                                <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">{doctor.bio}</p>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Edit Profile Modal */}
            <Modal open={editOpen} onClose={() => { setEditOpen(false); setError(""); }} title="Edit Profile" size="md">
                <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button type="button" variant="secondary" onClick={() => { setEditOpen(false); setError(""); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Change Password Modal */}
            <Modal open={passwordOpen} onClose={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }} title="Change Password" size="md">
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4 mt-2">
                    {error && <Alert type="error">{error}</Alert>}
                    <FormField label="Current Password" required>
                        <div className="relative">
                            <Input type={showPassword ? "text" : "password"} {...passwordForm.register("currentPassword")} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="New Password" required>
                        <div className="relative">
                            <Input type={showNewPassword ? "text" : "password"} {...passwordForm.register("newPassword")} />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="Confirm New Password" required>
                        <Input type="password" {...passwordForm.register("confirmPassword")} />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button type="button" variant="secondary" onClick={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={changePasswordMutation.isPending}>Change Password</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// --- Reusable row component ---
function Row({ label, value, children }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            {children ? (
                <span className="text-xs text-right">{children}</span>
            ) : (
                <span className="text-xs text-gray-700 text-right truncate">{value}</span>
            )}
        </div>
    );
}