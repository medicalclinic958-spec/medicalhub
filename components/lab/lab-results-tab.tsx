// components/lab/lab-results-tab.tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import axios from "axios";
import { Card, CardBody, Button, Alert, FormField, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LabTestDetail {
    _id: string;
    tests: { testName: string }[];
    results: { testName: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean; notes?: string }[];
    status: string;
}

interface LabResultsTabProps { test: LabTestDetail; canUpdate: boolean; id: string; }

export function LabResultsTab({ test, canUpdate, id }: LabResultsTabProps) {
    const qc = useQueryClient();
    const [error, setError] = useState("");

    const existingResults = test.tests.map(t => {
        const saved = test.results?.find(r => r.testName === t.testName);
        return saved || { testName: t.testName, value: "", unit: "", referenceRange: "", isAbnormal: false, notes: "" };
    });

    const { register, handleSubmit, control, formState: { errors } } = useForm({
        defaultValues: { results: existingResults },
    });

    const { fields } = useFieldArray({ control, name: "results" });

    const updateMutation = useMutation({
        mutationFn: (d: { results: typeof existingResults }) => axios.put(`/api/lab/${id}`, d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-test", id] }); toast.success("Results saved successfully!"); },
        onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const onSubmit = (data: { results: typeof existingResults }) => updateMutation.mutate({ results: data.results });

    return (
        <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            <Card>
                <CardBody>
                    <h3 className="text-xs font-semibold text-gray-900 mb-4">Results Entry</h3>

                    {!canUpdate && (
                        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 mb-4">Results are view-only. Only lab technicians can edit.</div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {fields.map((field, i) => (
                            <div key={field.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-gray-900">{existingResults[i]?.testName}</h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register(`results.${i}.isAbnormal`)}
                                            className="w-4 h-4 rounded border-gray-300 accent-red-500 cursor-pointer"
                                            disabled={!canUpdate}
                                        />
                                        <span className="text-xs text-gray-500">Abnormal</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField label="Value" required>
                                        <Input {...register(`results.${i}.value`, { required: "Required" })} placeholder="e.g. 120" disabled={!canUpdate} />
                                    </FormField>
                                    <FormField label="Unit">
                                        <Input {...register(`results.${i}.unit`)} placeholder="e.g. mg/dL" disabled={!canUpdate} />
                                    </FormField>
                                    <FormField label="Reference Range">
                                        <Input {...register(`results.${i}.referenceRange`)} placeholder="e.g. 70-110" disabled={!canUpdate} />
                                    </FormField>
                                </div>
                                <FormField label="Notes">
                                    <Input {...register(`results.${i}.notes`)} placeholder="Additional notes..." disabled={!canUpdate} />
                                </FormField>
                            </div>
                        ))}

                        {canUpdate && (
                            <div className="flex justify-end">
                                <Button type="submit" loading={updateMutation.isPending}>Save Results</Button>
                            </div>
                        )}
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}