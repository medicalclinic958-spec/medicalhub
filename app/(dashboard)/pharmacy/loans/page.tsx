import { Metadata } from "next";
import { PharmacyLoansClient } from "@/components/pharmacy/pharmacy-loans-client";
export const metadata: Metadata = { title: "Pharmacy Loans" };
export default function PharmacyLoansPage() { return <PharmacyLoansClient />; }
