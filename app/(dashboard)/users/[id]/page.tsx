import { Metadata } from "next";
import { UserDetailClient } from "@/components/users/UserDetailClient";

export const metadata: Metadata = { title: "User Details" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <UserDetailClient userId={id} />;
}