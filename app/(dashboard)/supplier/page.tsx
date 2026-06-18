// app/(dashboard)/suppliers/page.tsx
import { Metadata } from "next";
import { SuppliersClient } from "@/components/supplier/supplier-client";

export const metadata: Metadata = { title: "Suppliers" };

export default function SuppliersPage() {
    return <SuppliersClient />;
}