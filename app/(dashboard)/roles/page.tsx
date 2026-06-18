import { Metadata } from "next";
import { RolesClient } from "@/components/roles/roles-client";
export const metadata: Metadata = { title: "Roles & Permissions" };
export default function RolesPage() { return <RolesClient />; }
