// components/patients/patient-details/edit-patient-modal.tsx
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePatientSchema, UpdatePatientInput } from "@/lib/validations";
import { useEffect } from "react";

export function EditPatientModal({ open, onClose, patient, onUpdate, isPending, error }: any) {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UpdatePatientInput>({
        resolver: zodResolver(updatePatientSchema),
    });

    const status = watch("status");
    const isDeceased = status === "deceased";

    useEffect(() => {
        if (open && patient) {
            reset({
                firstName: patient.firstName,
                lastName: patient.lastName,
                gender: patient.gender,
                dateOfBirth: patient.dateOfBirth?.split("T")[0],
                phone: patient.phone,
                email: patient.email || "",
                bloodGroup: patient.bloodGroup || "",
                status: patient.status || "active",
                notes: patient.notes || "",
                address: patient.address || {},
                emergencyContact: patient.emergencyContact || {},
                allergies: patient.allergies || [],
                chronicDiseases: patient.chronicDiseases || [],
                insuranceDetails: {
                    provider: patient.insuranceDetails?.provider || "",
                    policyNumber: patient.insuranceDetails?.policyNumber || "",
                    expiryDate: patient.insuranceDetails?.expiryDate
                        ? new Date(patient.insuranceDetails.expiryDate).toISOString().split("T")[0]
                        : "",
                    coverageDetails: patient.insuranceDetails?.coverageDetails || "",
                },
                dateOfDeath: patient.dateOfDeath || "",
                causeOfDeath: patient.causeOfDeath || "",
            });
        }
    }, [open, patient, reset]);

    return (
        <Modal open={open} onClose={onClose} title="Edit Patient" size="lg">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="First Name" required error={errors.firstName?.message}>
                        <Input {...register("firstName")} />
                    </FormField>
                    <FormField label="Last Name" required error={errors.lastName?.message}>
                        <Input {...register("lastName")} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Gender" required error={errors.gender?.message}>
                        <Select {...register("gender")}>
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </Select>
                    </FormField>
                    <FormField label="Date of Birth" required error={errors.dateOfBirth?.message}>
                        <Input type="date" {...register("dateOfBirth")} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Phone" required error={errors.phone?.message}>
                        <Input {...register("phone")} />
                    </FormField>
                    <FormField label="Email" error={errors.email?.message}>
                        <Input type="email" {...register("email")} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Blood Group">
                        <Select {...register("bloodGroup")}>
                            <option value="">Unknown</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                            ))}
                        </Select>
                    </FormField>
                    <FormField label="Status" required error={errors.status?.message}>
                        <Select {...register("status")}>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="deceased">Deceased</option>
                        </Select>
                    </FormField>
                </div>

                {isDeceased && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-red-200 pt-4">
                        <FormField label="Date of Death" required error={errors.dateOfDeath?.message}>
                            <Input type="date" {...register("dateOfDeath")} />
                        </FormField>
                        <FormField label="Cause of Death" error={errors.causeOfDeath?.message}>
                            <Input {...register("causeOfDeath")} placeholder="e.g., Cardiac Arrest" />
                        </FormField>
                    </div>
                )}

                {/* Address */}
                <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Address</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Street"><Input {...register("address.street")} /></FormField>
                        <FormField label="City"><Input {...register("address.city")} /></FormField>
                        <FormField label="State"><Input {...register("address.state")} /></FormField>
                        <FormField label="Country"><Input {...register("address.country")} /></FormField>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Name"><Input {...register("emergencyContact.name")} /></FormField>
                        <FormField label="Relationship"><Input {...register("emergencyContact.relationship")} /></FormField>
                        <FormField label="Phone"><Input {...register("emergencyContact.phone")} /></FormField>
                    </div>
                </div>

                {/* Medical Information */}
                <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Medical Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Allergies (comma-separated)">
                            <Input
                                defaultValue={watch("allergies")?.join(", ") || ""}
                                onBlur={(e) => setValue("allergies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                placeholder="Penicillin, Nuts"
                            />
                        </FormField>
                        <FormField label="Chronic Diseases (comma-separated)">
                            <Input
                                defaultValue={watch("chronicDiseases")?.join(", ") || ""}
                                onBlur={(e) => setValue("chronicDiseases", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                placeholder="Diabetes, Hypertension"
                            />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField label="Insurance Provider"><Input {...register("insuranceDetails.provider")} /></FormField>
                        <FormField label="Policy Number"><Input {...register("insuranceDetails.policyNumber")} /></FormField>
                        <FormField label="Expiry Date"><Input type="date" {...register("insuranceDetails.expiryDate")} /></FormField>
                        <FormField label="Coverage Details"><Input {...register("insuranceDetails.coverageDetails")} /></FormField>
                    </div>
                </div>

                <FormField label="Notes">
                    <textarea
                        {...register("notes")}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
                    />
                </FormField>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={isPending}>Update</Button>
                </div>
            </form>
        </Modal>
    );
}