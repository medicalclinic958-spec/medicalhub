// components/profile/profile-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import {
    User, Mail, Phone, Calendar, Shield, Edit2, Key, Eye, EyeOff,
    Stethoscope, Award, Clock, DollarSign, Building, BadgeCheck, Activity,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

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
    console.log(session)
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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
            setSuccess("Profile updated successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to update"),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (d: any) => axios.post("/api/auth/change-password", d),
        onSuccess: () => {
            setPasswordOpen(false);
            passwordForm.reset();
            updateSession();
            setError("");
            setSuccess("Password changed successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed"),
    });

    const openEditModal = () => {
        if (data?.data) {
            const u = data.data;
            reset({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone });
            setEditOpen(true);
        }
    };

    const handlePasswordChange = (d: any) => {
        if (d.newPassword !== d.confirmPassword) { setError("Passwords do not match"); return; }
        if (d.newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
        changePasswordMutation.mutate(d);
    };

    if (isLoading) return (
        <div className="space-y-5">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
    );

    const u: UserProfile | undefined = data?.data;
    if (!u) return <Alert type="error">Unable to load profile.</Alert>;

    const doctor = u.doctor;
    const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening";

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {success && <Alert type="success">{success}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-1/2 w-60 h-60 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm">{greeting}</p>
                            <h1 className="text-2xl font-bold">{u.firstName} {u.lastName}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-blue-100 text-sm">
                            <BadgeCheck className="w-4 h-4" />
                            <span>{u.role?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-100 text-sm">
                            <Activity className="w-4 h-4" />
                            <span className="capitalize">{u.status}</span>
                        </div>
                        {u.employeeId && (
                            <div className="text-blue-100 text-sm font-mono">{u.employeeId}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={openEditModal}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                    <Key className="w-3.5 h-3.5" /> Change Password
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Personal Info */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" /> Personal Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Full Name</span>
                                <span className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Email</span>
                                <span className="text-sm text-slate-700">{u.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Phone</span>
                                <span className="text-sm text-slate-700">{u.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Role</span>
                                <Badge variant="outline">{u.role?.name}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Status</span>
                                <StatusBadge status={u.status} />
                            </div>
                            {u.isSuperAdmin && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Admin</span>
                                    <Badge variant="danger">Super Admin</Badge>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Activity Info */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" /> Activity
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Last Login</span>
                                <span className="text-sm text-slate-700">{u.lastLogin ? formatDate(u.lastLogin) : "Never"}</span>
                            </div>
                            {u.lastLoginIp && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Last IP</span>
                                    <span className="text-sm font-mono text-slate-500">{u.lastLoginIp}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Member Since</span>
                                <span className="text-sm text-slate-700">{formatDate(u.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <span className="text-sm text-slate-700">{formatDate(u.updatedAt)}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Doctor Info - only if user is a doctor */}
                {doctor && (
                    <Card className="md:col-span-2">
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-blue-500" /> Doctor Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Doctor ID</span><span className="text-sm font-mono text-slate-700">{doctor.doctorId}</span></div>
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Specialization</span><span className="text-sm text-slate-700">{doctor.specialization}</span></div>
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Experience</span><span className="text-sm text-slate-700">{doctor.experience} years</span></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Department</span><span className="text-sm text-slate-700">{doctor.department?.name || "—"}</span></div>
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Fee</span><span className="text-sm text-slate-700">PKR {doctor.consultationFee?.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Status</span><Badge variant={doctor.isAvailable ? "success" : "default"}>{doctor.isAvailable ? "Available" : "Unavailable"}</Badge></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between"><span className="text-sm text-slate-500">Qualifications</span><span className="text-sm text-slate-700">{doctor.qualifications?.join(", ") || "—"}</span></div>
                                    {doctor.languages?.length > 0 && (
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">Languages</span><div className="flex gap-1">{doctor.languages.map((l, i) => <Badge key={i} variant="outline">{l}</Badge>)}</div></div>
                                    )}
                                </div>
                            </div>
                            {doctor.bio && <p className="text-sm text-slate-600 mt-3 pt-3 border-t">{doctor.bio}</p>}
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Edit Profile Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="md">
                <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="First Name" required error={errors.firstName?.message}><Input {...register("firstName")} /></FormField>
                        <FormField label="Last Name" required error={errors.lastName?.message}><Input {...register("lastName")} /></FormField>
                    </div>
                    <FormField label="Email" required error={errors.email?.message}><Input type="email" {...register("email")} /></FormField>
                    <FormField label="Phone" required error={errors.phone?.message}><Input {...register("phone")} /></FormField>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Change Password Modal */}
            <Modal open={passwordOpen} onClose={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }} title="Change Password" size="md">
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                    <FormField label="Current Password" required>
                        <div className="relative">
                            <Input type={showPassword ? "text" : "password"} {...passwordForm.register("currentPassword")} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="New Password" required>
                        <div className="relative">
                            <Input type={showNewPassword ? "text" : "password"} {...passwordForm.register("newPassword")} />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </FormField>
                    <FormField label="Confirm New Password" required><Input type="password" {...passwordForm.register("confirmPassword")} /></FormField>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => { setPasswordOpen(false); passwordForm.reset(); setError(""); }}>Cancel</Button>
                        <Button type="submit" loading={changePasswordMutation.isPending}>Change Password</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}