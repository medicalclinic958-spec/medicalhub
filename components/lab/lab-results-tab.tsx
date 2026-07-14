// components/lab/lab-results-tab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useForm, useFieldArray, Control } from "react-hook-form";
import axios from "axios";
import { Card, CardBody, Button, Alert, FormField, Input, Skeleton } from "@/components/ui";
import { toast } from "sonner";

interface LabCatalogParameter {
    name: string;
    unit?: string;
    referenceRange?: string;
    minValue?: number;
    maxValue?: number;
    dataType: "number" | "text" | "boolean";
}

interface LabCatalogDetail {
    _id: string;
    testName: string;
    testCode: string;
    parameters: LabCatalogParameter[];
}

interface LabTestParameterResult {
    parameterName: string;
    value: string | number | boolean;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
}

interface LabTestResult {
    catalogId: string;
    testName: string;
    testCode?: string;
    parameterResults: LabTestParameterResult[];
    notes?: string;
}

type RawCatalogId = string | { _id: string } | undefined;

function extractCatalogId(catalogId: RawCatalogId): string | undefined {
    if (!catalogId) return undefined;
    return typeof catalogId === "string" ? catalogId : catalogId._id;
}

interface LabTestDetail {
    _id: string;
    tests: { catalogId?: RawCatalogId; testName: string; testCode?: string }[];
    results: LabTestResult[];
    status: string;
}

interface LabResultsTabProps { test: LabTestDetail; canUpdate: boolean; id: string; }

interface FormValues { results: LabTestResult[]; }

