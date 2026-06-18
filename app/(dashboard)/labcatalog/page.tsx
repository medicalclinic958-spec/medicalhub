import { Metadata } from "next";
import { LabCatalogClient } from "@/components/labcatalog/lab-catalog-client";

export const metadata: Metadata = { title: "Lab Test Catalog" };

export default function LabCatalogPage() {
    return <LabCatalogClient />;
}