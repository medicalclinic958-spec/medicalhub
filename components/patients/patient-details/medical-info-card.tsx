import { Card, CardHeader, CardBody, Badge } from "@/components/ui";
import { Heart } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function MedicalInfoCard({ p }: { p: any }) {
    return (
        <Card>
            <CardHeader><h3 className="font-semibold text-slate-700 flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> Medical Info</h3></CardHeader>
            <CardBody className="space-y-3">
                {p.allergies?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Allergies</p>
                        <div className="flex flex-wrap gap-1">{p.allergies.map((a: string, i: number) => <Badge key={i} variant="danger">{a}</Badge>)}</div>
                    </div>
                )}
                {p.chronicDiseases?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Chronic Diseases</p>
                        <div className="flex flex-wrap gap-1">{p.chronicDiseases.map((d: string, i: number) => <Badge key={i} variant="warning">{d}</Badge>)}</div>
                    </div>
                )}
                {p.insuranceDetails?.provider && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Insurance</p>
                        <p className="text-sm text-slate-700">{p.insuranceDetails.provider} — {p.insuranceDetails.policyNumber}</p>
                        {p.insuranceDetails.expiryDate && <p className="text-xs text-slate-500 mt-1">Expires: {formatDate(p.insuranceDetails.expiryDate)}</p>}
                        {p.insuranceDetails.coverageDetails && <p className="text-xs text-slate-500">{p.insuranceDetails.coverageDetails}</p>}
                    </div>
                )}
                {p.notes && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
                        <p className="text-sm text-slate-600">{p.notes}</p>
                    </div>
                )}
                {!p.allergies?.length && !p.chronicDiseases?.length && !p.notes && !p.insuranceDetails?.provider && (
                    <p className="text-sm text-slate-400">No medical information recorded.</p>
                )}
            </CardBody>
        </Card>
    );
}