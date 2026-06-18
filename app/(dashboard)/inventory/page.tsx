import { Metadata } from "next";
import { InventoryClient } from "@/components/inventory/inventory-client";
export const metadata: Metadata = { title: "Inventory" };
export default function InventoryPage() { return <InventoryClient />; }
