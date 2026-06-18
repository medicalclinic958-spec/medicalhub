import { Metadata } from "next";
import { InvoiceDetailClient } from "@/components/billing/invoice-detail-client";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailClient invoiceId={id} />;
}
