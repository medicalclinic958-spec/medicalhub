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

const TABS = ["Overview", "Appointments", "Lab Tests", "Prescriptions", "Billing", "Documents"];

export function PatientDetailClient({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "true");
  const [editError, setEditError] = useState("");

  const { data: patientData, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => axios.get(`/api/patients/${patientId}`).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`/api/patients/${patientId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", patientId] });
      setEditOpen(false);
      router.replace(`/patients/${patientId}`);
    },
    onError: (e: any) => setEditError(e?.response?.data?.error || "Failed to update"),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Alert type="error">Patient not found.</Alert>;

  const p = patientData.data;

  return (
    <div className="space-y-5">
      <PatientHeader p={p} onEdit={() => setEditOpen(true)} />

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-blue-600 text-blue-600 border-b-2" : "text-slate-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MedicalInfoCard p={p} />
          <EmergencyContactCard p={p} />
          {patientData?.data?.status === "deceased" && (
            <DeceasedBanner
              dateOfDeath={patientData.data.dateOfDeath}
              causeOfDeath={patientData.data.causeOfDeath}
            />
          )}
        </div>

      )}

      {tab === "Appointments" && <AppointmentsTab patientId={patientId} />}
      {tab === "Lab Tests" && <LabTestsTab patientId={patientId} />}
      {tab === "Prescriptions" && <PrescriptionsTab patientId={patientId} />}
      {tab === "Billing" && <BillingTab patientId={patientId} />}
      {tab === "Documents" && <DocumentsTab />}

      <EditPatientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={p}
        onUpdate={(data: any) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
        error={editError}
      />
    </div>
  );
}