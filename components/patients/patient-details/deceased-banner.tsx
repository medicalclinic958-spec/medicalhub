// components/patients/patient-details/deceased-banner.tsx
import { Card, CardBody } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function DeceasedBanner({ dateOfDeath, causeOfDeath }: { dateOfDeath?: string; causeOfDeath?: string }) {
    if (!dateOfDeath && !causeOfDeath) return null;

    return (
        <Card className="border-red-200 bg-red-50">
            <CardBody>
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-semibold text-red-700">Patient Deceased</h4>
                        {dateOfDeath && (
                            <p className="text-xs text-red-600 mt-0.5">Date of death: {formatDate(dateOfDeath)}</p>
                        )}
                        {causeOfDeath && (
                            <p className="text-xs text-red-600 mt-0.5">Cause: {causeOfDeath}</p>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}