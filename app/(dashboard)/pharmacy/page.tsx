import { Metadata } from "next";
import { PharmacyClient } from "@/components/pharmacy/pharmacy-client";
export const metadata: Metadata = { title: "Pharmacy" };
export default function PharmacyPage() { return <PharmacyClient />; }
