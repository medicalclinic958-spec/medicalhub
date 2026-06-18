import { Metadata } from "next";
import { AppointmentsClient } from "@/components/appointments/appointments-client";
export const metadata: Metadata = { title: "Appointments" };
export default function AppointmentsPage() {
  return <AppointmentsClient />;
}
