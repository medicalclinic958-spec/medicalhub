import { Metadata } from "next";
import { DoctorsClient } from "@/components/doctors/doctors-client";
export const metadata: Metadata = { title: "Doctors" };
export default function DoctorsPage() { return <DoctorsClient />; }
