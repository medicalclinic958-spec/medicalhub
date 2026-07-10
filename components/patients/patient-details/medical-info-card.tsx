// components/patients/patient-details/medical-info-card.tsx
import { Card, CardBody, Badge } from "@/components/ui";
import { Heart } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function MedicalInfoCard({ p }: { p: any }) {
    const hasData = p.allergies?.length || p.chronicDiseases?.length || p.notes || p.insuranceDetails?.provider;

    return (
        <Card>
            <CardBody>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-900">Medical Information</h3>
                </div>

                {!hasData ? (
                    <p className="text-xs text-gray-400">No medical information recorded.</p>
                ) : (
                    <div className="space-y-3">
                        {p.allergies?.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-1.5">Allergies</p>
                                <div className="flex flex-wrap gap-1">
                                    {p.allergies.map((a: string, i: number) => (
                                        <Badge key={i} variant="danger">{a}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {p.chronicDiseases?.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-1.5">Chronic Diseases</p>
                                <div className="flex flex-wrap gap-1">
                                    {p.chronicDiseases.map((d: string, i: number) => (
                                        <Badge key={i} variant="warning">{d}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {p.insuranceDetails?.provider && (
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Insurance</p>
                                <p className="text-xs text-gray-700">
                                    {p.insuranceDetails.provider} — {p.insuranceDetails.policyNumber}
                                </p>
                                {p.insuranceDetails.expiryDate && (
                                    <p className="text-xs text-gray-400 mt-0.5">Expires: {formatDate(p.insuranceDetails.expiryDate)}</p>
                                )}
                                {p.insuranceDetails.coverageDetails && (
                                    <p className="text-xs text-gray-500 mt-0.5">{p.insuranceDetails.coverageDetails}</p>
                                )}
                            </div>
                        )}
                        {p.notes && (
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Notes</p>
                                <p className="text-xs text-gray-600">{p.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}