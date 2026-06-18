import { Card, CardHeader, CardBody } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

export function EmergencyContactCard({ p }: { p: any }) {
    return (
        <Card>
            <CardHeader><h3 className="font-semibold text-slate-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Emergency Contact</h3></CardHeader>
            <CardBody>
                {p.emergencyContact?.name ? (
                    <div className="space-y-2">
                        <div><p className="text-xs text-slate-400">Name</p><p className="text-sm font-medium text-slate-700">{p.emergencyContact.name}</p></div>
                        <div><p className="text-xs text-slate-400">Relationship</p><p className="text-sm text-slate-700">{p.emergencyContact.relationship}</p></div>
                        <div><p className="text-xs text-slate-400">Phone</p><p className="text-sm text-slate-700">{p.emergencyContact.phone}</p></div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">No emergency contact recorded.</p>
                )}
            </CardBody>
        </Card>
    );
}