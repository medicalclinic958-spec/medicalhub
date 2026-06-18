import { Metadata } from "next";
import { PatientsClient } from "@/components/patients/patients-client";

export const metadata: Metadata = { title: "Patients" };

export default function PatientsPage() {
  return <PatientsClient />;
}
