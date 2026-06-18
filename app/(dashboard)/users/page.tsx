import { Metadata } from "next";
import { UsersClient } from "@/components/users/users-client";
export const metadata: Metadata = { title: "Users" };
export default function UsersPage() { return <UsersClient />; }
