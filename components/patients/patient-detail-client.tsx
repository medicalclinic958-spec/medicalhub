// components/patients/patient-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import { PatientHeader } from "@/components/patients/patient-details/patient-header";
import { MedicalInfoCard } from "@/components/patients/patient-details/medical-info-card";
import { EmergencyContactCard } from "@/components/patients/patient-details/emergency-contact-card";
import { AppointmentsTab } from "@/components/patients/patient-details/appointments-tab";
import { LabTestsTab } from "@/components/patients/patient-details/lab-tests-tab";
import { PrescriptionsTab } from "@/components/patients/patient-details/prescriptions-tab";
import { BillingTab } from "@/components/patients/patient-details/billing-tab";
import { DocumentsTab } from "@/components/patients/patient-details/documents-tab";
import { EditPatientModal } from "@/components/patients/patient-details/edit-patient-modal";
import { Skeleton, Alert } from "@/components/ui";
import { DeceasedBanner } from "./patient-details/deceased-banner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

const TABS = ["Overview", "Appointments", "Lab Tests", "Prescriptions", "Billing", "Documents"];

export function PatientDetailClient({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "true");
  const [editError, setEditError] = useState("");
  const [mobileTabOpen, setMobileTabOpen] = useState(false);

  const { data: patientData, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => axios.get(`/api/patients/${patientId}`).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`/api/patients/${patientId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", patientId] });
      setEditOpen(false);
      setEditError("");
      router.replace(`/patients/${patientId}`);
      toast.success("Patient updated successfully!");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Failed to update";
      setEditError(msg);
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error) return <Alert type="error">Patient not found.</Alert>;

  const p = patientData.data;

  return (
    <div className="space-y-4">
      <PatientHeader p={p} onEdit={() => setEditOpen(true)} />

      {/* Desktop Tabs */}
      <div className="hidden md:flex gap-2 border-b border-gray-300">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 cursor-pointer",
              tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mobile Tab Selector */}
      <div className="md:hidden relative">
        <button
          onClick={() => setMobileTabOpen(!mobileTabOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 cursor-pointer"
        >
          {tab}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mobileTabOpen && "rotate-180")} />
        </button>
        {mobileTabOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg overflow-hidden">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setMobileTabOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs font-medium cursor-pointer",
                  tab === t
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content */}
      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MedicalInfoCard p={p} />
          <EmergencyContactCard p={p} />
          {patientData?.data?.status === "deceased" && (
            <div className="lg:col-span-2">
              <DeceasedBanner
                dateOfDeath={patientData.data.dateOfDeath}
                causeOfDeath={patientData.data.causeOfDeath}
              />
            </div>
          )}
        </div>
      )}

      {tab === "Appointments" && <AppointmentsTab patientId={patientId} />}
      {tab === "Lab Tests" && <LabTestsTab patientId={patientId} />}
      {tab === "Prescriptions" && <PrescriptionsTab patientId={patientId} />}
      {tab === "Billing" && <BillingTab patientId={patientId} />}
      {tab === "Documents" && <DocumentsTab />}

      {/* Backdrop for mobile tab dropdown */}
      {mobileTabOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setMobileTabOpen(false)}
        />
      )}

      <EditPatientModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditError(""); }}
        patient={p}
        onUpdate={(data: any) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
        error={editError}
      />
    </div>
  );
}