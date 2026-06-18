import { Metadata } from "next";
import { BillingClient } from "@/components/billing/billing-client";
export const metadata: Metadata = { title: "Billing" };
export default function BillingPage() { return <BillingClient />; }