function ParameterFields({
    testIndex,
    catalog,
    control,
    register,
    canUpdate,
}: {
    testIndex: number;
    catalog?: LabCatalogDetail;
    control: Control<FormValues>;
    register: any;
    canUpdate: boolean;
}) {
    const { fields } = useFieldArray({ 
        control, 
        name: `results.${testIndex}.parameterResults` 
    });

    // Defensive: If catalog is missing, show a clear message
    if (!catalog) {
        return (
            <div className="p-3 bg-amber-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                    Catalog definition not available for this test. Please refresh or contact support.
                </p>
            </div>
        );
    }

    // Defensive: Ensure catalog.parameters exists and is an array
    const parameters = Array.isArray(catalog.parameters) ? catalog.parameters : [];

    if (parameters.length === 0) {
        return <p className="text-xs text-gray-400 italic">No parameters defined for this test.</p>;
    }

    return (
        <div className="space-y-3">
            {fields.map((field, pIndex) => {
                // Safely get the parameter definition
                const def = parameters[pIndex];
                
                // If no definition exists for this index, skip rendering
                if (!def) {
                    return null;
                }

                return (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="sm:col-span-1">
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                {def.name}
                            </label>
                            {def.unit && (
                                <p className="text-[10px] text-gray-400">{def.unit}</p>
                            )}
                        </div>
                        
                        <FormField label="Value" required>
                            {def.dataType === "boolean" ? (
                                <select
                                    {...register(`results.${testIndex}.parameterResults.${pIndex}.value`)}
                                    disabled={!canUpdate}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-600 focus:outline-none focus:border-teal-600 disabled:bg-gray-50"
                                >
                                    <option value="">Select</option>
                                    <option value="true">Positive / Yes</option>
                                    <option value="false">Negative / No</option>
                                </select>
                            ) : (
                                <Input
                                    type={def.dataType === "number" ? "number" : "text"}
                                    step={def.dataType === "number" ? "any" : undefined}
                                    {...register(`results.${testIndex}.parameterResults.${pIndex}.value`, { 
                                        required: "Required" 
                                    })}
                                    placeholder={def.dataType === "number" ? "e.g. 3.2" : "e.g. Positive"}
                                    disabled={!canUpdate}
                                />
                            )}
                        </FormField>
                        
                        <FormField label="Reference Range">
                            <Input 
                                {...register(`results.${testIndex}.parameterResults.${pIndex}.referenceRange`)} 
                                disabled={!canUpdate} 
                            />
                        </FormField>
                        
                        <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                            <input
                                type="checkbox"
                                {...register(`results.${testIndex}.parameterResults.${pIndex}.isAbnormal`)}
                                className="w-4 h-4 rounded border-gray-300 accent-red-500 cursor-pointer"
                                disabled={!canUpdate}
                            />
                            <span className="text-xs text-gray-500">Abnormal</span>
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

export function LabResultsTab({ test, canUpdate, id }: LabResultsTabProps) {
    const qc = useQueryClient();
    const [error, setError] = useState("");

    // ✅ FIX: Fetch catalogs per test using index - NO separate array that can drift
    const catalogQueries = useQueries({
        queries: test.tests.map((t) => {
            const cId = extractCatalogId(t.catalogId);
            return {
                queryKey: ["labcatalog", cId ?? "none"],
                queryFn: () => axios.get(`/api/labcatalog/${cId}`).then(r => r.data.data as LabCatalogDetail),
                enabled: !!cId, // ✅ Don't fetch if no catalogId
            };
        }),
    });

    const catalogsLoading = catalogQueries.some(q => q.isLoading);
    
    // ✅ Stable signature to trigger re-renders only when data actually changes
    const loadedSignature = catalogQueries
        .map(q => q.data?._id || "")
        .join(",");

    // ✅ Map catalog data by ID for easy lookup
    const catalogsById = useMemo(() => {
        const map = new Map<string, LabCatalogDetail>();
        catalogQueries.forEach(q => {
            if (q.data) {
                map.set(q.data._id, q.data);
            }
        });
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadedSignature]);

    const { register, handleSubmit, control, reset } = useForm<FormValues>({
        defaultValues: { results: [] },
    });

    const { fields } = useFieldArray({ control, name: "results" });

    // ✅ FIX: Build results with proper index alignment
    useEffect(() => {
        // Wait for catalogs to load
        if (catalogsLoading) return;

        // Build results directly from test.tests - no index drift possible
        const built: LabTestResult[] = test.tests.map((t, index) => {
            const cId = extractCatalogId(t.catalogId);
            
            // Get the catalog for this specific test
            const catalog = cId ? catalogsById.get(cId) : undefined;
            
            // Find saved results for this specific catalog
            const savedResult = test.results?.find(r => r.catalogId === cId);

            // ✅ CRITICAL FIX: Safely map parameters with proper fallbacks
            const parameterResults: LabTestParameterResult[] = Array.isArray(catalog?.parameters) 
                ? catalog!.parameters.map((p) => {
                    const saved = savedResult?.parameterResults?.find(
                        pr => pr.parameterName === p.name
                    );
                    return {
                        parameterName: p.name,
                        value: saved?.value ?? "",
                        unit: p.unit,
                        referenceRange: saved?.referenceRange ?? p.referenceRange,
                        isAbnormal: saved?.isAbnormal ?? false,
                    };
                })
                : []; // ✅ Empty array if no parameters

            return {
                catalogId: cId || "",
                testName: t.testName,
                testCode: t.testCode,
                parameterResults,
                notes: savedResult?.notes || "",
            };
        });

        reset({ results: built });
        
    }, [catalogsLoading, loadedSignature, test._id, test.tests, test.results, reset, catalogsById]);

    const updateMutation = useMutation({
        mutationFn: (data: { results: LabTestResult[] }) => 
            axios.put(`/api/lab/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-test", id] });
            toast.success("Results saved successfully!");
        },
        onError: (error: unknown) => {
            const msg = (error as any)?.response?.data?.error || "Failed to save results";
            setError(msg);
            toast.error(msg);
        },
    });

    const onSubmit = (data: FormValues) => {
        // Clean boolean values
        const cleaned = data.results.map(r => ({
            ...r,
            parameterResults: r.parameterResults.map(pr => {
                if (pr.value === "true") return { ...pr, value: true };
                if (pr.value === "false") return { ...pr, value: false };
                return pr;
            }),
        }));
        updateMutation.mutate({ results: cleaned });
    };

    // Loading state
    if (catalogsLoading) {
        return (
            <Card>
                <CardBody className="space-y-3">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </CardBody>
            </Card>
        );
    }

    // No tests
    if (fields.length === 0) {
        return (
            <Card>
                <CardBody>
                    <p className="text-xs text-gray-500 text-center py-8">
                        No tests available to display results for.
                    </p>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <Alert type="error">
                    {error}
                </Alert>
            )}

            <Card>
                <CardBody>
                    <h3 className="text-xs font-semibold text-gray-900 mb-4">
                        Results Entry
                    </h3>

                    {!canUpdate && (
                        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 mb-4">
                            Results are view-only. Only lab technicians can edit.
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {fields.map((field, index) => {
                            // Get the catalog for this test
                            const catalog = field.catalogId 
                                ? catalogsById.get(field.catalogId) 
                                : undefined;

                            return (
                                <div 
                                    key={field.id} 
                                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                                >
                                    <h4 className="text-xs font-semibold text-gray-900">
                                        {field.testName}
                                        {!field.catalogId && (
                                            <span className="ml-2 text-xs text-red-500 font-normal">
                                                (No catalog ID)
                                            </span>
                                        )}
                                        {field.catalogId && !catalog && (
                                            <span className="ml-2 text-xs text-amber-600 font-normal">
                                                (Loading catalog...)
                                            </span>
                                        )}
                                    </h4>

                                    <ParameterFields
                                        testIndex={index}
                                        catalog={catalog}
                                        control={control}
                                        register={register}
                                        canUpdate={canUpdate}
                                    />

                                    <FormField label="Notes">
                                        <Input 
                                            {...register(`results.${index}.notes`)} 
                                            placeholder="Additional notes..." 
                                            disabled={!canUpdate} 
                                        />
                                    </FormField>
                                </div>
                            );
                        })}

                        {canUpdate && fields.length > 0 && (
                            <div className="flex justify-end">
                                <Button 
                                    type="submit" 
                                    loading={updateMutation.isPending}
                                    disabled={updateMutation.isPending}
                                >
                                    Save Results
                                </Button>
                            </div>
                        )}
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}