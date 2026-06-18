"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Mail, Phone, Calendar, Stethoscope, Award, Clock, DollarSign, Building, Edit2, User } from "lucide-react";
import { Card, CardBody, Badge, Button, Skeleton, Alert, Modal, FormField, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Doctor {
    _id: string; doctorId: string;
    user: { _id: string; firstName: string; lastName: string; email: string; phone: string; avatar?: string; status: string };
    specialization: string; department?: { _id: string; name: string; code: string };
    qualifications: string[]; experience: number; consultationFee: number;
    isAvailable: boolean; bio?: string; languages: string[];
    createdAt: string; updatedAt: string;
}

interface EditDoctorInput {
    specialization: string;
    department: string;
    qualifications: string;
    experience: number;
    consultationFee: number;
    bio: string;
    languages: string;
    isAvailable: boolean;
}

export function DoctorDetailClient({ doctorId }: { doctorId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isSA = session?.user.isSuperAdmin;
    const perms = session?.user.permissions || [];
    const canUpdate = isSA || perms.includes("doctors:update");

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["doctor", doctorId],
        queryFn: () => axios.get(`/api/doctors/${doctorId}`).then(r => r.data),
        enabled: !!doctorId,
    });

    const { data: deptData } = useQuery({
        queryKey: ["departments"],
        queryFn: () => axios.get("/api/settings/departments").then(r => r.data),
        enabled: editOpen,
    });

    const departments = deptData?.data || [];

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditDoctorInput>({
        defaultValues: {
            specialization: "",
            department: "",
            qualifications: "",
            experience: 0,
            consultationFee: 0,
            bio: "",
            languages: "",
            isAvailable: true,
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/doctors/${doctorId}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["doctor", doctorId] });
            qc.invalidateQueries({ queryKey: ["doctors"] });
            setEditOpen(false);
            setError("");
            setSuccess("Doctor updated successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to update"),
    });

    const openEditModal = () => {
        if (data?.data) {
            const d = data.data;
            reset({
                specialization: d.specialization,
                department: d.department?._id || "",
                qualifications: d.qualifications?.join(", ") || "",
                experience: d.experience || 0,
                consultationFee: d.consultationFee || 0,
                bio: d.bio || "",
                languages: d.languages?.join(", ") || "",
                isAvailable: d.isAvailable,
            });
            setEditOpen(true);
        }
    };

    const onSubmit = (data: EditDoctorInput) => {
        updateMutation.mutate({
            ...data,
            qualifications: data.qualifications ? data.qualifications.split(",").map(q => q.trim()).filter(Boolean) : [],
            languages: data.languages ? data.languages.split(",").map(l => l.trim()).filter(Boolean) : [],
        });
    };

    if (isLoading) return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="max-w-4xl mx-auto">
            <Link href="/doctors"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back to Doctors</Button></Link>
            <Alert type="error">Doctor not found.</Alert>
        </div>
    );

    const d: Doctor = data.data;

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href="/doctors">
                    <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Doctors</Button>
                </Link>
                <div className="flex gap-2">
                    {isSA && (
                        <Link href={`/users/${d.user?._id}`}>
                            <Button variant="outline" size="sm">
                                <User className="w-3.5 h-3.5" /> View User
                            </Button>
                        </Link>
                    )}
                    {canUpdate && (
                        <Button variant="outline" size="sm" onClick={openEditModal}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                </div>
            </div>

            {success && <Alert type="success">{success}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            <Card>
                <CardBody className="space-y-4">
                    <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-2xl font-bold text-blue-600">
                            {d.user?.avatar ? <img src={d.user.avatar} className="w-20 h-20 rounded-full object-cover" /> : "Dr"}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-slate-800">Dr. {d.user?.firstName} {d.user?.lastName}</h1>
                                <Badge variant={d.isAvailable ? "success" : "default"}>
                                    {d.isAvailable ? "Available" : "Unavailable"}
                                </Badge>
                                {d.user?.status !== "active" && (
                                    <Badge variant="danger">{d.user?.status}</Badge>
                                )}
                            </div>
                            <p className="text-slate-600">{d.specialization}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {d.user?.email}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {d.user?.phone}</span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">ID: {d.doctorId}</div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Award className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Qualifications</p>
                                    <p className="text-sm text-slate-700">{d.qualifications?.join(", ") || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Experience</p>
                                    <p className="text-sm text-slate-700">{d.experience} years</p>
                                </div>
                            </div>
                            {d.languages?.length > 0 && (
                                <div className="flex items-start gap-3">
                                    <Stethoscope className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Languages</p>
                                        <div className="flex flex-wrap gap-1">
                                            {d.languages.map((lang, i) => <Badge key={i} variant="outline">{lang}</Badge>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Department</p>
                                    <p className="text-sm text-slate-700">{d.department?.name || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Consultation Fee</p>
                                    <p className="text-sm text-slate-700">PKR {d.consultationFee?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {d.bio && (
                        <div className="border-t pt-4">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Bio</p>
                            <p className="text-sm text-slate-700">{d.bio}</p>
                        </div>
                    )}

                    <div className="border-t pt-4 flex justify-between text-xs text-slate-400">
                        <span>Created: {formatDate(d.createdAt)}</span>
                        <span>Updated: {formatDate(d.updatedAt)}</span>
                    </div>
                </CardBody>
            </Card>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Doctor Profile" size="lg">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Specialization" required error={errors.specialization?.message}>
                            <Input {...register("specialization", { required: "Specialization is required" })} placeholder="e.g. Cardiologist" />
                        </FormField>
                        <FormField label="Department">
                            <Select {...register("department")}>
                                <option value="">Select department</option>
                                {departments.map((d: { _id: string; name: string }) => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Experience (years)">
                            <Input type="number" {...register("experience", { valueAsNumber: true })} placeholder="0" />
                        </FormField>
                        <FormField label="Consultation Fee (PKR)">
                            <Input type="number" {...register("consultationFee", { valueAsNumber: true })} placeholder="0" />
                        </FormField>
                    </div>
                    <FormField label="Qualifications" hint="Comma separated e.g. MBBS, FCPS">
                        <Input {...register("qualifications")} placeholder="MBBS, FCPS, MD" />
                    </FormField>
                    <FormField label="Languages" hint="Comma separated e.g. English, Urdu">
                        <Input {...register("languages")} placeholder="English, Urdu, Punjabi" />
                    </FormField>
                    <FormField label="Bio">
                        <textarea {...register("bio")} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </FormField>
                    <FormField label="Availability" error={errors.isAvailable?.message}>
                        <Select {...register("isAvailable", { valueAsNumber: false })}>
                            <option value="true">Available</option>
                            <option value="false">Unavailable</option>
                        </Select>
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}