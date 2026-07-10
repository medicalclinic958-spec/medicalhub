// components/patients/patient-details/emergency-contact-card.tsx
import { Card, CardBody } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

export function EmergencyContactCard({ p }: { p: any }) {
    return (
        <Card>
            <CardBody>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-900">Emergency Contact</h3>
                </div>
                {p.emergencyContact?.name ? (
                    <div className="space-y-2.5">
                        <Row label="Name" value={p.emergencyContact.name} />
                        <Row label="Relationship" value={p.emergencyContact.relationship} />
                        <Row label="Phone" value={p.emergencyContact.phone} />
                    </div>
                ) : (
                    <p className="text-xs text-gray-400">No emergency contact recorded.</p>
                )}
            </CardBody>
        </Card>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            <span className="text-xs text-gray-700 text-right truncate">{value}</span>
        </div>
    );
}