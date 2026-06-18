import { Card, CardBody, StatusBadge, Badge, Button } from "@/components/ui";
import { Phone, Mail, MapPin, Edit2, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Patient {
    _id: string; patientId: string; firstName: string; lastName: string;
    gender: string; dateOfBirth: string; phone: string;
    email?: string; bloodGroup?: string; status: string; photo?: string;
    address?: { street?: string; city?: string; state?: string; country?: string };
    createdAt: string;
}

export function PatientHeader({ p, onEdit }: { p: Patient; onEdit: () => void }) {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <Link href="/patients">
                    <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Patients</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
            </div>

            <Card>
                <CardBody>
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-2xl font-bold text-blue-600">
                            {p.photo ? <img src={p.photo} alt={p.firstName} className="w-16 h-16 rounded-full object-cover" /> : (p.firstName?.charAt(0) || "P")}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-slate-800">{p.firstName} {p.lastName}</h1>
                                <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-semibold">{p.patientId}</span>
                                <StatusBadge status={p.status} />
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-slate-500">
                                <span className="capitalize">{p.gender}</span>
                                {p.dateOfBirth && (
                                    <span>
                                        {(() => {
                                            const birth = new Date(p.dateOfBirth);
                                            if (isNaN(birth.getTime())) return "Invalid date";
                                            const today = new Date();
                                            let age = today.getFullYear() - birth.getFullYear();
                                            const m = today.getMonth() - birth.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                                            return `${age} years`;
                                        })()}
                                    </span>
                                )}
                                {p.dateOfBirth && <span>DOB: {formatDate(p.dateOfBirth)}</span>}
                                {p.bloodGroup && <Badge variant="danger">{p.bloodGroup}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-slate-500">
                                {p.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</span>}
                                {p.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{p.email}</span>}
                                {p.address?.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[p.address.city, p.address.state, p.address.country].filter(Boolean).join(", ")}</span>}
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">Registered {formatDate(p.createdAt)}</div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}