import { Metadata } from "next";
import { NewInvoiceClient } from "@/components/billing/new-invoice-client";
export const metadata: Metadata = { title: "New Invoice" };
export default function NewInvoicePage() { return <NewInvoiceClient />; }
